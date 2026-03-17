import { getAppTableClient, isTableNotFoundError } from "./azure-tables";

const SUPER_ADMIN_SCOPE = "system:super-admins";
const SUPER_ADMIN_ACCOUNT_TYPE = "super-admin-account";
const SUPER_ADMIN_PERMISSION_TOKEN_ENV = "SUPER_ADMIN_PERMISSION_TOKEN";
const SUPER_ADMIN_PERMISSION_TOKEN_EXPIRES_AT_ENV = "SUPER_ADMIN_PERMISSION_TOKEN_EXPIRES_AT";
const SUPER_ADMIN_BOOTSTRAP_SCOPE = "system:super-admin-bootstrap";
const SUPER_ADMIN_BOOTSTRAP_ATTEMPT_TYPE = "attempt";
const BOOTSTRAP_ATTEMPT_WINDOW_MS = 15 * 60 * 1000;
const BOOTSTRAP_MAX_ATTEMPTS = 5;
const BOOTSTRAP_BLOCK_MS = 15 * 60 * 1000;

type SuperAdminAccountEntity = {
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

type SuperAdminBootstrapAttemptEntity = {
  partitionKey: string;
  rowKey: string;
  type: string;
  requesterKey: string;
  attempts: number;
  firstAttemptAt: number;
  lastAttemptAt: number;
  blockedUntil: number;
};

export type SuperAdminAccount = {
  email: string;
  createdAt: string;
  createdBy: string;
  isDeleted: boolean;
  deletedAt: string | null;
  deletedBy: string;
};

const normalizeEmail = (email: string) => email.trim().toLowerCase();
const normalizeRequesterKey = (value: string) => value.trim().toLowerCase() || "unknown";

const toRowKey = (email: string) => encodeURIComponent(normalizeEmail(email));
const toBootstrapAttemptRowKey = (requesterKey: string) =>
  encodeURIComponent(normalizeRequesterKey(requesterKey));

const toSuperAdminAccount = (entity: SuperAdminAccountEntity): SuperAdminAccount => ({
  email: entity.email,
  createdAt: new Date(entity.createdAt).toISOString(),
  createdBy: entity.createdBy,
  isDeleted: Boolean(entity.isDeleted),
  deletedAt: entity.deletedAt ? new Date(entity.deletedAt).toISOString() : null,
  deletedBy: entity.deletedBy ?? "",
});

export const getSuperAdminPermissionToken = () => {
  const token = process.env[SUPER_ADMIN_PERMISSION_TOKEN_ENV];

  if (!token) {
    throw new Error(
      `Super admin bootstrap configuration is missing. Set: ${SUPER_ADMIN_PERMISSION_TOKEN_ENV}`,
    );
  }

  return token;
};

const getSuperAdminPermissionTokenExpiry = () => {
  const value = process.env[SUPER_ADMIN_PERMISSION_TOKEN_EXPIRES_AT_ENV]?.trim();

  if (!value) {
    return null;
  }

  const parsed = Date.parse(value);

  if (!Number.isFinite(parsed)) {
    throw new Error(
      `Invalid ${SUPER_ADMIN_PERMISSION_TOKEN_EXPIRES_AT_ENV} value. Use an ISO-8601 timestamp.`,
    );
  }

  return parsed;
};

const isSuperAdminPermissionTokenCurrentlyValid = (providedToken: string) => {
  if (!providedToken || providedToken !== getSuperAdminPermissionToken()) {
    return false;
  }

  const expiresAt = getSuperAdminPermissionTokenExpiry();

  if (expiresAt !== null && expiresAt <= Date.now()) {
    return false;
  }

  return true;
};

export const hasAnySuperAdminAccount = async () => {
  const tableClient = await getAppTableClient();
  const entities = tableClient.listEntities<SuperAdminAccountEntity>({
    queryOptions: {
      filter: `PartitionKey eq '${SUPER_ADMIN_SCOPE}' and type eq '${SUPER_ADMIN_ACCOUNT_TYPE}'`,
    },
  });

  for await (const entity of entities) {
    if (!entity.isDeleted) {
      return true;
    }
  }

  return false;
};

const getSuperAdminBootstrapAttempt = async (requesterKey: string) => {
  const tableClient = await getAppTableClient();

  try {
    return await tableClient.getEntity<SuperAdminBootstrapAttemptEntity>(
      SUPER_ADMIN_BOOTSTRAP_SCOPE,
      toBootstrapAttemptRowKey(requesterKey),
    );
  } catch (error) {
    if (isTableNotFoundError(error)) {
      return null;
    }

    throw error;
  }
};

const upsertSuperAdminBootstrapAttempt = async (
  entity: SuperAdminBootstrapAttemptEntity,
) => {
  const tableClient = await getAppTableClient();
  await tableClient.upsertEntity(entity, "Replace");
};

const deleteSuperAdminBootstrapAttempt = async (requesterKey: string) => {
  const tableClient = await getAppTableClient();

  try {
    await tableClient.deleteEntity(
      SUPER_ADMIN_BOOTSTRAP_SCOPE,
      toBootstrapAttemptRowKey(requesterKey),
    );
  } catch (error) {
    if (isTableNotFoundError(error)) {
      return;
    }

    throw error;
  }
};

export const validateSuperAdminBootstrapAttempt = async ({
  providedToken,
  requesterKey,
}: {
  providedToken: string;
  requesterKey: string;
}) => {
  const normalizedRequesterKey = normalizeRequesterKey(requesterKey);
  const now = Date.now();
  const existing = await getSuperAdminBootstrapAttempt(normalizedRequesterKey);

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

  if (isSuperAdminPermissionTokenCurrentlyValid(providedToken.trim())) {
    await deleteSuperAdminBootstrapAttempt(normalizedRequesterKey);

    return {
      ok: true as const,
    };
  }

  const previousFirstAttemptAt = Number(existing?.firstAttemptAt ?? now);
  const withinWindow = now - previousFirstAttemptAt < BOOTSTRAP_ATTEMPT_WINDOW_MS;
  const attempts = withinWindow ? Number(existing?.attempts ?? 0) + 1 : 1;
  const firstAttemptAt = withinWindow ? previousFirstAttemptAt : now;
  const blockedUntil = attempts >= BOOTSTRAP_MAX_ATTEMPTS ? now + BOOTSTRAP_BLOCK_MS : 0;

  await upsertSuperAdminBootstrapAttempt({
    partitionKey: SUPER_ADMIN_BOOTSTRAP_SCOPE,
    rowKey: toBootstrapAttemptRowKey(normalizedRequesterKey),
    type: SUPER_ADMIN_BOOTSTRAP_ATTEMPT_TYPE,
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
      : "Invalid super admin permission token.",
    retryAfterSeconds: blockedUntil > 0 ? Math.ceil(BOOTSTRAP_BLOCK_MS / 1000) : undefined,
  };
};

export const getSuperAdminAccountByEmail = async (
  email: string,
): Promise<SuperAdminAccount | null> => {
  const normalizedEmail = normalizeEmail(email);

  if (!normalizedEmail) {
    return null;
  }

  const tableClient = await getAppTableClient();

  try {
    const entity = await tableClient.getEntity<SuperAdminAccountEntity>(
      SUPER_ADMIN_SCOPE,
      toRowKey(normalizedEmail),
    );

    if (entity.type !== SUPER_ADMIN_ACCOUNT_TYPE) {
      return null;
    }

    const record = toSuperAdminAccount(entity);
    return record.isDeleted ? null : record;
  } catch (error) {
    if (isTableNotFoundError(error)) {
      return null;
    }

    throw error;
  }
};

export const isSuperAdminEmail = async (email: string) => {
  const normalizedEmail = normalizeEmail(email);

  if (!normalizedEmail) {
    return false;
  }

  return Boolean(await getSuperAdminAccountByEmail(normalizedEmail));
};

export const createSuperAdminAccount = async (
  email: string,
  createdBy: string,
): Promise<SuperAdminAccount> => {
  const normalizedEmail = normalizeEmail(email);

  if (!normalizedEmail) {
    throw new Error("Email is required to create a super admin account.");
  }

  const tableClient = await getAppTableClient();
  const now = Date.now();
  const entity: SuperAdminAccountEntity = {
    partitionKey: SUPER_ADMIN_SCOPE,
    rowKey: toRowKey(normalizedEmail),
    type: SUPER_ADMIN_ACCOUNT_TYPE,
    email: normalizedEmail,
    createdAt: now,
    createdBy: createdBy.trim().toLowerCase(),
    isDeleted: false,
    deletedAt: 0,
    deletedBy: "",
  };

  await tableClient.upsertEntity(entity, "Replace");
  return toSuperAdminAccount(entity);
};

export const updateSuperAdminAccountEmail = async (
  currentEmail: string,
  nextEmail: string,
  updatedBy: string,
): Promise<SuperAdminAccount> => {
  const currentNormalizedEmail = normalizeEmail(currentEmail);
  const nextNormalizedEmail = normalizeEmail(nextEmail);

  if (!currentNormalizedEmail || !nextNormalizedEmail) {
    throw new Error("Current and next super admin emails are required.");
  }

  const existing = await getSuperAdminAccountByEmail(currentNormalizedEmail);

  if (!existing) {
    throw new Error("Super admin account not found.");
  }

  if (currentNormalizedEmail === nextNormalizedEmail) {
    return existing;
  }

  const targetExisting = await getSuperAdminAccountByEmail(nextNormalizedEmail);

  if (targetExisting) {
    throw new Error("A super admin account already exists for that email.");
  }

  const tableClient = await getAppTableClient();
  const entity: SuperAdminAccountEntity = {
    partitionKey: SUPER_ADMIN_SCOPE,
    rowKey: toRowKey(nextNormalizedEmail),
    type: SUPER_ADMIN_ACCOUNT_TYPE,
    email: nextNormalizedEmail,
    createdAt: Date.parse(existing.createdAt) || Date.now(),
    createdBy: updatedBy.trim().toLowerCase(),
    isDeleted: false,
    deletedAt: 0,
    deletedBy: "",
  };

  await tableClient.upsertEntity(entity, "Replace");
  await tableClient.deleteEntity(SUPER_ADMIN_SCOPE, toRowKey(currentNormalizedEmail));

  return toSuperAdminAccount(entity);
};

export const deleteSuperAdminAccount = async (email: string, deletedBy: string) => {
  const normalizedEmail = normalizeEmail(email);

  if (!normalizedEmail) {
    throw new Error("Email is required to delete a super admin account.");
  }

  const existing = await getSuperAdminAccountByEmail(normalizedEmail);

  if (!existing) {
    throw new Error("Super admin account not found.");
  }

  const tableClient = await getAppTableClient();
  await tableClient.upsertEntity<SuperAdminAccountEntity>({
    partitionKey: SUPER_ADMIN_SCOPE,
    rowKey: toRowKey(normalizedEmail),
    type: SUPER_ADMIN_ACCOUNT_TYPE,
    email: existing.email,
    createdAt: Date.parse(existing.createdAt),
    createdBy: existing.createdBy,
    isDeleted: true,
    deletedAt: Date.now(),
    deletedBy: normalizeEmail(deletedBy),
  }, "Replace");
};

export const listSuperAdminAccounts = async (): Promise<SuperAdminAccount[]> => {
  const tableClient = await getAppTableClient();
  const entities = tableClient.listEntities<SuperAdminAccountEntity>({
    queryOptions: {
      filter: `PartitionKey eq '${SUPER_ADMIN_SCOPE}' and type eq '${SUPER_ADMIN_ACCOUNT_TYPE}'`,
    },
  });

  const items: SuperAdminAccount[] = [];

  for await (const entity of entities) {
    const record = toSuperAdminAccount(entity);

    if (!record.isDeleted) {
      items.push(record);
    }
  }

  return items.sort((left, right) => right.createdAt.localeCompare(left.createdAt));
};