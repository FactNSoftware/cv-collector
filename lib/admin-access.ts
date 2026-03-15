import { getAppTableClient, isTableNotFoundError } from "./azure-tables";
import { buildPageInfo, type PageInfo } from "./pagination";

const ADMIN_SCOPE = "admin";
const ADMIN_ACCOUNT_TYPE = "account";
const ADMIN_PERMISSION_TOKEN_ENV = "ADMIN_PERMISSION_TOKEN";

type AdminAccountEntity = {
  partitionKey: string;
  rowKey: string;
  type: string;
  email: string;
  createdAt: number;
  createdBy: string;
};

export type AdminAccount = {
  email: string;
  createdAt: string;
  createdBy: string;
};

export type AdminAccountPage = {
  items: AdminAccount[];
  pageInfo: PageInfo;
};

const normalizeEmail = (email: string) => email.trim().toLowerCase();

const toRowKey = (email: string) => encodeURIComponent(normalizeEmail(email));

const toAdminAccount = (entity: AdminAccountEntity): AdminAccount => ({
  email: entity.email,
  createdAt: new Date(entity.createdAt).toISOString(),
  createdBy: entity.createdBy,
});

export const getAdminPermissionToken = () => {
  const token = process.env[ADMIN_PERMISSION_TOKEN_ENV];

  if (!token) {
    throw new Error(
      `Admin bootstrap configuration is missing. Set: ${ADMIN_PERMISSION_TOKEN_ENV}`,
    );
  }

  return token;
};

export const isAdminPermissionTokenValid = (providedToken: string) => {
  return Boolean(providedToken) && providedToken === getAdminPermissionToken();
};

export const getAdminAccountByEmail = async (
  email: string,
): Promise<AdminAccount | null> => {
  const normalizedEmail = normalizeEmail(email);

  if (!normalizedEmail) {
    return null;
  }

  const tableClient = await getAppTableClient();

  try {
    const entity = await tableClient.getEntity<AdminAccountEntity>(
      ADMIN_SCOPE,
      toRowKey(normalizedEmail),
    );

    if (entity.type !== ADMIN_ACCOUNT_TYPE) {
      return null;
    }

    return toAdminAccount(entity);
  } catch (error) {
    if (isTableNotFoundError(error)) {
      return null;
    }

    throw error;
  }
};

export const isAdminEmail = async (email: string) => {
  const normalizedEmail = normalizeEmail(email);

  if (!normalizedEmail) {
    return false;
  }

  return Boolean(await getAdminAccountByEmail(normalizedEmail));
};

export const createAdminAccount = async (
  email: string,
  createdBy: string,
): Promise<AdminAccount> => {
  const normalizedEmail = normalizeEmail(email);

  if (!normalizedEmail) {
    throw new Error("Email is required to create an admin account.");
  }

  const tableClient = await getAppTableClient();
  const now = Date.now();
  const entity: AdminAccountEntity = {
    partitionKey: ADMIN_SCOPE,
    rowKey: toRowKey(normalizedEmail),
    type: ADMIN_ACCOUNT_TYPE,
    email: normalizedEmail,
    createdAt: now,
    createdBy: createdBy.trim().toLowerCase(),
  };

  await tableClient.upsertEntity(entity, "Replace");
  return toAdminAccount(entity);
};

export const updateAdminAccountEmail = async (
  currentEmail: string,
  nextEmail: string,
  updatedBy: string,
): Promise<AdminAccount> => {
  const currentNormalizedEmail = normalizeEmail(currentEmail);
  const nextNormalizedEmail = normalizeEmail(nextEmail);

  if (!currentNormalizedEmail || !nextNormalizedEmail) {
    throw new Error("Current and next admin emails are required.");
  }

  const existing = await getAdminAccountByEmail(currentNormalizedEmail);

  if (!existing) {
    throw new Error("Admin account not found.");
  }

  if (currentNormalizedEmail === nextNormalizedEmail) {
    return existing;
  }

  const targetExisting = await getAdminAccountByEmail(nextNormalizedEmail);

  if (targetExisting) {
    throw new Error("An admin account already exists for that email.");
  }

  const tableClient = await getAppTableClient();
  const entity: AdminAccountEntity = {
    partitionKey: ADMIN_SCOPE,
    rowKey: toRowKey(nextNormalizedEmail),
    type: ADMIN_ACCOUNT_TYPE,
    email: nextNormalizedEmail,
    createdAt: Date.parse(existing.createdAt) || Date.now(),
    createdBy: updatedBy.trim().toLowerCase(),
  };

  await tableClient.upsertEntity(entity, "Replace");
  await tableClient.deleteEntity(ADMIN_SCOPE, toRowKey(currentNormalizedEmail));

  return toAdminAccount(entity);
};

export const deleteAdminAccount = async (email: string) => {
  const normalizedEmail = normalizeEmail(email);

  if (!normalizedEmail) {
    throw new Error("Email is required to delete an admin account.");
  }

  const existing = await getAdminAccountByEmail(normalizedEmail);

  if (!existing) {
    throw new Error("Admin account not found.");
  }

  const tableClient = await getAppTableClient();
  await tableClient.deleteEntity(ADMIN_SCOPE, toRowKey(normalizedEmail));
};

export const listAdminAccounts = async (): Promise<AdminAccount[]> => {
  const tableClient = await getAppTableClient();
  const entities = tableClient.listEntities<AdminAccountEntity>({
    queryOptions: {
      filter: `PartitionKey eq '${ADMIN_SCOPE}' and type eq '${ADMIN_ACCOUNT_TYPE}'`,
    },
  });

  const items: AdminAccount[] = [];

  for await (const entity of entities) {
    items.push(toAdminAccount(entity));
  }

  return items.sort((left, right) => right.createdAt.localeCompare(left.createdAt));
};

export const listAdminAccountsPage = async (
  limit: number,
  cursor?: string,
): Promise<AdminAccountPage> => {
  const tableClient = await getAppTableClient();
  const pages = tableClient.listEntities<AdminAccountEntity>({
    queryOptions: {
      filter: `PartitionKey eq '${ADMIN_SCOPE}' and type eq '${ADMIN_ACCOUNT_TYPE}'`,
    },
  }).byPage({
    continuationToken: cursor || undefined,
    maxPageSize: limit,
  });

  for await (const page of pages) {
    const items = [...page]
      .map((entity) => toAdminAccount(entity))
      .sort((left, right) => right.createdAt.localeCompare(left.createdAt));

    return {
      items,
      pageInfo: buildPageInfo(limit, page.continuationToken),
    };
  }

  return {
    items: [],
    pageInfo: buildPageInfo(limit),
  };
};
