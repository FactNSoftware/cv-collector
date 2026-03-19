import { createHash } from "crypto";
import { getAppTableClient, isTableNotFoundError } from "./azure-tables";
import {
  createOrganization,
  getOrganizationBySlug,
  isOrganizationSlugValid,
  listOrganizationsForMemberEmail,
} from "./organizations";
import { assignDefaultPublicSubscriptionToOrganizationIfAvailable } from "./subscriptions";

const SCOPE = "org-registrations";
const ENTITY_TYPE = "pending-org-registration";
const OTP_MAX_ATTEMPTS = 5;
const MAX_SELF_REGISTERED_ORGANIZATIONS_PER_EMAIL = 3;

export const COMPANY_SIZES = [
  "1-10",
  "11-50",
  "51-200",
  "201-500",
  "501-1000",
  "1000+",
] as const;

export const EXPECTED_USERS = [
  "Under 10 hires/year",
  "10–50 hires/year",
  "50–200 hires/year",
  "200+ hires/year",
] as const;

export type CompanySize = (typeof COMPANY_SIZES)[number];
export type ExpectedUsers = (typeof EXPECTED_USERS)[number];

export type OrgRegistrationInput = {
  orgName: string;
  ownerEmail: string;
  companySize: CompanySize;
  expectedUsers: ExpectedUsers;
};

type PendingOrgEntity = {
  partitionKey: string;
  rowKey: string;
  type: string;
  orgName: string;
  ownerEmail: string;
  companySize: string;
  expectedUsers: string;
  slug: string;
  otpCodeHash: string;
  attempts: number;
  createdAt: number;
  expiresAt: number;
};

export class OrgRegistrationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "OrgRegistrationError";
  }
}

const getAuthSecret = () => {
  const secret = process.env["AUTH_SECRET"];

  if (!secret) {
    throw new Error("Authentication configuration is missing. Set: AUTH_SECRET");
  }

  return secret;
};

const hashOtp = (email: string, code: string) =>
  createHash("sha256")
    .update(`${email.trim().toLowerCase()}:${code}:${getAuthSecret()}`)
    .digest("hex");

const toRowKey = (email: string) => encodeURIComponent(email.trim().toLowerCase());

const normalizeEmail = (email: string) => email.trim().toLowerCase();

export const isValidEmail = (email: string) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

/**
 * Derives a URL-safe slug from an org name, and appends a random 4-char suffix
 * if the base slug is already taken.
 */
const generateUniqueSlug = async (orgName: string): Promise<string> => {
  const base = orgName
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);

  if (!base || !isOrganizationSlugValid(base)) {
    throw new OrgRegistrationError(
      "Organization name could not produce a valid URL slug. Use letters and numbers.",
    );
  }

  const existing = await getOrganizationBySlug(base);

  if (!existing) {
    return base;
  }

  // Append a short random hex suffix to resolve conflicts
  const suffix = Math.random().toString(36).slice(2, 6);
  const candidate = `${base}-${suffix}`;

  const conflict = await getOrganizationBySlug(candidate);

  if (!conflict) {
    return candidate;
  }

  throw new OrgRegistrationError(
    "Could not generate a unique slug for this organization name. Please choose a slightly different name.",
  );
};

const ensureRegistrationLimitForOwnerEmail = async (ownerEmail: string) => {
  const accessList = await listOrganizationsForMemberEmail(ownerEmail);
  const ownedOrganizationCount = accessList.filter((item) => item.role === "owner" || item.isRootOwner).length;

  if (ownedOrganizationCount >= MAX_SELF_REGISTERED_ORGANIZATIONS_PER_EMAIL) {
    throw new OrgRegistrationError(
      `This email can register up to ${MAX_SELF_REGISTERED_ORGANIZATIONS_PER_EMAIL} organizations only.`,
    );
  }
};

/**
 * Starts organization registration by creating the tenant directly.
 * Returns the generated slug so the frontend can redirect to tenant login.
 */
