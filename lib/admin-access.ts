import { getAppTableClient } from "./azure-tables";

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

const toRowKey = (email: string) => encodeURIComponent(email.trim().toLowerCase());

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

export const isAdminEmail = async (email: string) => {
  const normalizedEmail = email.trim().toLowerCase();

  if (!normalizedEmail) {
    return false;
  }

  const tableClient = await getAppTableClient();

  try {
    const entity = await tableClient.getEntity<AdminAccountEntity>(
      ADMIN_SCOPE,
      toRowKey(normalizedEmail),
    );
    return entity.type === ADMIN_ACCOUNT_TYPE;
  } catch {
    return false;
  }
};

export const createAdminAccount = async (
  email: string,
  createdBy: string,
): Promise<AdminAccount> => {
  const normalizedEmail = email.trim().toLowerCase();

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
