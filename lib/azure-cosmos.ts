import { Container, CosmosClient } from "@azure/cosmos";

const REQUIRED_ENV_NAMES = [
  "AZURE_COSMOS_ENDPOINT",
  "AZURE_COSMOS_KEY",
  "AZURE_COSMOS_DATABASE",
  "AZURE_COSMOS_CONTAINER",
] as const;

let containerCache: Container | null = null;

const getCosmosContainer = (): Container => {
  if (containerCache) {
    return containerCache;
  }

  const endpoint = process.env.AZURE_COSMOS_ENDPOINT;
  const key = process.env.AZURE_COSMOS_KEY;
  const databaseId = process.env.AZURE_COSMOS_DATABASE;
  const containerId = process.env.AZURE_COSMOS_CONTAINER;

  const missing = REQUIRED_ENV_NAMES.filter((name) => !process.env[name]);

  if (missing.length > 0) {
    throw new Error(
      `Azure Cosmos DB configuration is missing. Set: ${missing.join(", ")}`,
    );
  }

  const client = new CosmosClient({ endpoint, key });
  containerCache = client.database(databaseId as string).container(containerId as string);

  return containerCache;
};

export const getAppContainer = (): Container => {
  return getCosmosContainer();
};

type CosmosLikeError = {
  code?: number;
  statusCode?: number;
};

export const isCosmosNotFoundError = (error: unknown): boolean => {
  const candidate = error as CosmosLikeError;
  return candidate?.code === 404 || candidate?.statusCode === 404;
};

export const isCosmosConflictError = (error: unknown): boolean => {
  const candidate = error as CosmosLikeError;
  return candidate?.code === 409 || candidate?.statusCode === 409;
};
