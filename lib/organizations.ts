import { randomUUID } from "crypto";
import {
  getAppTableClient,
  isTableConflictError,
  isTableNotFoundError,
} from "./azure-tables";

const ORGANIZATION_SCOPE = "system:organizations";
const ORGANIZATION_TYPE = "organization";
const ORGANIZATION_MEMBERSHIP_TYPE = "organization-membership";

const ORGANIZATION_STATUSES = ["active", "suspended"] as const;
const ORGANIZATION_ROLES = ["owner", "admin"] as const;

type OrganizationEntity = {
  partitionKey: string;
  rowKey: string;
  type: string;
  id: string;
  slug: string;
  name: string;
  rootOwnerEmail?: string;
  logoUrl?: string;
  websiteUrl?: string;
  contactEmail?: string;
  contactPhone?: string;
  location?: string;
  description?: string;
  status: string;
  createdAt: number;
  createdBy: string;
  updatedAt: number;
  updatedBy: string;
};

type OrganizationMembershipEntity = {
  partitionKey: string;
  rowKey: string;
  type: string;
  organizationId: string;
  email: string;
  role: string;
  createdAt: number;
  createdBy: string;
  updatedAt: number;
  updatedBy: string;
  isDeleted?: boolean;
  deletedAt?: number;
  deletedBy?: string;
};

export type OrganizationStatus = (typeof ORGANIZATION_STATUSES)[number];
export type OrganizationRole = (typeof ORGANIZATION_ROLES)[number];

export type OrganizationRecord = {
  id: string;
  slug: string;
  name: string;
  rootOwnerEmail: string;
  logoUrl: string | null;
  websiteUrl: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  location: string | null;
  description: string | null;
  status: OrganizationStatus;
  createdAt: string;
  createdBy: string;
  updatedAt: string;
  updatedBy: string;
};

export type OrganizationMembership = {
  organizationId: string;
  email: string;
  role: OrganizationRole;
  isRootOwner: boolean;
  createdAt: string;
  createdBy: string;
  updatedAt: string;
  updatedBy: string;
  isDeleted: boolean;
  deletedAt: string | null;
  deletedBy: string;
};

export type UserOrganizationAccess = {
  organization: OrganizationRecord;
  role: OrganizationRole;
  isRootOwner: boolean;
};

const normalizeEmail = (email: string) => email.trim().toLowerCase();

const isEmailLike = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

const normalizeOptionalText = (
  value: string | null | undefined,
  fieldName: string,
  maxLength: number,
) => {
  const normalized = typeof value === "string" ? value.trim() : "";

  if (normalized.length > maxLength) {
    throw new Error(`${fieldName} must be ${maxLength} characters or fewer.`);
  }

  return normalized;
};

const normalizeOptionalUrl = (value: string | null | undefined, fieldName: string) => {
  const raw = normalizeOptionalText(value, fieldName, 2048);

  if (!raw) {
    return "";
  }

  const candidate = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;

  try {
    const parsed = new URL(candidate);

    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      throw new Error();
    }

    return parsed.toString();
  } catch {
    throw new Error(`${fieldName} must be a valid URL.`);
  }
};

const INTERNAL_LOGO_URL_PREFIX = "/api/job-assets/";

const normalizeOptionalLogoUrl = (value: string | null | undefined) => {
  const raw = normalizeOptionalText(value, "Logo URL", 2048);

  if (!raw) {
    return "";
  }

  if (raw.startsWith(INTERNAL_LOGO_URL_PREFIX)) {
    return raw;
  }

  return normalizeOptionalUrl(raw, "Logo URL");
};

const normalizeOptionalContactEmail = (value: string | null | undefined) => {
  const normalized = normalizeOptionalText(value, "Contact email", 320).toLowerCase();

  if (!normalized) {
    return "";
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
    throw new Error("Contact email must be a valid email address.");
  }

  return normalized;
};

const normalizeSlug = (value: string) => {
  return value
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
};

const normalizeOrganizationName = (value: string) => value.trim();

const normalizeRole = (value: string | undefined): OrganizationRole => {
  return ORGANIZATION_ROLES.find((item) => item === value) ?? "admin";
};

