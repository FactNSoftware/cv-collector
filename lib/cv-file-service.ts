import { extname } from "path";
import { randomUUID } from "crypto";
import { BlobServiceClient, ContainerClient } from "@azure/storage-blob";

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;
const MAX_JOB_ASSET_SIZE_BYTES = 5 * 1024 * 1024;
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

export const saveJobAssetImage = async ({
  fileName,
  mimeType,
  fileBuffer,
}: SaveJobAssetInput) => {
  validateJobAssetUpload({ fileName, mimeType, fileBuffer });

  const containerClient = await getBlobContainerClient();
  const extension = getSafeExtension(fileName, mimeType);
  const storedFileName = `${JOB_ASSET_PREFIX}/${Date.now()}-${randomUUID()}${extension}`;
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
