import { createHash, randomInt, randomUUID } from "crypto";
import { getAppTableClient, isTableNotFoundError } from "./azure-tables";
import { sendTransactionalEmail } from "./email-service";
import { buildOtpEmailTemplate } from "./otp-email-template";
import { isServiceBusConfigured } from "./service-bus";

const AUTH_SECRET_ENV = "AUTH_SECRET";
const OTP_SCOPE = "auth";
const OTP_TYPE = "otp";
const OTP_LENGTH = 6;
const OTP_TTL_MS = 5 * 60 * 1000;
const OTP_EXPIRY_MINUTES = OTP_TTL_MS / (60 * 1000);
const OTP_MAX_ATTEMPTS = 5;

export class OtpValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "OtpValidationError";
  }
}

type OtpEntity = {
  partitionKey: string;
  rowKey: string;
  type: string;
  email: string;
  codeHash: string;
  requestId: string;
  attempts: number;
  createdAt: number;
  expiresAt: number;
  deliveryStatus?: "pending" | "queued" | "sent" | "failed";
  deliveryError?: string;
  queuedAt?: number;
  sentAt?: number;
  updatedAt?: number;
};

const getAuthSecret = () => {
  const secret = process.env[AUTH_SECRET_ENV];

  if (!secret) {
    throw new Error(`Authentication configuration is missing. Set: ${AUTH_SECRET_ENV}`);
  }

  return secret;
};

const hashOtpCode = (email: string, otpCode: string) => {
  const normalizedEmail = email.trim().toLowerCase();

  return createHash("sha256")
    .update(`${normalizedEmail}:${otpCode}:${getAuthSecret()}`)
    .digest("hex");
};

const toOtpDocId = (email: string) => {
  return encodeURIComponent(email.trim().toLowerCase());
};

const createOtpCode = () => {
  return randomInt(0, 10 ** OTP_LENGTH).toString().padStart(OTP_LENGTH, "0");
};

const sendOtpEmail = async (email: string, otpCode: string) => {
  const template = buildOtpEmailTemplate({
    otpCode,
    recipientEmail: email,
    expiresInMinutes: OTP_EXPIRY_MINUTES,
  });
  await sendTransactionalEmail(email, template);
};

const toOtpEntity = ({
  email,
  codeHash,
  requestId,
  expiresAt,
  deliveryStatus,
}: {
  email: string;
  codeHash: string;
  requestId: string;
  expiresAt: number;
  deliveryStatus: "pending" | "queued" | "sent" | "failed";
}): OtpEntity => ({
  partitionKey: OTP_SCOPE,
  rowKey: toOtpDocId(email),
  type: OTP_TYPE,
  email,
  codeHash,
  requestId,
  attempts: 0,
  createdAt: Date.now(),
  expiresAt,
  deliveryStatus,
  queuedAt: deliveryStatus === "queued" ? Date.now() : undefined,
  sentAt: deliveryStatus === "sent" ? Date.now() : undefined,
});

const getOtpEntity = async (email: string) => {
  const tableClient = await getAppTableClient();
  return tableClient.getEntity<OtpEntity>(OTP_SCOPE, toOtpDocId(email));
};

const updateOtpEntity = async (email: string, requestId: string, patch: Partial<OtpEntity>) => {
  const tableClient = await getAppTableClient();
  let existing: OtpEntity;

  try {
    existing = await getOtpEntity(email);
  } catch (error) {
    if (isTableNotFoundError(error)) {
      return false;
    }

    throw error;
  }

  if (existing.requestId !== requestId) {
    return false;
  }

  await tableClient.upsertEntity<OtpEntity>({
    ...existing,
    ...patch,
    partitionKey: OTP_SCOPE,
    rowKey: toOtpDocId(email),
    type: OTP_TYPE,
    email,
    updatedAt: Date.now(),
  }, "Replace");

  return true;
};

export const isValidEmail = (email: string) => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
};

export const sendLoginOtp = async (email: string) => {
  const normalizedEmail = email.trim().toLowerCase();

  if (!isValidEmail(normalizedEmail)) {
    throw new OtpValidationError("Enter a valid email address.");
  }

  const otpCode = createOtpCode();
  const expiresAt = Date.now() + OTP_TTL_MS;
  const requestId = randomUUID();
  const tableClient = await getAppTableClient();

  await tableClient.upsertEntity<OtpEntity>(
    toOtpEntity({
      email: normalizedEmail,
      codeHash: hashOtpCode(normalizedEmail, otpCode),
      requestId,
      expiresAt,
      deliveryStatus: "pending",
    }),
    "Replace",
  );

  if (!isServiceBusConfigured()) {
    try {
      await sendOtpEmail(normalizedEmail, otpCode);
      await markLoginOtpEmailSent(normalizedEmail, requestId);
    } catch (error) {
      await markLoginOtpEmailFailed(
        normalizedEmail,
        requestId,
        error instanceof Error ? error.message : "Failed to send OTP email.",
      );
      throw error;
    }

    return {
      email: normalizedEmail,
      requestId,
      deliveryStatus: "sent" as const,
    };
  }

  const { enqueueOtpEmail } = await import("./otp-email-queue");
  try {
    await enqueueOtpEmail({
      requestId,
      email: normalizedEmail,
      otpCode,
    });
  } catch (error) {
    await markLoginOtpEmailFailed(
      normalizedEmail,
      requestId,
      error instanceof Error ? error.message : "Failed to queue OTP email.",
    );
    throw error;
  }

  return {
    email: normalizedEmail,
    requestId,
    deliveryStatus: "queued" as const,
  };
};

