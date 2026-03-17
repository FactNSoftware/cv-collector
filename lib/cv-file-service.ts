import { extname } from "path";
import { randomUUID } from "crypto";
import { BlobServiceClient, ContainerClient } from "@azure/storage-blob";

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;
const MAX_JOB_ASSET_SIZE_BYTES = 5 * 1024 * 1024;
const MIN_ORGANIZATION_LOGO_DIMENSION = 48;
const MAX_ORGANIZATION_LOGO_DIMENSION = 1200;
const MAX_ORGANIZATION_LOGO_ASPECT_RATIO = 5;
const REQUIRED_ENV_NAMES = [
  "AZURE_STORAGE_CONNECTION_STRING",
  "AZURE_BLOB_CONNECTION_STRING",
  "AZURE_BLOB_CONTAINER",
] as const;
const JOB_ASSET_PREFIX = "job-assets";
const JOB_CV_PREFIX = "job-cvs";
const IMAGE_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

let containerClientCache: ContainerClient | null = null;

export class PdfValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PdfValidationError";
  }
}

type SaveCvPdfInput = {
  fileName: string;
  mimeType: string;
  fileBuffer: Buffer;
  folderName?: string;
};

type SaveJobAssetInput = {
  fileName: string;
  mimeType: string;
  fileBuffer: Buffer;
  prefix?: string;
};

export type ImageDimensions = {
  width: number;
  height: number;
};

export const ORGANIZATION_LOGO_DIMENSION_RULES = {
  minWidth: MIN_ORGANIZATION_LOGO_DIMENSION,
  minHeight: MIN_ORGANIZATION_LOGO_DIMENSION,
  maxWidth: MAX_ORGANIZATION_LOGO_DIMENSION,
  maxHeight: MAX_ORGANIZATION_LOGO_DIMENSION,
  maxAspectRatio: MAX_ORGANIZATION_LOGO_ASPECT_RATIO,
};

export class CvFileNotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CvFileNotFoundError";
  }
}

export const getBlobContainerClient = async (): Promise<ContainerClient> => {
  if (containerClientCache) {
    return containerClientCache;
  }

  const connectionString =
    process.env.AZURE_STORAGE_CONNECTION_STRING
    || process.env.AZURE_BLOB_CONNECTION_STRING;
  const containerName = process.env.AZURE_BLOB_CONTAINER;
  const missing = REQUIRED_ENV_NAMES.filter((name) => {
    if (name === "AZURE_BLOB_CONNECTION_STRING") {
      return !connectionString;
    }

    if (name === "AZURE_STORAGE_CONNECTION_STRING") {
      return !connectionString;
    }

    return !process.env[name];
  });

  if (!connectionString || !containerName) {
    throw new Error(
      `Azure Blob Storage configuration is missing. Set: ${missing.join(", ")}`,
    );
  }

  const serviceClient = BlobServiceClient.fromConnectionString(
    connectionString as string,
  );

  const containerClient = serviceClient.getContainerClient(containerName as string);
  await containerClient.createIfNotExists();

  containerClientCache = containerClient;
  return containerClient;
};

const getSafeExtension = (fileName: string, mimeType: string) => {
  const extension = extname(fileName).toLowerCase();

  if (extension === ".jpg" || extension === ".jpeg") {
    return ".jpg";
  }

  if (extension === ".png") {
    return ".png";
  }

  if (extension === ".webp") {
    return ".webp";
  }

  if (extension === ".gif") {
    return ".gif";
  }

  if (mimeType === "image/jpeg") {
    return ".jpg";
  }

  if (mimeType === "image/png") {
    return ".png";
  }

  if (mimeType === "image/webp") {
    return ".webp";
  }

  if (mimeType === "image/gif") {
    return ".gif";
  }

  return "";
};

const isPdfMimeType = (mimeType: string) => {
  return /pdf/i.test(mimeType);
};

const hasPdfHeader = (fileBuffer: Buffer) => {
  // PDF files start with "%PDF-"
  return fileBuffer.length >= 5 && fileBuffer.subarray(0, 5).toString("ascii") === "%PDF-";
};

