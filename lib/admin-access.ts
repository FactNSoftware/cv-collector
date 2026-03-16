import { getAppTableClient, isTableNotFoundError } from "./azure-tables";
import { buildPageInfo, type PageInfo } from "./pagination";

const ADMIN_SCOPE = "admin";
const ADMIN_ACCOUNT_TYPE = "account";
const ADMIN_PERMISSION_TOKEN_ENV = "ADMIN_PERMISSION_TOKEN";
const ADMIN_PERMISSION_TOKEN_EXPIRES_AT_ENV = "ADMIN_PERMISSION_TOKEN_EXPIRES_AT";
const ADMIN_BOOTSTRAP_SCOPE = "admin-bootstrap";
const ADMIN_BOOTSTRAP_ATTEMPT_TYPE = "attempt";
const BOOTSTRAP_ATTEMPT_WINDOW_MS = 15 * 60 * 1000;
const BOOTSTRAP_MAX_ATTEMPTS = 5;
const BOOTSTRAP_BLOCK_MS = 15 * 60 * 1000;

type AdminAccountEntity = {
  partitionKey: string;
  rowKey: string;
  type: string;
  email: string;
  createdAt: number;
  createdBy: string;
  isDeleted?: boolean;
  deletedAt?: number;
  deletedBy?: string;
};

type AdminBootstrapAttemptEntity = {
  partitionKey: string;
  rowKey: string;
  type: string;
  requesterKey: string;
  attempts: number;
  firstAttemptAt: number;
  lastAttemptAt: number;
  blockedUntil: number;
};

export type AdminAccount = {
  email: string;
  createdAt: string;
  createdBy: string;
  isDeleted: boolean;
  deletedAt: string | null;
  deletedBy: string;
};

export type AdminAccountPage = {
  items: AdminAccount[];
  pageInfo: PageInfo;
};

const normalizeEmail = (email: string) => email.trim().toLowerCase();
const normalizeRequesterKey = (value: string) => value.trim().toLowerCase() || "unknown";

const toRowKey = (email: string) => encodeURIComponent(normalizeEmail(email));
const toBootstrapAttemptRowKey = (requesterKey: string) =>
  encodeURIComponent(normalizeRequesterKey(requesterKey));