export const startOrgRegistration = async (
  input: OrgRegistrationInput,
): Promise<{ slug: string }> => {
  const ownerEmail = normalizeEmail(input.ownerEmail);
  const orgName = input.orgName.trim();

  if (!isValidEmail(ownerEmail)) {
    throw new OrgRegistrationError("Enter a valid email address.");
  }

  if (!orgName || orgName.length < 2) {
    throw new OrgRegistrationError("Organization name must be at least 2 characters.");
  }

  if (!COMPANY_SIZES.includes(input.companySize as CompanySize)) {
    throw new OrgRegistrationError("Select a valid company size.");
  }

  if (!EXPECTED_USERS.includes(input.expectedUsers as ExpectedUsers)) {
    throw new OrgRegistrationError("Select a valid expected hiring volume.");
  }

  await ensureRegistrationLimitForOwnerEmail(ownerEmail);

  const slug = await generateUniqueSlug(orgName);

  const result = await createOrganization({
    slug,
    name: orgName,
    ownerEmail,
    companySize: input.companySize,
    expectedUsers: input.expectedUsers,
    createdBy: "registration",
  });

  await assignDefaultPublicSubscriptionToOrganizationIfAvailable({
    organizationId: result.organization.id,
    assignedBy: "registration",
  });

  return { slug };
};

/**
 * Verifies the OTP from a pending org registration.
 * On success: creates the organization + adds the owner as a member, then deletes the pending record.
 * Returns { slug, ownerEmail } for the caller to create a session.
 */
export const verifyOrgRegistration = async (
  ownerEmail: string,
  otpCode: string,
): Promise<{ slug: string; ownerEmail: string }> => {
  const email = normalizeEmail(ownerEmail);
  const code = otpCode.trim();

  if (!isValidEmail(email)) {
    throw new OrgRegistrationError("Invalid email address.");
  }

  if (!/^\d{6}$/.test(code)) {
    throw new OrgRegistrationError("OTP must be a 6-digit code.");
  }

  const tableClient = await getAppTableClient();
  const rowKey = toRowKey(email);
  let record: PendingOrgEntity;

  try {
    record = await tableClient.getEntity<PendingOrgEntity>(SCOPE, rowKey);
  } catch (error) {
    if (isTableNotFoundError(error)) {
      throw new OrgRegistrationError("Registration not found. Please start a new registration.");
    }

    throw error;
  }

  if (record.type !== ENTITY_TYPE || record.ownerEmail !== email) {
    await tableClient.deleteEntity(SCOPE, rowKey);
    throw new OrgRegistrationError("Invalid registration record. Please start over.");
  }

  if (record.expiresAt <= Date.now()) {
    await tableClient.deleteEntity(SCOPE, rowKey);
    throw new OrgRegistrationError("Registration code expired. Please start a new registration.");
  }

  if (record.attempts >= OTP_MAX_ATTEMPTS) {
    await tableClient.deleteEntity(SCOPE, rowKey);
    throw new OrgRegistrationError("Too many failed attempts. Please start a new registration.");
  }

  const providedHash = hashOtp(email, code);

  if (providedHash !== record.otpCodeHash) {
    await tableClient.upsertEntity<PendingOrgEntity>(
      { ...record, attempts: record.attempts + 1 },
      "Replace",
    );
    throw new OrgRegistrationError("Invalid code.");
  }

  // Activate: create org + add owner
  await ensureRegistrationLimitForOwnerEmail(email);

  const result = await createOrganization({
    slug: record.slug,
    name: record.orgName,
    ownerEmail: email,
    createdBy: "registration",
  });

  await assignDefaultPublicSubscriptionToOrganizationIfAvailable({
    organizationId: result.organization.id,
    assignedBy: "registration",
  });

  // Clean up pending record
  await tableClient.deleteEntity(SCOPE, rowKey);

  return { slug: record.slug, ownerEmail: email };
};