export const markLoginOtpEmailQueued = async (email: string, requestId: string) => {
  await updateOtpEntity(email, requestId, {
    deliveryStatus: "queued",
    deliveryError: "",
    queuedAt: Date.now(),
  });
};

export const markLoginOtpEmailSent = async (email: string, requestId: string) => {
  await updateOtpEntity(email, requestId, {
    deliveryStatus: "sent",
    deliveryError: "",
    sentAt: Date.now(),
  });
};

export const markLoginOtpEmailFailed = async (email: string, requestId: string, errorMessage: string) => {
  await updateOtpEntity(email, requestId, {
    deliveryStatus: "failed",
    deliveryError: errorMessage,
  });
};

export const getLoginOtpDeliveryStatus = async (email: string, requestId: string) => {
  const normalizedEmail = email.trim().toLowerCase();

  if (!isValidEmail(normalizedEmail)) {
    throw new OtpValidationError("Enter a valid email address.");
  }

  if (!requestId.trim()) {
    throw new OtpValidationError("OTP request id is required.");
  }

  try {
    const data = await getOtpEntity(normalizedEmail);

    if (data.requestId !== requestId.trim()) {
      throw new OtpValidationError("OTP request was not found.");
    }

    return {
      requestId: data.requestId,
      status: data.deliveryStatus ?? "pending",
      error: data.deliveryError ?? null,
      expiresAt: Number(data.expiresAt ?? 0),
    };
  } catch (error) {
    if (isTableNotFoundError(error)) {
      throw new OtpValidationError("OTP request was not found.");
    }

    throw error;
  }
};

export const verifyLoginOtp = async (email: string, otpCode: string) => {
  const normalizedEmail = email.trim().toLowerCase();
  const normalizedCode = otpCode.trim();

  if (!isValidEmail(normalizedEmail)) {
    throw new OtpValidationError("Enter a valid email address.");
  }

  if (!/^\d{6}$/.test(normalizedCode)) {
    throw new OtpValidationError("OTP must be a 6-digit code.");
  }

  const tableClient = await getAppTableClient();
  const otpId = toOtpDocId(normalizedEmail);
  let data: OtpEntity | undefined;

  try {
    data = await tableClient.getEntity<OtpEntity>(OTP_SCOPE, otpId);
  } catch (error) {
    if (isTableNotFoundError(error)) {
      throw new OtpValidationError("OTP not found. Please request a new code.");
    }

    throw error;
  }

  const attempts = Number(data?.attempts ?? 0);
  const expiresAt = Number(data?.expiresAt ?? 0);
  const savedHash = String(data?.codeHash ?? "");
  const docType = String(data?.type ?? "");
  const savedEmail = String(data?.email ?? "");

  if (!Number.isFinite(expiresAt) || !savedHash || docType !== OTP_TYPE || savedEmail !== normalizedEmail) {
    await tableClient.deleteEntity(OTP_SCOPE, otpId);
    throw new OtpValidationError("OTP is invalid. Please request a new code.");
  }

  if (expiresAt <= Date.now()) {
    await tableClient.deleteEntity(OTP_SCOPE, otpId);
    throw new OtpValidationError("OTP expired. Please request a new code.");
  }

  if (attempts >= OTP_MAX_ATTEMPTS) {
    await tableClient.deleteEntity(OTP_SCOPE, otpId);
    throw new OtpValidationError("Too many failed attempts. Request a new OTP.");
  }

  const providedHash = hashOtpCode(normalizedEmail, normalizedCode);

  if (providedHash !== savedHash) {
    await tableClient.upsertEntity<OtpEntity>({
      ...data,
      partitionKey: OTP_SCOPE,
      rowKey: otpId,
      type: OTP_TYPE,
      email: normalizedEmail,
      attempts: attempts + 1,
      updatedAt: Date.now(),
    }, "Replace");
    throw new OtpValidationError("Invalid OTP code.");
  }

  await tableClient.deleteEntity(OTP_SCOPE, otpId);

  return {
    email: normalizedEmail,
  };
};