const toAdminAccount = (entity: AdminAccountEntity): AdminAccount => ({
  email: entity.email,
  createdAt: new Date(entity.createdAt).toISOString(),
  createdBy: entity.createdBy,
  isDeleted: Boolean(entity.isDeleted),
  deletedAt: entity.deletedAt ? new Date(entity.deletedAt).toISOString() : null,
  deletedBy: entity.deletedBy ?? "",
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

const getAdminPermissionTokenExpiry = () => {
  const value = process.env[ADMIN_PERMISSION_TOKEN_EXPIRES_AT_ENV]?.trim();

  if (!value) {
    return null;
  }

  const parsed = Date.parse(value);

  if (!Number.isFinite(parsed)) {
    throw new Error(
      `Invalid ${ADMIN_PERMISSION_TOKEN_EXPIRES_AT_ENV} value. Use an ISO-8601 timestamp.`,
    );
  }

  return parsed;
};

const isAdminPermissionTokenCurrentlyValid = (providedToken: string) => {
  if (!providedToken || providedToken !== getAdminPermissionToken()) {
    return false;
  }

  const expiresAt = getAdminPermissionTokenExpiry();

  if (expiresAt !== null && expiresAt <= Date.now()) {
    return false;
  }

  return true;
};

export const hasAnyAdminAccount = async () => {
  const tableClient = await getAppTableClient();
  const entities = tableClient.listEntities<AdminAccountEntity>({
    queryOptions: {
      filter: `PartitionKey eq '${ADMIN_SCOPE}' and type eq '${ADMIN_ACCOUNT_TYPE}'`,
    },
  });

  for await (const entity of entities) {
    if (!entity.isDeleted) {
      return true;
    }
  }

  return false;
};

const getAdminBootstrapAttempt = async (requesterKey: string) => {
  const tableClient = await getAppTableClient();

  try {
    return await tableClient.getEntity<AdminBootstrapAttemptEntity>(
      ADMIN_BOOTSTRAP_SCOPE,
      toBootstrapAttemptRowKey(requesterKey),
    );
  } catch (error) {
    if (isTableNotFoundError(error)) {
      return null;
    }

    throw error;
  }
};

const upsertAdminBootstrapAttempt = async (entity: AdminBootstrapAttemptEntity) => {
  const tableClient = await getAppTableClient();
  await tableClient.upsertEntity(entity, "Replace");
};

const deleteAdminBootstrapAttempt = async (requesterKey: string) => {
  const tableClient = await getAppTableClient();

  try {
    await tableClient.deleteEntity(
      ADMIN_BOOTSTRAP_SCOPE,
      toBootstrapAttemptRowKey(requesterKey),
    );
  } catch (error) {
    if (isTableNotFoundError(error)) {
      return;
    }

    throw error;
  }
};

export const validateAdminBootstrapAttempt = async ({
  providedToken,
  requesterKey,
}: {
  providedToken: string;
  requesterKey: string;
}) => {
  const normalizedRequesterKey = normalizeRequesterKey(requesterKey);
  const now = Date.now();
  const existing = await getAdminBootstrapAttempt(normalizedRequesterKey);

  if (existing && Number(existing.blockedUntil ?? 0) > now) {
    const retryAfterSeconds = Math.max(
      1,
      Math.ceil((Number(existing.blockedUntil) - now) / 1000),
    );
    return {
      ok: false as const,
      status: 429,
      message: "Too many failed bootstrap attempts. Try again later.",
      retryAfterSeconds,
    };
  }

  if (isAdminPermissionTokenCurrentlyValid(providedToken.trim())) {
    await deleteAdminBootstrapAttempt(normalizedRequesterKey);

    return {
      ok: true as const,
    };
  }

  const previousFirstAttemptAt = Number(existing?.firstAttemptAt ?? now);
  const withinWindow = now - previousFirstAttemptAt < BOOTSTRAP_ATTEMPT_WINDOW_MS;
  const attempts = withinWindow ? Number(existing?.attempts ?? 0) + 1 : 1;
  const firstAttemptAt = withinWindow ? previousFirstAttemptAt : now;
  const blockedUntil = attempts >= BOOTSTRAP_MAX_ATTEMPTS ? now + BOOTSTRAP_BLOCK_MS : 0;

  await upsertAdminBootstrapAttempt({
    partitionKey: ADMIN_BOOTSTRAP_SCOPE,
    rowKey: toBootstrapAttemptRowKey(normalizedRequesterKey),
    type: ADMIN_BOOTSTRAP_ATTEMPT_TYPE,
    requesterKey: normalizedRequesterKey,
    attempts,
    firstAttemptAt,
    lastAttemptAt: now,
    blockedUntil,
  });

  return {
    ok: false as const,
    status: blockedUntil > 0 ? 429 : 403,
    message: blockedUntil > 0
      ? "Too many failed bootstrap attempts. Try again later."
      : "Invalid admin permission token.",
    retryAfterSeconds: blockedUntil > 0 ? Math.ceil(BOOTSTRAP_BLOCK_MS / 1000) : undefined,
  };
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

    const record = toAdminAccount(entity);
    return record.isDeleted ? null : record;
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
    isDeleted: false,
    deletedAt: 0,
    deletedBy: "",
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
    isDeleted: false,
    deletedAt: 0,
    deletedBy: "",
  };

  await tableClient.upsertEntity(entity, "Replace");
  await tableClient.deleteEntity(ADMIN_SCOPE, toRowKey(currentNormalizedEmail));

  return toAdminAccount(entity);
};

export const deleteAdminAccount = async (email: string, deletedBy: string) => {
  const normalizedEmail = normalizeEmail(email);

  if (!normalizedEmail) {
    throw new Error("Email is required to delete an admin account.");
  }

  const existing = await getAdminAccountByEmail(normalizedEmail);

  if (!existing) {
    throw new Error("Admin account not found.");
  }

  const tableClient = await getAppTableClient();
  await tableClient.upsertEntity<AdminAccountEntity>({
    partitionKey: ADMIN_SCOPE,
    rowKey: toRowKey(normalizedEmail),
    type: ADMIN_ACCOUNT_TYPE,
    email: existing.email,
    createdAt: Date.parse(existing.createdAt),
    createdBy: existing.createdBy,
    isDeleted: true,
    deletedAt: Date.now(),
    deletedBy: normalizeEmail(deletedBy),
  }, "Replace");
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
    const record = toAdminAccount(entity);

    if (!record.isDeleted) {
      items.push(record);
    }
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
      .filter((entity) => !entity.isDeleted)
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

export const purgeDeletedAdminAccounts = async (olderThanMs: number) => {
  const cutoff = Date.now() - olderThanMs;
  const tableClient = await getAppTableClient();
  const entities = tableClient.listEntities<AdminAccountEntity>({
    queryOptions: {
      filter: `PartitionKey eq '${ADMIN_SCOPE}' and type eq '${ADMIN_ACCOUNT_TYPE}'`,
    },
  });

  let purgedCount = 0;

  for await (const entity of entities) {
    if (!entity.isDeleted || !entity.deletedAt || entity.deletedAt > cutoff) {
      continue;
    }

    await tableClient.deleteEntity(ADMIN_SCOPE, entity.rowKey);
    purgedCount += 1;
  }

  return purgedCount;
};
