import {
  saveJobAssetImage,
  downloadJobAsset,
  validateOrganizationLogoUpload,
  PdfValidationError,
  ORGANIZATION_LOGO_DIMENSION_RULES,
} from "./cv-file-service";

const JOB_ASSET_ROUTE_PREFIX = "/api/job-assets/";
const ORGANIZATION_LOGO_PREFIX = "organization-logos";
const MAX_LOGO_FETCH_BYTES = 5 * 1024 * 1024;

const normalizeStoredFileName = (value: string) => {
  return value.replace(/^\/+/, "");
};

export const createJobAssetUrl = (storedFileName: string) => {
  return `${JOB_ASSET_ROUTE_PREFIX}${encodeURI(normalizeStoredFileName(storedFileName))}`;
};

export const saveJobDescriptionImage = async (input: {
  fileName: string;
  mimeType: string;
  fileBuffer: Buffer;
}) => {
  const saved = await saveJobAssetImage(input);

  return {
    ...saved,
    url: createJobAssetUrl(saved.storedFileName),
  };
};

export const saveOrganizationLogoImage = async (input: {
  fileName: string;
  mimeType: string;
  fileBuffer: Buffer;
}) => {
  const dimensions = await validateOrganizationLogoUpload(input);
  const saved = await saveJobAssetImage({
    ...input,
    prefix: ORGANIZATION_LOGO_PREFIX,
  });

  return {
    ...saved,
    dimensions,
    url: createJobAssetUrl(saved.storedFileName),
  };
};

const readResponseBodyWithLimit = async (response: Response, maxBytes: number) => {
  if (!response.body) {
    const fallbackBuffer = Buffer.from(await response.arrayBuffer());

    if (fallbackBuffer.length > maxBytes) {
      throw new PdfValidationError(`Logo file must be ${Math.floor(maxBytes / (1024 * 1024))}MB or smaller.`);
    }

    return fallbackBuffer;
  }

  const reader = response.body.getReader();
  const chunks: Buffer[] = [];
  let total = 0;

  while (true) {
    const { done, value } = await reader.read();

    if (done) {
      break;
    }

    if (!value) {
      continue;
    }

    const chunk = Buffer.from(value);
    total += chunk.length;

    if (total > maxBytes) {
      await reader.cancel();
      throw new PdfValidationError(`Logo file must be ${Math.floor(maxBytes / (1024 * 1024))}MB or smaller.`);
    }

    chunks.push(chunk);
  }

  return Buffer.concat(chunks);
};

export const validateOrganizationLogoUrl = async (logoUrl: string) => {
  const candidate = logoUrl.trim();

  if (!candidate) {
    return null;
  }

  let parsed: URL;

  try {
    parsed = new URL(candidate);
  } catch {
    throw new PdfValidationError("Logo URL must be a valid URL.");
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new PdfValidationError("Logo URL must start with http:// or https://.");
  }

  const response = await fetch(parsed.toString(), {
    method: "GET",
    redirect: "follow",
    cache: "no-store",
  });

  if (!response.ok) {
    throw new PdfValidationError("Logo URL could not be fetched.");
  }

  const contentTypeHeader = response.headers.get("content-type") ?? "";
  const mimeType = contentTypeHeader.split(";")[0].trim().toLowerCase();

  if (!mimeType.startsWith("image/")) {
    throw new PdfValidationError("Logo URL must point to an image file.");
  }

  const contentLengthHeader = response.headers.get("content-length");
  const contentLength = contentLengthHeader ? Number.parseInt(contentLengthHeader, 10) : 0;

  if (Number.isFinite(contentLength) && contentLength > MAX_LOGO_FETCH_BYTES) {
    throw new PdfValidationError("Logo URL file is too large. Maximum allowed is 5MB.");
  }

  const fileBuffer = await readResponseBodyWithLimit(response, MAX_LOGO_FETCH_BYTES);

  const fileName = parsed.pathname.split("/").pop() || "logo";
  const dimensions = await validateOrganizationLogoUpload({
    fileName,
    mimeType,
    fileBuffer,
  });

  return {
    mimeType,
    dimensions,
    rules: ORGANIZATION_LOGO_DIMENSION_RULES,
  };
};

export const getJobDescriptionImage = async (pathSegments: string[]) => {
  const storedFileName = normalizeStoredFileName(pathSegments.join("/"));

  if (!storedFileName) {
    throw new Error("Job asset path is required.");
  }

  return downloadJobAsset(storedFileName);
};