const normalizeStatus = (value: string | undefined): OrganizationStatus => {
  return ORGANIZATION_STATUSES.find((item) => item === value) ?? "active";
};

const toOrganizationRowKey = (slug: string) => `org:${normalizeSlug(slug)}`;
const toMembershipPartitionKey = (organizationId: string) => `org:${organizationId}:memberships`;
const toMembershipRowKey = (email: string) => encodeURIComponent(normalizeEmail(email));

const toOrganizationRecord = (entity: OrganizationEntity): OrganizationRecord => ({
  id: entity.id,
  slug: entity.slug,
  name: entity.name,
  rootOwnerEmail: (() => {
    const candidate = normalizeEmail(entity.rootOwnerEmail || entity.createdBy || "");
    return isEmailLike(candidate) ? candidate : "";
  })(),
  logoUrl: entity.logoUrl?.trim() ? entity.logoUrl.trim() : null,
  websiteUrl: entity.websiteUrl?.trim() ? entity.websiteUrl.trim() : null,
  contactEmail: entity.contactEmail?.trim() ? entity.contactEmail.trim().toLowerCase() : null,
  contactPhone: entity.contactPhone?.trim() ? entity.contactPhone.trim() : null,
  location: entity.location?.trim() ? entity.location.trim() : null,
  description: entity.description?.trim() ? entity.description.trim() : null,
  status: normalizeStatus(entity.status),
  createdAt: new Date(entity.createdAt).toISOString(),
  createdBy: entity.createdBy,
  updatedAt: new Date(entity.updatedAt).toISOString(),
  updatedBy: entity.updatedBy,
});

const toOrganizationMembership = (
  entity: OrganizationMembershipEntity,
): OrganizationMembership => ({
  organizationId: entity.organizationId,
  email: entity.email,
  role: normalizeRole(entity.role),
  isRootOwner: false,
  createdAt: new Date(entity.createdAt).toISOString(),
  createdBy: entity.createdBy,
  updatedAt: new Date(entity.updatedAt).toISOString(),
  updatedBy: entity.updatedBy,
  isDeleted: Boolean(entity.isDeleted),
  deletedAt: entity.deletedAt ? new Date(entity.deletedAt).toISOString() : null,
  deletedBy: entity.deletedBy ?? "",
});

const countActiveOwnerMemberships = async (organizationId: string) => {
  const tableClient = await getAppTableClient();
  const entities = tableClient.listEntities<OrganizationMembershipEntity>({
    queryOptions: {
      filter: `PartitionKey eq '${toMembershipPartitionKey(organizationId)}' and type eq '${ORGANIZATION_MEMBERSHIP_TYPE}'`,
    },
  });

  let count = 0;

  for await (const entity of entities) {
    if (!entity.isDeleted && normalizeRole(entity.role) === "owner") {
      count += 1;
    }
  }

  return count;
};

const getEarliestActiveOwnerMembershipEmail = async (
  organizationId: string,
): Promise<string | null> => {
  const tableClient = await getAppTableClient();
  const entities = tableClient.listEntities<OrganizationMembershipEntity>({
    queryOptions: {
      filter: `PartitionKey eq '${toMembershipPartitionKey(organizationId)}' and type eq '${ORGANIZATION_MEMBERSHIP_TYPE}'`,
    },
  });

  let earliestOwnerEmail: string | null = null;
  let earliestCreatedAt = Number.POSITIVE_INFINITY;

  for await (const entity of entities) {
    if (entity.isDeleted || normalizeRole(entity.role) !== "owner") {
      continue;
    }

    const candidateEmail = normalizeEmail(entity.email);
    if (!isEmailLike(candidateEmail)) {
      continue;
    }

    const createdAt = Number.isFinite(entity.createdAt) ? entity.createdAt : Date.now();
    if (createdAt < earliestCreatedAt) {
      earliestCreatedAt = createdAt;
      earliestOwnerEmail = candidateEmail;
    }
  }

  return earliestOwnerEmail;
};

export const isOrganizationSlugValid = (slug: string) => {
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug);
};

