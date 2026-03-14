import { saveJobAssetImage, downloadJobAsset } from "./cv-file-service";

const JOB_ASSET_ROUTE_PREFIX = "/api/job-assets/";

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

export const getJobDescriptionImage = async (pathSegments: string[]) => {
  const storedFileName = normalizeStoredFileName(pathSegments.join("/"));

  if (!storedFileName) {
    throw new Error("Job asset path is required.");
  }

  return downloadJobAsset(storedFileName);
};