export const validatePdfUpload = ({
  fileName,
  mimeType,
  fileBuffer,
}: SaveCvPdfInput) => {
  if (!fileName) {
    throw new PdfValidationError("CV file name is required.");
  }

  if (!fileName.toLowerCase().endsWith(".pdf")) {
    throw new PdfValidationError("Only PDF files are supported.");
  }

  if (!mimeType || !isPdfMimeType(mimeType)) {
    throw new PdfValidationError("Only PDF files are supported.");
  }

  if (fileBuffer.length === 0) {
    throw new PdfValidationError("Uploaded CV file is empty.");
  }

  if (fileBuffer.length > MAX_FILE_SIZE_BYTES) {
    throw new PdfValidationError("CV file must be 10MB or smaller.");
  }

  if (!hasPdfHeader(fileBuffer)) {
    throw new PdfValidationError("Uploaded file is not a valid PDF.");
  }
};

export const saveCvPdf = async ({
  fileName,
  mimeType,
  fileBuffer,
  folderName,
}: SaveCvPdfInput) => {
  validatePdfUpload({ fileName, mimeType, fileBuffer });

  const containerClient = await getBlobContainerClient();
  const safeFolderName = folderName
    ? folderName.trim().replace(/[^a-zA-Z0-9/_-]+/g, "-").replace(/^\/+|\/+$/g, "")
    : "";
  const storedFileName = safeFolderName
    ? `${JOB_CV_PREFIX}/${safeFolderName}/${Date.now()}-${randomUUID()}.pdf`
    : `${JOB_CV_PREFIX}/${Date.now()}-${randomUUID()}.pdf`;
  const blobClient = containerClient.getBlockBlobClient(storedFileName);

  await blobClient.uploadData(fileBuffer, {
    blobHTTPHeaders: {
      blobContentType: "application/pdf",
    },
  });

  return {
    storedFileName,
    mimeType: "application/pdf",
  };
};

export const validateJobAssetUpload = ({
  fileName,
  mimeType,
  fileBuffer,
}: SaveJobAssetInput) => {
  if (!fileName) {
    throw new PdfValidationError("Image file name is required.");
  }

  if (!mimeType || !IMAGE_MIME_TYPES.has(mimeType)) {
    throw new PdfValidationError("Only JPG, PNG, WEBP, or GIF images are supported.");
  }

  if (fileBuffer.length === 0) {
    throw new PdfValidationError("Uploaded image is empty.");
  }

  if (fileBuffer.length > MAX_JOB_ASSET_SIZE_BYTES) {
    throw new PdfValidationError("Image must be 5MB or smaller.");
  }

  if (!getSafeExtension(fileName, mimeType)) {
    throw new PdfValidationError("Unsupported image file type.");
  }
};

const parsePngDimensions = (fileBuffer: Buffer): ImageDimensions | null => {
  if (fileBuffer.length < 24) {
    return null;
  }

  const pngSignature = "89504e470d0a1a0a";

  if (fileBuffer.subarray(0, 8).toString("hex") !== pngSignature) {
    return null;
  }

  const width = fileBuffer.readUInt32BE(16);
  const height = fileBuffer.readUInt32BE(20);

  if (!width || !height) {
    return null;
  }

  return { width, height };
};

const parseGifDimensions = (fileBuffer: Buffer): ImageDimensions | null => {
  if (fileBuffer.length < 10) {
    return null;
  }

  const header = fileBuffer.subarray(0, 6).toString("ascii");

  if (header !== "GIF87a" && header !== "GIF89a") {
    return null;
  }

  const width = fileBuffer.readUInt16LE(6);
  const height = fileBuffer.readUInt16LE(8);

  if (!width || !height) {
    return null;
  }

  return { width, height };
};

const isJpegStartOfFrameMarker = (marker: number) => {
  return (marker >= 0xC0 && marker <= 0xC3)
    || (marker >= 0xC5 && marker <= 0xC7)
    || (marker >= 0xC9 && marker <= 0xCB)
    || (marker >= 0xCD && marker <= 0xCF);
};