const getOrganizationEntityBySlug = async (slug: string): Promise<OrganizationEntity | null> => {
  const normalizedSlug = normalizeSlug(slug);

  if (!normalizedSlug) {
    return null;
  }

  const tableClient = await getAppTableClient();

  try {
    const entity = await tableClient.getEntity<OrganizationEntity>(
      ORGANIZATION_SCOPE,
      toOrganizationRowKey(normalizedSlug),
    );

    if (entity.type !== ORGANIZATION_TYPE) {
      return null;
    }

    return entity;
  } catch (error) {
    if (isTableNotFoundError(error)) {
      return null;
    }

    throw error;
  }
};

const getOrganizationEntityById = async (
  organizationId: string,
): Promise<OrganizationEntity | null> => {
  const normalizedOrganizationId = organizationId.trim();

  if (!normalizedOrganizationId) {
    return null;
  }

  const tableClient = await getAppTableClient();
  const entities = tableClient.listEntities<OrganizationEntity>({
    queryOptions: {
      filter: `PartitionKey eq '${ORGANIZATION_SCOPE}' and type eq '${ORGANIZATION_TYPE}' and id eq '${normalizedOrganizationId}'`,
    },
  });

  for await (const entity of entities) {
    return entity;
  }

  return null;
};

export const getOrganizationBySlug = async (slug: string): Promise<OrganizationRecord | null> => {
  const entity = await getOrganizationEntityBySlug(slug);
  return entity ? toOrganizationRecord(entity) : null;
};

export const getOrganizationById = async (
  organizationId: string,
): Promise<OrganizationRecord | null> => {
  const entity = await getOrganizationEntityById(organizationId);
  return entity ? toOrganizationRecord(entity) : null;
};

export const getOrganizationRootOwnerEmail = async (
  organizationId: string,
): Promise<string | null> => {
  const organization = await getOrganizationById(organizationId);

  if (organization?.rootOwnerEmail && isEmailLike(organization.rootOwnerEmail)) {
    return normalizeEmail(organization.rootOwnerEmail);
  }

  return getEarliestActiveOwnerMembershipEmail(organizationId);
};

export const isOrganizationSlugAvailable = async (
  slug: string,
  excludeOrganizationId?: string,
) => {
  const normalizedSlug = normalizeSlug(slug);

  if (!normalizedSlug || !isOrganizationSlugValid(normalizedSlug)) {
    return false;
  }

  const existing = await getOrganizationBySlug(normalizedSlug);

  if (!existing) {
    return true;
  }

  const normalizedExcludeId = excludeOrganizationId?.trim();
  return Boolean(normalizedExcludeId && existing.id === normalizedExcludeId);
};

export const listOrganizations = async (): Promise<OrganizationRecord[]> => {
  const tableClient = await getAppTableClient();
  const entities = tableClient.listEntities<OrganizationEntity>({
    queryOptions: {
      filter: `PartitionKey eq '${ORGANIZATION_SCOPE}' and type eq '${ORGANIZATION_TYPE}'`,
    },
  });

  const items: OrganizationRecord[] = [];

  for await (const entity of entities) {
    items.push(toOrganizationRecord(entity));
  }

  return items.sort((left, right) => left.name.localeCompare(right.name));
};

export const listOrganizationsForMemberEmail = async (
  email: string,
): Promise<UserOrganizationAccess[]> => {
  const normalizedEmail = normalizeEmail(email);

  if (!normalizedEmail) {
    return [];
  }

  const membershipRowKey = toMembershipRowKey(normalizedEmail);
  const tableClient = await getAppTableClient();
  const membershipEntities = tableClient.listEntities<OrganizationMembershipEntity>({
    queryOptions: {
      filter: `RowKey eq '${membershipRowKey}' and type eq '${ORGANIZATION_MEMBERSHIP_TYPE}'`,
    },
  });

  const membershipsByOrganization = new Map<string, OrganizationMembershipEntity>();

  for await (const entity of membershipEntities) {
    if (entity.isDeleted) {
      continue;
    }

    const existing = membershipsByOrganization.get(entity.organizationId);

    if (!existing || Number(entity.updatedAt ?? 0) > Number(existing.updatedAt ?? 0)) {
      membershipsByOrganization.set(entity.organizationId, entity);
    }
  }

  if (membershipsByOrganization.size === 0) {
    return [];
  }

  const organizations = await listOrganizations();
  const items: UserOrganizationAccess[] = [];

  for (const organization of organizations) {
    const membership = membershipsByOrganization.get(organization.id);

    if (!membership) {
      continue;
    }

    items.push({
      organization,
      role: normalizeRole(membership.role),
      isRootOwner: organization.rootOwnerEmail === normalizedEmail,
    });
  }

  return items;
};

