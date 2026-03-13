import { randomUUID } from "crypto";
import { BlobServiceClient, ContainerClient } from "@azure/storage-blob";

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;
const REQUIRED_ENV_NAMES = [
  "AZURE_BLOB_CONNECTION_STRING",
  "AZURE_BLOB_CONTAINER",
] as const;

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
};

export class CvFileNotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CvFileNotFoundError";
  }
}

const getBlobContainerClient = async (): Promise<ContainerClient> => {
  if (containerClientCache) {
    return containerClientCache;
  }

  const connectionString = process.env.AZURE_BLOB_CONNECTION_STRING;
  const containerName = process.env.AZURE_BLOB_CONTAINER;
  const missing = REQUIRED_ENV_NAMES.filter((name) => !process.env[name]);

  if (missing.length > 0) {
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
}: SaveCvPdfInput) => {
  validatePdfUpload({ fileName, mimeType, fileBuffer });

  const containerClient = await getBlobContainerClient();
  const storedFileName = `${Date.now()}-${randomUUID()}.pdf`;
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