const parseJpegDimensions = (fileBuffer: Buffer): ImageDimensions | null => {
  if (fileBuffer.length < 4 || fileBuffer[0] !== 0xFF || fileBuffer[1] !== 0xD8) {
    return null;
  }

  let offset = 2;

  while (offset + 1 < fileBuffer.length) {
    if (fileBuffer[offset] !== 0xFF) {
      offset += 1;
      continue;
    }

    const marker = fileBuffer[offset + 1];

    if (marker === 0xD8 || marker === 0xD9 || marker === 0x01 || (marker >= 0xD0 && marker <= 0xD7)) {
      offset += 2;
      continue;
    }

    if (offset + 4 > fileBuffer.length) {
      return null;
    }

    const segmentLength = fileBuffer.readUInt16BE(offset + 2);

    if (segmentLength < 2 || offset + 2 + segmentLength > fileBuffer.length) {
      return null;
    }

    if (isJpegStartOfFrameMarker(marker)) {
      if (segmentLength < 7) {
        return null;
      }

      const height = fileBuffer.readUInt16BE(offset + 5);
      const width = fileBuffer.readUInt16BE(offset + 7);

      if (!width || !height) {
        return null;
      }

      return { width, height };
    }

    offset += 2 + segmentLength;
  }

  return null;
};

const parseWebpDimensions = (fileBuffer: Buffer): ImageDimensions | null => {
  if (fileBuffer.length < 30) {
    return null;
  }

  if (
    fileBuffer.subarray(0, 4).toString("ascii") !== "RIFF"
    || fileBuffer.subarray(8, 12).toString("ascii") !== "WEBP"
  ) {
    return null;
  }

  const chunkType = fileBuffer.subarray(12, 16).toString("ascii");

  if (chunkType === "VP8X") {
    const widthMinusOne = fileBuffer[24] | (fileBuffer[25] << 8) | (fileBuffer[26] << 16);
    const heightMinusOne = fileBuffer[27] | (fileBuffer[28] << 8) | (fileBuffer[29] << 16);

    return {
      width: widthMinusOne + 1,
      height: heightMinusOne + 1,
    };
  }

  if (chunkType === "VP8 ") {
    if (fileBuffer[23] !== 0x9D || fileBuffer[24] !== 0x01 || fileBuffer[25] !== 0x2A) {
      return null;
    }

    const width = fileBuffer.readUInt16LE(26) & 0x3FFF;
    const height = fileBuffer.readUInt16LE(28) & 0x3FFF;

    if (!width || !height) {
      return null;
    }

    return { width, height };
  }

  if (chunkType === "VP8L") {
    if (fileBuffer.length < 25 || fileBuffer[20] !== 0x2F) {
      return null;
    }

    const b0 = fileBuffer[21];
    const b1 = fileBuffer[22];
    const b2 = fileBuffer[23];
    const b3 = fileBuffer[24];

    const width = 1 + (b0 | ((b1 & 0x3F) << 8));
    const height = 1 + (((b1 & 0xC0) >> 6) | (b2 << 2) | ((b3 & 0x0F) << 10));

    if (!width || !height) {
      return null;
    }

    return { width, height };
  }

  return null;
};

const readImageDimensions = (
  fileBuffer: Buffer,
  mimeType: string,
): ImageDimensions => {
  const normalizedMimeType = mimeType.trim().toLowerCase();

  const parserMap: Array<[(buffer: Buffer) => ImageDimensions | null, string]> = [
    [parsePngDimensions, "image/png"],
    [parseJpegDimensions, "image/jpeg"],
    [parseGifDimensions, "image/gif"],
    [parseWebpDimensions, "image/webp"],
  ];

  const prioritized = [
    ...parserMap.filter(([, parserMimeType]) => parserMimeType === normalizedMimeType),
    ...parserMap.filter(([, parserMimeType]) => parserMimeType !== normalizedMimeType),
  ];

  for (const [parser] of prioritized) {
    const dimensions = parser(fileBuffer);

    if (dimensions) {
      return dimensions;
    }
  }

  throw new PdfValidationError(
    "We could not process image dimensions on the server right now. Please try again in a moment.",
  );
};

