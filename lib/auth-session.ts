import { createHash, randomBytes } from "crypto";
import { cookies } from "next/headers";
import { getAppContainer, isCosmosNotFoundError } from "./azure-cosmos";

const AUTH_SECRET_ENV = "AUTH_SECRET";
const AUTH_SCOPE = "auth";
const AUTH_SESSION_TYPE = "session";

const SESSION_TTL_MS = 12 * 60 * 60 * 1000;

export const SESSION_COOKIE_NAME = "cv_session";

export type AuthSession = {
  email: string;
  expiresAt: Date;
};

const getAuthSecret = () => {
  const secret = process.env[AUTH_SECRET_ENV];

  if (!secret) {
    throw new Error(`Authentication configuration is missing. Set: ${AUTH_SECRET_ENV}`);
  }

  return secret;
};

const hashWithSecret = (value: string) => {
  return createHash("sha256")
    .update(`${value}:${getAuthSecret()}`)
    .digest("hex");
};

const getSessionTokenFromCookieHeader = (cookieHeader: string | null) => {
  if (!cookieHeader) {
    return null;
  }

  const cookie = cookieHeader
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${SESSION_COOKIE_NAME}=`));

  if (!cookie) {
    return null;
  }

  return decodeURIComponent(cookie.slice(`${SESSION_COOKIE_NAME}=`.length));
};

const parseSessionFromDoc = async (tokenHash: string) => {
  const container = getAppContainer();
  let data: Record<string, unknown> | undefined;

  try {
    const response = await container
      .item(tokenHash, AUTH_SCOPE)
      .read<Record<string, unknown>>();
    data = response.resource;
  } catch (error) {
    if (isCosmosNotFoundError(error)) {
      return null;
    }

    throw error;
  }

  const email = String(data?.email ?? "").trim().toLowerCase();
  const expiresAtMs = Number(data?.expiresAt ?? 0);
  const docType = String(data?.type ?? "");

  if (!email || !Number.isFinite(expiresAtMs) || docType !== AUTH_SESSION_TYPE) {
    await container.item(tokenHash, AUTH_SCOPE).delete();
    return null;
  }

  if (expiresAtMs <= Date.now()) {
    await container.item(tokenHash, AUTH_SCOPE).delete();
    return null;
  }

  return {
    email,
    expiresAt: new Date(expiresAtMs),
  } satisfies AuthSession;
};

export const createAuthSession = async (email: string) => {
  const normalizedEmail = email.trim().toLowerCase();

  if (!normalizedEmail) {
    throw new Error("Email is required to create a session.");
  }

  const sessionToken = randomBytes(32).toString("hex");
  const sessionTokenHash = hashWithSecret(sessionToken);
  const expiresAtMs = Date.now() + SESSION_TTL_MS;
  const container = getAppContainer();

  await container.items.upsert({
    id: sessionTokenHash,
    scope: AUTH_SCOPE,
    type: AUTH_SESSION_TYPE,
    email: normalizedEmail,
    createdAt: Date.now(),
    expiresAt: expiresAtMs,
  });

  return {
    token: sessionToken,
    expiresAt: new Date(expiresAtMs),
  };
};

export const getAuthSessionFromToken = async (token: string | null) => {
  if (!token) {
    return null;
  }

  const tokenHash = hashWithSecret(token);
  return parseSessionFromDoc(tokenHash);
};

export const getAuthSessionFromRequest = async (request: Request) => {
  const token = getSessionTokenFromCookieHeader(request.headers.get("cookie"));
  return getAuthSessionFromToken(token);
};

export const getAuthSessionFromCookies = async () => {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value ?? null;
  return getAuthSessionFromToken(token);
};

export const deleteAuthSessionByToken = async (token: string | null) => {
  if (!token) {
    return;
  }

  const tokenHash = hashWithSecret(token);
  const container = getAppContainer();

  try {
    await container.item(tokenHash, AUTH_SCOPE).delete();
  } catch (error) {
    if (isCosmosNotFoundError(error)) {
      return;
    }

    throw error;
  }
};

export const readSessionTokenFromRequest = (request: Request) => {
  return getSessionTokenFromCookieHeader(request.headers.get("cookie"));
};
