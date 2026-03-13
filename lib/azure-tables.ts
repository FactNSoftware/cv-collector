import { TableClient } from "@azure/data-tables";

const STORAGE_CONNECTION_ENV_NAMES = [
  "AZURE_STORAGE_CONNECTION_STRING",
  "AZURE_BLOB_CONNECTION_STRING",
] as const;

const TABLE_NAME_ENV = "AZURE_TABLES_TABLE_NAME";
const DEFAULT_TABLE_NAME = "cvcollector";

let tableClientCache: TableClient | null = null;
let tableInitializationPromise: Promise<TableClient> | null = null;

type StorageLikeError = {
  code?: string;
  statusCode?: number;
};

const getStorageConnectionString = () => {
  const connectionString = STORAGE_CONNECTION_ENV_NAMES
    .map((name) => process.env[name])
    .find((value) => Boolean(value));

  if (!connectionString) {
    throw new Error(
      `Azure Storage configuration is missing. Set one of: ${STORAGE_CONNECTION_ENV_NAMES.join(", ")}`,
    );
  }

  return connectionString;
};

export const getAppTableClient = async (): Promise<TableClient> => {
  if (tableClientCache) {
    return tableClientCache;
  }

  if (tableInitializationPromise) {
    return tableInitializationPromise;
  }

  tableInitializationPromise = (async () => {
    const tableName = process.env[TABLE_NAME_ENV] || DEFAULT_TABLE_NAME;
    const client = TableClient.fromConnectionString(
      getStorageConnectionString(),
      tableName,
    );

    try {
      await client.createTable();
    } catch (error) {
      if (!isTableConflictError(error)) {
        throw error;
      }
    }

    tableClientCache = client;
    return client;
  })();

  return tableInitializationPromise;
};

export const isTableNotFoundError = (error: unknown): boolean => {
  const candidate = error as StorageLikeError;
  return candidate?.statusCode === 404 || candidate?.code === "ResourceNotFound";
};

export const isTableConflictError = (error: unknown): boolean => {
  const candidate = error as StorageLikeError;
  return candidate?.statusCode === 409 || candidate?.code === "EntityAlreadyExists";
};