export const createOrganization = async ({
  slug,
  name,
  ownerEmail,
  createdBy,
}: {
  slug: string;
  name: string;
  ownerEmail: string;
  createdBy: string;
}) => {
  const normalizedSlug = normalizeSlug(slug);
  const normalizedName = normalizeOrganizationName(name);
  const normalizedOwnerEmail = normalizeEmail(ownerEmail);
  const normalizedCreatedBy = normalizeEmail(createdBy);

  if (!normalizedSlug || !isOrganizationSlugValid(normalizedSlug)) {
    throw new Error("Organization slug must use lowercase letters, numbers, and hyphens only.");
  }

  if (!normalizedName) {
    throw new Error("Organization name is required.");
  }

  if (!normalizedOwnerEmail) {
    throw new Error("Owner email is required.");
  }

  if (!normalizedCreatedBy) {
    throw new Error("createdBy is required.");
  }

  const tableClient = await getAppTableClient();
  const now = Date.now();
  const id = randomUUID();

  const organizationEntity: OrganizationEntity = {
    partitionKey: ORGANIZATION_SCOPE,
    rowKey: toOrganizationRowKey(normalizedSlug),
    type: ORGANIZATION_TYPE,
    id,
    slug: normalizedSlug,
    name: normalizedName,
    rootOwnerEmail: normalizedOwnerEmail,
    logoUrl: "",
    websiteUrl: "",
    contactEmail: "",
    contactPhone: "",
    location: "",
    description: "",
    status: "active",
    createdAt: now,
    createdBy: normalizedCreatedBy,
    updatedAt: now,
    updatedBy: normalizedCreatedBy,
  };

  try {
    await tableClient.createEntity(organizationEntity);
  } catch (error) {
    if (isTableConflictError(error)) {
      throw new Error("Organization slug already exists.");
    }

    throw error;
  }

  try {
    await upsertOrganizationMembership({
      organizationId: id,
      email: normalizedOwnerEmail,
      role: "owner",
      updatedBy: normalizedCreatedBy,
    });
  } catch (error) {
    await tableClient.deleteEntity(ORGANIZATION_SCOPE, toOrganizationRowKey(normalizedSlug));
    throw error;
  }

  return {
    organization: toOrganizationRecord(organizationEntity),
    owner: await getOrganizationMembershipByEmail(id, normalizedOwnerEmail),
  };
};

export const updateOrganizationStatus = async ({
  slug,
  status,
  updatedBy,
}: {
  slug: string;
  status: OrganizationStatus;
  updatedBy: string;
}) => {
  const existing = await getOrganizationEntityBySlug(slug);

  if (!existing) {
    throw new Error("Organization not found.");
  }

  const normalizedUpdatedBy = normalizeEmail(updatedBy);

  if (!normalizedUpdatedBy) {
    throw new Error("updatedBy is required.");
  }

  const tableClient = await getAppTableClient();
  const entity: OrganizationEntity = {
    ...existing,
    status,
    updatedAt: Date.now(),
    updatedBy: normalizedUpdatedBy,
  };

  await tableClient.upsertEntity(entity, "Replace");
  return toOrganizationRecord(entity);
};

