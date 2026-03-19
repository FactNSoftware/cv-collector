import { createHash, randomBytes } from "crypto";
import { getAppTableClient, isTableNotFoundError } from "./azure-tables";

const PORTAL_TRANSFER_SCOPE = "auth:portal-transfer";
const PORTAL_TRANSFER_TYPE = "portal-transfer";
const AUTH_SECRET_ENV = "AUTH_SECRET";
const PORTAL_TRANSFER_TTL_MS = 5 * 60 * 1000;

type PortalTransferEntity = {
  partitionKey: string;
  rowKey: string;
  type: string;
  email: string;
  createdAt: number;
  expiresAt: number;
};

const getAuthSecret = () => {
  const secret = process.env[AUTH_SECRET_ENV];

  if (!secret) {
    throw new Error(`Authentication configuration is missing. Set: ${AUTH_SECRET_ENV}`);
  }

  return secret;
};

const hashToken = (value: string) => createHash("sha256")
  .update(`${value}:${getAuthSecret()}`)
  .digest("hex");

export const createPortalTransferToken = async (email: string) => {
  const normalizedEmail = email.trim().toLowerCase();

  if (!normalizedEmail) {
    throw new Error("Email is required to create a portal transfer token.");
  }

  const token = randomBytes(32).toString("hex");
  const tokenHash = hashToken(token);
  const expiresAt = Date.now() + PORTAL_TRANSFER_TTL_MS;
  const tableClient = await getAppTableClient();

  await tableClient.upsertEntity<PortalTransferEntity>({
    partitionKey: PORTAL_TRANSFER_SCOPE,
    rowKey: tokenHash,
    type: PORTAL_TRANSFER_TYPE,
    email: normalizedEmail,
    createdAt: Date.now(),
    expiresAt,
  }, "Replace");

  return {
    token,
    expiresAt: new Date(expiresAt),
  };
};

export const consumePortalTransferToken = async (token: string | null) => {
  if (!token) {
    return null;
  }

  const tokenHash = hashToken(token);
  const tableClient = await getAppTableClient();
  let entity: PortalTransferEntity | null = null;

  try {
    entity = await tableClient.getEntity<PortalTransferEntity>(PORTAL_TRANSFER_SCOPE, tokenHash);
  } catch (error) {
    if (isTableNotFoundError(error)) {
      return null;
    }

    throw error;
  }

  try {
    await tableClient.deleteEntity(PORTAL_TRANSFER_SCOPE, tokenHash);
  } catch (error) {
    if (!isTableNotFoundError(error)) {
      throw error;
    }
  }

  if (!entity || entity.type !== PORTAL_TRANSFER_TYPE) {
    return null;
  }

  const email = String(entity.email ?? "").trim().toLowerCase();
  const expiresAtMs = Number(entity.expiresAt ?? 0);

  if (!email || !Number.isFinite(expiresAtMs) || expiresAtMs <= Date.now()) {
    return null;
  }

  return {
    email,
    expiresAt: new Date(expiresAtMs),
  };
};
