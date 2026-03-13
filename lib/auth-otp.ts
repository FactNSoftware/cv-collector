import { createHash, randomInt } from "crypto";
import { EmailClient } from "@azure/communication-email";
import { getAppTableClient, isTableNotFoundError } from "./azure-tables";
import { buildOtpEmailTemplate } from "./otp-email-template";

const AUTH_SECRET_ENV = "AUTH_SECRET";
const OTP_SCOPE = "auth";
const OTP_TYPE = "otp";
const OTP_LENGTH = 6;
const OTP_TTL_MS = 5 * 60 * 1000;
const OTP_EXPIRY_MINUTES = OTP_TTL_MS / (60 * 1000);
const OTP_MAX_ATTEMPTS = 5;

let emailClientCache: EmailClient | null = null;

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
  attempts: number;
  createdAt: number;
  expiresAt: number;
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

const getAzureEmailConfig = () => {
  const connectionString = process.env.AZURE_COMMUNICATION_CONNECTION_STRING;
  const senderAddress = process.env.AZURE_EMAIL_SENDER_ADDRESS;

  const missing: string[] = [];

  if (!connectionString) {
    missing.push("AZURE_COMMUNICATION_CONNECTION_STRING");
  }

  if (!senderAddress) {
    missing.push("AZURE_EMAIL_SENDER_ADDRESS");
  }

  if (missing.length > 0) {
    throw new Error(
      `Azure Email configuration is missing. Set: ${missing.join(", ")}`,
    );
  }

  return {
    connectionString,
    senderAddress,
  };
};

const getEmailClient = () => {
  if (emailClientCache) {
    return emailClientCache;
  }

  const config = getAzureEmailConfig();
  emailClientCache = new EmailClient(config.connectionString as string);

  return emailClientCache;
};

const sendOtpEmail = async (email: string, otpCode: string) => {
  const config = getAzureEmailConfig();
  const template = buildOtpEmailTemplate({
    otpCode,
    recipientEmail: email,
    expiresInMinutes: OTP_EXPIRY_MINUTES,
  });

  const client = getEmailClient();
  const poller = await client.beginSend({
    senderAddress: config.senderAddress as string,
    recipients: {
      to: [{ address: email }],
    },
    content: {
      subject: template.subject,
      plainText: template.text,
      html: template.html,
    },
  });

  const result = await poller.pollUntilDone();

  if (!result || result.status !== "Succeeded") {
    const details = result?.error?.message ?? "Unknown Azure Email error.";
    throw new Error(`Failed to send OTP email: ${details}`);
  }
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
  await sendOtpEmail(normalizedEmail, otpCode);

  const tableClient = await getAppTableClient();
  const expiresAt = Date.now() + OTP_TTL_MS;

  await tableClient.upsertEntity<OtpEntity>({
    partitionKey: OTP_SCOPE,
    rowKey: toOtpDocId(normalizedEmail),
    type: OTP_TYPE,
    email: normalizedEmail,
    codeHash: hashOtpCode(normalizedEmail, otpCode),
    attempts: 0,
    createdAt: Date.now(),
    expiresAt,
  }, "Replace");
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