export const updateOrganizationProfile = async ({
  currentSlug,
  slug,
  name,
  logoUrl,
  websiteUrl,
  contactEmail,
  contactPhone,
  location,
  description,
  updatedBy,
}: {
  currentSlug: string;
  slug?: string;
  name?: string;
  logoUrl?: string | null;
  websiteUrl?: string | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
  location?: string | null;
  description?: string | null;
  updatedBy: string;
}) => {
  const existing = await getOrganizationEntityBySlug(currentSlug);

  if (!existing) {
    throw new Error("Organization not found.");
  }

  const normalizedUpdatedBy = normalizeEmail(updatedBy);

  if (!normalizedUpdatedBy) {
    throw new Error("updatedBy is required.");
  }

  const nextSlug = slug !== undefined ? normalizeSlug(slug) : existing.slug;

  if (!nextSlug || !isOrganizationSlugValid(nextSlug)) {
    throw new Error("Organization slug must use lowercase letters, numbers, and hyphens only.");
  }

  const nextName = name !== undefined ? normalizeOrganizationName(name) : existing.name;

  if (!nextName) {
    throw new Error("Organization name is required.");
  }

  const nextLogoUrl = logoUrl !== undefined
    ? normalizeOptionalLogoUrl(logoUrl)
    : (existing.logoUrl ?? "").trim();

  const nextWebsiteUrl = websiteUrl !== undefined
    ? normalizeOptionalUrl(websiteUrl, "Website URL")
    : (existing.websiteUrl ?? "").trim();

  const nextContactEmail = contactEmail !== undefined
    ? normalizeOptionalContactEmail(contactEmail)
    : (existing.contactEmail ?? "").trim().toLowerCase();

  const nextContactPhone = contactPhone !== undefined
    ? normalizeOptionalText(contactPhone, "Contact phone", 64)
    : (existing.contactPhone ?? "").trim();

  const nextLocation = location !== undefined
    ? normalizeOptionalText(location, "Location", 160)
    : (existing.location ?? "").trim();

  const nextDescription = description !== undefined
    ? normalizeOptionalText(description, "Description", 2000)
    : (existing.description ?? "").trim();

  const now = Date.now();
  const nextEntity: OrganizationEntity = {
    ...existing,
    slug: nextSlug,
    name: nextName,
    logoUrl: nextLogoUrl,
    websiteUrl: nextWebsiteUrl,
    contactEmail: nextContactEmail,
    contactPhone: nextContactPhone,
    location: nextLocation,
    description: nextDescription,
    updatedAt: now,
    updatedBy: normalizedUpdatedBy,
  };

  const tableClient = await getAppTableClient();
  const slugChanged = nextSlug !== existing.slug;

  if (slugChanged) {
    const nextRowKey = toOrganizationRowKey(nextSlug);

    try {
      await tableClient.createEntity<OrganizationEntity>({
        ...nextEntity,
        partitionKey: ORGANIZATION_SCOPE,
        rowKey: nextRowKey,
      });
    } catch (error) {
      if (isTableConflictError(error)) {
        throw new Error("Organization slug already exists.");
      }

      throw error;
    }

    try {
      await tableClient.deleteEntity(ORGANIZATION_SCOPE, existing.rowKey);
    } catch (error) {
      try {
        await tableClient.deleteEntity(ORGANIZATION_SCOPE, nextRowKey);
      } catch {
        // Best effort rollback if old-row cleanup fails.
      }

      throw error;
    }

    return {
      organization: toOrganizationRecord({
        ...nextEntity,
        partitionKey: ORGANIZATION_SCOPE,
        rowKey: nextRowKey,
      }),
      slugChanged,
      previousSlug: existing.slug,
    };
  }

  await tableClient.upsertEntity<OrganizationEntity>({
    ...nextEntity,
    partitionKey: ORGANIZATION_SCOPE,
    rowKey: existing.rowKey,
  }, "Replace");

  return {
    organization: toOrganizationRecord({
      ...nextEntity,
      partitionKey: ORGANIZATION_SCOPE,
      rowKey: existing.rowKey,
    }),
    slugChanged,
    previousSlug: existing.slug,
  };
};