const validateOrganizationLogoDimensions = ({ width, height }: ImageDimensions) => {
  if (width < MIN_ORGANIZATION_LOGO_DIMENSION || height < MIN_ORGANIZATION_LOGO_DIMENSION) {
    throw new PdfValidationError(
      `Logo image is too small. Minimum size is ${MIN_ORGANIZATION_LOGO_DIMENSION}x${MIN_ORGANIZATION_LOGO_DIMENSION}px.`,
    );
  }

  if (width > MAX_ORGANIZATION_LOGO_DIMENSION || height > MAX_ORGANIZATION_LOGO_DIMENSION) {
    throw new PdfValidationError(
      `Logo image is too large. Maximum size is ${MAX_ORGANIZATION_LOGO_DIMENSION}x${MAX_ORGANIZATION_LOGO_DIMENSION}px.`,
    );
  }

  const aspectRatio = width / height;

  if (aspectRatio > MAX_ORGANIZATION_LOGO_ASPECT_RATIO || aspectRatio < (1 / MAX_ORGANIZATION_LOGO_ASPECT_RATIO)) {
    throw new PdfValidationError(
      `Logo aspect ratio is not supported. Use a ratio between 1:${MAX_ORGANIZATION_LOGO_ASPECT_RATIO} and ${MAX_ORGANIZATION_LOGO_ASPECT_RATIO}:1.`,
    );
  }
};

export const validateOrganizationLogoUpload = async ({
  fileName,
  mimeType,
  fileBuffer,
}: SaveJobAssetInput): Promise<ImageDimensions> => {
  validateJobAssetUpload({ fileName, mimeType, fileBuffer });
  const dimensions = readImageDimensions(fileBuffer, mimeType);
  validateOrganizationLogoDimensions(dimensions);
  return dimensions;
};

export const saveJobAssetImage = async ({
  fileName,
  mimeType,
  fileBuffer,
  prefix,
}: SaveJobAssetInput) => {
  validateJobAssetUpload({ fileName, mimeType, fileBuffer });

  const containerClient = await getBlobContainerClient();
  const extension = getSafeExtension(fileName, mimeType);
  const normalizedPrefix = (prefix ?? JOB_ASSET_PREFIX)
    .trim()
    .replace(/[^a-zA-Z0-9/_-]+/g, "-")
    .replace(/^\/+|\/+$/g, "");
  const effectivePrefix = normalizedPrefix || JOB_ASSET_PREFIX;
  const storedFileName = `${effectivePrefix}/${Date.now()}-${randomUUID()}${extension}`;
  const blobClient = containerClient.getBlockBlobClient(storedFileName);

  await blobClient.uploadData(fileBuffer, {
    blobHTTPHeaders: {
      blobContentType: mimeType,
      blobCacheControl: "public, max-age=31536000, immutable",
    },
  });

  return {
    storedFileName,
    mimeType,
  };
};

export const deleteCvUpload = async (storedFileName: string) => {
  const containerClient = await getBlobContainerClient();
  const blobClient = containerClient.getBlockBlobClient(storedFileName);

  await blobClient.deleteIfExists();
};

export const downloadCvUpload = async (storedFileName: string) => {
  const containerClient = await getBlobContainerClient();
  const blobClient = containerClient.getBlockBlobClient(storedFileName);

  const exists = await blobClient.exists();

  if (!exists) {
    throw new CvFileNotFoundError("CV file not found in Azure Blob Storage.");
  }

  return blobClient.downloadToBuffer();
};

export const downloadJobAsset = async (storedFileName: string) => {
  const containerClient = await getBlobContainerClient();
  const blobClient = containerClient.getBlockBlobClient(storedFileName);

  const exists = await blobClient.exists();

  if (!exists) {
    throw new CvFileNotFoundError("Job asset not found in Azure Blob Storage.");
  }

  const response = await blobClient.downloadToBuffer();
  const properties = await blobClient.getProperties();

  return {
    buffer: response,
    mimeType: properties.contentType || "application/octet-stream",
  };
};