export const listOrganizationMemberships = async (
  organizationId: string,
): Promise<OrganizationMembership[]> => {
  const normalizedOrganizationId = organizationId.trim();

  if (!normalizedOrganizationId) {
    return [];
  }

  const tableClient = await getAppTableClient();
  const rootOwnerEmail = await getOrganizationRootOwnerEmail(normalizedOrganizationId);
  const entities = tableClient.listEntities<OrganizationMembershipEntity>({
    queryOptions: {
      filter: `PartitionKey eq '${toMembershipPartitionKey(normalizedOrganizationId)}' and type eq '${ORGANIZATION_MEMBERSHIP_TYPE}'`,
    },
  });

  const items: OrganizationMembership[] = [];

  for await (const entity of entities) {
    const membership = toOrganizationMembership(entity);

    if (!membership.isDeleted) {
      items.push({
        ...membership,
        isRootOwner: Boolean(rootOwnerEmail && membership.email === rootOwnerEmail),
      });
    }
  }

  return items.sort((left, right) => left.email.localeCompare(right.email));
};

export const getOrganizationMembershipByEmail = async (
  organizationId: string,
  email: string,
): Promise<OrganizationMembership | null> => {
  const normalizedOrganizationId = organizationId.trim();
  const normalizedEmail = normalizeEmail(email);

  if (!normalizedOrganizationId || !normalizedEmail) {
    return null;
  }

  const tableClient = await getAppTableClient();

  try {
    const entity = await tableClient.getEntity<OrganizationMembershipEntity>(
      toMembershipPartitionKey(normalizedOrganizationId),
      toMembershipRowKey(normalizedEmail),
    );

    if (entity.type !== ORGANIZATION_MEMBERSHIP_TYPE) {
      return null;
    }

    const membership = toOrganizationMembership(entity);

    const rootOwnerEmail = await getOrganizationRootOwnerEmail(normalizedOrganizationId);

    const membershipWithRootFlag: OrganizationMembership = {
      ...membership,
      isRootOwner: Boolean(rootOwnerEmail && membership.email === rootOwnerEmail),
    };

    return membershipWithRootFlag.isDeleted ? null : membershipWithRootFlag;
  } catch (error) {
    if (isTableNotFoundError(error)) {
      return null;
    }

    throw error;
  }
};

export const upsertOrganizationMembership = async ({
  organizationId,
  email,
  role,
  updatedBy,
}: {
  organizationId: string;
  email: string;
  role: OrganizationRole;
  updatedBy: string;
}) => {
  const normalizedOrganizationId = organizationId.trim();
  const normalizedEmail = normalizeEmail(email);
  const normalizedUpdatedBy = normalizeEmail(updatedBy);
  const normalizedRole = normalizeRole(role);

  if (!normalizedOrganizationId) {
    throw new Error("organizationId is required.");
  }

  if (!normalizedEmail) {
    throw new Error("Email is required.");
  }

  if (!normalizedUpdatedBy) {
    throw new Error("updatedBy is required.");
  }

  const existing = await getOrganizationMembershipByEmail(normalizedOrganizationId, normalizedEmail);
  const now = Date.now();
  const tableClient = await getAppTableClient();

  const entity: OrganizationMembershipEntity = {
    partitionKey: toMembershipPartitionKey(normalizedOrganizationId),
    rowKey: toMembershipRowKey(normalizedEmail),
    type: ORGANIZATION_MEMBERSHIP_TYPE,
    organizationId: normalizedOrganizationId,
    email: normalizedEmail,
    role: normalizedRole,
    createdAt: existing ? Date.parse(existing.createdAt) || now : now,
    createdBy: existing?.createdBy || normalizedUpdatedBy,
    updatedAt: now,
    updatedBy: normalizedUpdatedBy,
    isDeleted: false,
    deletedAt: 0,
    deletedBy: "",
  };

  await tableClient.upsertEntity(entity, "Replace");

  const membership = await getOrganizationMembershipByEmail(
    normalizedOrganizationId,
    normalizedEmail,
  );

  if (!membership) {
    throw new Error("Failed to save organization membership.");
  }

  return membership;
};

export const removeOrganizationMembership = async ({
  organizationId,
  email,
  removedBy,
}: {
  organizationId: string;
  email: string;
  removedBy: string;
}) => {
  const normalizedOrganizationId = organizationId.trim();
  const normalizedEmail = normalizeEmail(email);
  const normalizedRemovedBy = normalizeEmail(removedBy);

  if (!normalizedOrganizationId) {
    throw new Error("organizationId is required.");
  }

  if (!normalizedEmail) {
    throw new Error("Email is required.");
  }

  if (!normalizedRemovedBy) {
    throw new Error("removedBy is required.");
  }

  const existing = await getOrganizationMembershipByEmail(normalizedOrganizationId, normalizedEmail);

  if (!existing) {
    throw new Error("Organization membership not found.");
  }

  const rootOwnerEmail = await getOrganizationRootOwnerEmail(normalizedOrganizationId);

  if (rootOwnerEmail && existing.email === rootOwnerEmail) {
    throw new Error("Root owner cannot be removed. Transfer root ownership first.");
  }

  if (existing.role === "owner") {
    const ownerCount = await countActiveOwnerMemberships(normalizedOrganizationId);

    if (ownerCount <= 1) {
      throw new Error("Cannot remove the last remaining organization owner.");
    }
  }

  const tableClient = await getAppTableClient();
  await tableClient.upsertEntity<OrganizationMembershipEntity>({
    partitionKey: toMembershipPartitionKey(normalizedOrganizationId),
    rowKey: toMembershipRowKey(normalizedEmail),
    type: ORGANIZATION_MEMBERSHIP_TYPE,
    organizationId: normalizedOrganizationId,
    email: existing.email,
    role: existing.role,
    createdAt: Date.parse(existing.createdAt) || Date.now(),
    createdBy: existing.createdBy,
    updatedAt: Date.now(),
    updatedBy: normalizedRemovedBy,
    isDeleted: true,
    deletedAt: Date.now(),
    deletedBy: normalizedRemovedBy,
  }, "Replace");
};

export const transferOrganizationRootOwnership = async ({
  organizationId,
  newRootOwnerEmail,
  transferredBy,
}: {
  organizationId: string;
  newRootOwnerEmail: string;
  transferredBy: string;
}): Promise<{ previousRootOwnerEmail: string; newRootOwnerEmail: string }> => {
  const normalizedOrganizationId = organizationId.trim();
  const normalizedNewRootOwnerEmail = normalizeEmail(newRootOwnerEmail);
  const normalizedTransferredBy = normalizeEmail(transferredBy);

  if (!normalizedOrganizationId) {
    throw new Error("organizationId is required.");
  }

  if (!normalizedNewRootOwnerEmail) {
    throw new Error("newRootOwnerEmail is required.");
  }

  if (!normalizedTransferredBy) {
    throw new Error("transferredBy is required.");
  }

  const organizationEntity = await getOrganizationEntityById(normalizedOrganizationId);

  if (!organizationEntity) {
    throw new Error("Organization not found.");
  }

  const previousRootOwnerEmail = await getOrganizationRootOwnerEmail(normalizedOrganizationId);

  if (!previousRootOwnerEmail) {
    throw new Error("Organization root owner is not configured.");
  }

  if (previousRootOwnerEmail === normalizedNewRootOwnerEmail) {
    throw new Error("Selected member is already the root owner.");
  }

  const nextRootMembership = await getOrganizationMembershipByEmail(
    normalizedOrganizationId,
    normalizedNewRootOwnerEmail,
  );

  if (!nextRootMembership) {
    throw new Error("Target user must be an active organization member.");
  }

  if (nextRootMembership.role !== "owner") {
    throw new Error("Target user must have the owner role before ownership transfer.");
  }

  const tableClient = await getAppTableClient();
  const updatedEntity: OrganizationEntity = {
    ...organizationEntity,
    rootOwnerEmail: normalizedNewRootOwnerEmail,
    updatedAt: Date.now(),
    updatedBy: normalizedTransferredBy,
  };

  await tableClient.upsertEntity(updatedEntity, "Replace");

  return {
    previousRootOwnerEmail,
    newRootOwnerEmail: normalizedNewRootOwnerEmail,
  };
};

export const resolveOrganizationAccess = async ({
  slug,
  email,
}: {
  slug: string;
  email: string;
}) => {
  const organization = await getOrganizationBySlug(slug);

  if (!organization) {
    return {
      organization: null,
      membership: null,
    };
  }

  const membership = await getOrganizationMembershipByEmail(
    organization.id,
    email,
  );

  return {
    organization,
    membership,
  };
};