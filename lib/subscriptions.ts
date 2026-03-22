import { randomUUID } from "crypto";
import {
  getAppTableClient,
  isTableConflictError,
  isTableNotFoundError,
} from "./azure-tables";
import {
  getFeatureCatalogRecord,
  getFeatureByFunctionalityKey,
  getFunctionalityRecord,
  getLegacyDefaultFeatureKeys,
  getLegacyDefaultFunctionalityKeys,
  isFunctionalityStatusAssignable,
  isFeatureStatusAssignable,
  listAssignableFeatures,
  listAssignableFunctionalities,
  listFeatureCatalog,
  type FeatureCatalogRecord,
} from "./feature-catalog";
import { getOrganizationById, listOrganizations, type OrganizationRecord } from "./organizations";

const SUBSCRIPTION_SCOPE = "system:subscriptions";
const SUBSCRIPTION_ASSIGNMENT_SCOPE = "system:subscription-assignments";
const SUBSCRIPTION_TYPE = "subscription";
const SUBSCRIPTION_ASSIGNMENT_TYPE = "subscription-assignment";

export const SUBSCRIPTION_VISIBILITIES = ["public", "private", "internal"] as const;
export const SUBSCRIPTION_STATUSES = ["active", "archived"] as const;

type SubscriptionEntity = {
  partitionKey: string;
  rowKey: string;
  type: string;
  id: string;
  name: string;
  description?: string;
  visibility: string;
  status: string;
  isDefaultPublic?: boolean;
  featureKeysJson?: string;
  functionalityKeysJson?: string;
  createdAt: number;
  createdBy: string;
  updatedAt: number;
  updatedBy: string;
};

type SubscriptionAssignmentEntity = {
  partitionKey: string;
  rowKey: string;
  type: string;
  organizationId: string;
  subscriptionId: string;
  assignedAt: number;
  assignedBy: string;
  updatedAt: number;
  updatedBy: string;
};

export type SubscriptionVisibility = (typeof SUBSCRIPTION_VISIBILITIES)[number];
export type SubscriptionStatus = (typeof SUBSCRIPTION_STATUSES)[number];

export type SubscriptionRecord = {
  id: string;
  name: string;
  description: string | null;
  visibility: SubscriptionVisibility;
  status: SubscriptionStatus;
  isDefaultPublic: boolean;
  featureKeys: string[];
  functionalityKeys: string[];
  createdAt: string;
  createdBy: string;
  updatedAt: string;
  updatedBy: string;
};

export type OrganizationSubscriptionAssignmentRecord = {
  organizationId: string;
  subscriptionId: string;
  assignedAt: string;
  assignedBy: string;
  updatedAt: string;
  updatedBy: string;
};

export type OrganizationSubscriptionAssignmentDetail = {
  organization: OrganizationRecord;
  assignment: OrganizationSubscriptionAssignmentRecord | null;
  subscription: SubscriptionRecord | null;
  featureKeys: string[];
  functionalityKeys: string[];
  source: "subscription" | "legacy_default";
};

export type EffectiveOrganizationSubscriptionAccess = {
  assignment: OrganizationSubscriptionAssignmentRecord | null;
  subscription: SubscriptionRecord | null;
  featureKeys: string[];
  functionalityKeys: string[];
  source: "subscription" | "legacy_default";
};

const normalizeValue = (value: string | undefined | null) => (typeof value === "string" ? value.trim() : "");

const normalizeVisibility = (value: string | undefined): SubscriptionVisibility => {
  return SUBSCRIPTION_VISIBILITIES.find((item) => item === value) ?? "private";
};

const normalizeStatus = (value: string | undefined): SubscriptionStatus => {
  return SUBSCRIPTION_STATUSES.find((item) => item === value) ?? "active";
};

const toSubscriptionRowKey = (subscriptionId: string) => `subscription:${subscriptionId}`;
const toAssignmentRowKey = (organizationId: string) => `organization:${organizationId}`;

const parseFeatureKeys = (value: string | undefined): string[] => {
  if (!value) {
    return [];
  }

  try {
    const parsed = JSON.parse(value) as unknown;

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .filter((item): item is string => typeof item === "string")
      .map((item) => item.trim())
      .filter(Boolean)
      .sort();
  } catch {
    return [];
  }
};

const serializeFeatureKeys = (featureKeys: string[]) => JSON.stringify(featureKeys);

const normalizeFeatureKeys = (featureKeys: string[]) => {
  const assignableFeatures = new Set(listAssignableFeatures().map((feature) => feature.key));
  const normalizedKeys = [...new Set(featureKeys.map((item) => item.trim()).filter(Boolean))].sort();

  for (const key of normalizedKeys) {
    const feature = getFeatureCatalogRecord(key);

    if (!feature) {
      throw new Error(`Unknown feature key: ${key}.`);
    }

    if (!assignableFeatures.has(key) || !isFeatureStatusAssignable(feature.status)) {
      throw new Error(`Feature ${key} is not assignable yet.`);
    }
  }

  return normalizedKeys;
};

const normalizeFunctionalityKeys = (
  featureKeys: string[],
  functionalityKeys: string[],
) => {
  const selectedFeatureKeys = new Set(featureKeys);
  const normalizedFunctionalityKeys = [...new Set(functionalityKeys.map((item) => item.trim()).filter(Boolean))].sort();

  for (const functionalityKey of normalizedFunctionalityKeys) {
    const functionality = getFunctionalityRecord(functionalityKey);
    const parentFeature = getFeatureByFunctionalityKey(functionalityKey);

    if (!functionality || !parentFeature) {
      throw new Error(`Unknown functionality key: ${functionalityKey}.`);
    }

    if (!selectedFeatureKeys.has(parentFeature.key)) {
      throw new Error(`Functionality ${functionalityKey} requires feature ${parentFeature.key}.`);
    }

    if (!isFunctionalityStatusAssignable(functionality.status)) {
      throw new Error(`Functionality ${functionalityKey} is not assignable yet.`);
    }
  }

  const resolvedFunctionalityKeys = new Set(normalizedFunctionalityKeys);

  for (const featureKey of featureKeys) {
    const featureFunctionalityKeys = listAssignableFunctionalities(featureKey).map((item) => item.key);
    const hasAnySelection = featureFunctionalityKeys.some((key) => resolvedFunctionalityKeys.has(key));

    if (!hasAnySelection) {
      for (const functionalityKey of featureFunctionalityKeys) {
        resolvedFunctionalityKeys.add(functionalityKey);
      }
    }
  }

  return [...resolvedFunctionalityKeys].sort();
};

const toSubscriptionRecord = (entity: SubscriptionEntity): SubscriptionRecord => {
  const featureKeys = parseFeatureKeys(entity.featureKeysJson);
  const functionalityKeys = normalizeFunctionalityKeys(
    featureKeys,
    parseFeatureKeys(entity.functionalityKeysJson),
  );

  return {
    id: entity.id,
    name: entity.name,
    description: normalizeValue(entity.description) || null,
    visibility: normalizeVisibility(entity.visibility),
    status: normalizeStatus(entity.status),
    isDefaultPublic: Boolean(entity.isDefaultPublic),
    featureKeys,
    functionalityKeys,
    createdAt: new Date(entity.createdAt).toISOString(),
    createdBy: entity.createdBy,
    updatedAt: new Date(entity.updatedAt).toISOString(),
    updatedBy: entity.updatedBy,
  };
};

const toAssignmentRecord = (
  entity: SubscriptionAssignmentEntity,
): OrganizationSubscriptionAssignmentRecord => ({
  organizationId: entity.organizationId,
  subscriptionId: entity.subscriptionId,
  assignedAt: new Date(entity.assignedAt).toISOString(),
  assignedBy: entity.assignedBy,
  updatedAt: new Date(entity.updatedAt).toISOString(),
  updatedBy: entity.updatedBy,
});

const getSubscriptionEntityById = async (
  subscriptionId: string,
): Promise<SubscriptionEntity | null> => {
  const normalizedId = normalizeValue(subscriptionId);

  if (!normalizedId) {
    return null;
  }

  const tableClient = await getAppTableClient();

  try {
    const entity = await tableClient.getEntity<SubscriptionEntity>(
      SUBSCRIPTION_SCOPE,
      toSubscriptionRowKey(normalizedId),
    );

    if (entity.type !== SUBSCRIPTION_TYPE) {
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

const getAssignmentEntityByOrganizationId = async (
  organizationId: string,
): Promise<SubscriptionAssignmentEntity | null> => {
  const normalizedOrganizationId = normalizeValue(organizationId);

  if (!normalizedOrganizationId) {
    return null;
  }

  const tableClient = await getAppTableClient();

  try {
    const entity = await tableClient.getEntity<SubscriptionAssignmentEntity>(
      SUBSCRIPTION_ASSIGNMENT_SCOPE,
      toAssignmentRowKey(normalizedOrganizationId),
    );

    if (entity.type !== SUBSCRIPTION_ASSIGNMENT_TYPE) {
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

const clearDefaultPublicFlag = async (excludeSubscriptionId?: string) => {
  const subscriptions = await listSubscriptions();

  if (subscriptions.length === 0) {
    return;
  }

  const tableClient = await getAppTableClient();

  for (const subscription of subscriptions) {
    if (!subscription.isDefaultPublic || subscription.id === excludeSubscriptionId) {
      continue;
    }

    const existing = await getSubscriptionEntityById(subscription.id);

    if (!existing) {
      continue;
    }

    await tableClient.upsertEntity<SubscriptionEntity>({
      ...existing,
      isDefaultPublic: false,
      updatedAt: Date.now(),
    }, "Replace");
  }
};

export const listSubscriptions = async (): Promise<SubscriptionRecord[]> => {
  const tableClient = await getAppTableClient();
  const entities = tableClient.listEntities<SubscriptionEntity>({
    queryOptions: {
      filter: `PartitionKey eq '${SUBSCRIPTION_SCOPE}' and type eq '${SUBSCRIPTION_TYPE}'`,
    },
  });

  const items: SubscriptionRecord[] = [];

  for await (const entity of entities) {
    items.push(toSubscriptionRecord(entity));
  }

  return items.sort((left, right) => left.name.localeCompare(right.name));
};

export const getSubscriptionById = async (
  subscriptionId: string,
): Promise<SubscriptionRecord | null> => {
  const entity = await getSubscriptionEntityById(subscriptionId);
  return entity ? toSubscriptionRecord(entity) : null;
};

export const createSubscription = async ({
  name,
  description,
  visibility,
  status,
  isDefaultPublic,
  featureKeys,
  functionalityKeys,
  createdBy,
}: {
  name: string;
  description?: string | null;
  visibility?: SubscriptionVisibility;
  status?: SubscriptionStatus;
  isDefaultPublic?: boolean;
  featureKeys: string[];
  functionalityKeys?: string[];
  createdBy: string;
}) => {
  const normalizedName = normalizeValue(name);
  const normalizedDescription = normalizeValue(description);
  const normalizedCreatedBy = normalizeValue(createdBy).toLowerCase();
  const resolvedVisibility = normalizeVisibility(visibility);
  const resolvedStatus = normalizeStatus(status);
  const resolvedIsDefaultPublic = Boolean(isDefaultPublic);
  const normalizedFeatureKeys = normalizeFeatureKeys(featureKeys);
  const normalizedFunctionalityKeys = normalizeFunctionalityKeys(
    normalizedFeatureKeys,
    functionalityKeys ?? [],
  );

  if (!normalizedName) {
    throw new Error("Subscription name is required.");
  }

  if (!normalizedCreatedBy) {
    throw new Error("createdBy is required.");
  }

  if (resolvedIsDefaultPublic && resolvedVisibility !== "public") {
    throw new Error("Only public subscriptions can be marked as the default public plan.");
  }

  if (resolvedIsDefaultPublic) {
    await clearDefaultPublicFlag();
  }

  const now = Date.now();
  const id = randomUUID();
  const entity: SubscriptionEntity = {
    partitionKey: SUBSCRIPTION_SCOPE,
    rowKey: toSubscriptionRowKey(id),
    type: SUBSCRIPTION_TYPE,
    id,
    name: normalizedName,
    description: normalizedDescription,
    visibility: resolvedVisibility,
    status: resolvedStatus,
    isDefaultPublic: resolvedIsDefaultPublic,
    featureKeysJson: serializeFeatureKeys(normalizedFeatureKeys),
    functionalityKeysJson: serializeFeatureKeys(normalizedFunctionalityKeys),
    createdAt: now,
    createdBy: normalizedCreatedBy,
    updatedAt: now,
    updatedBy: normalizedCreatedBy,
  };

  const tableClient = await getAppTableClient();

  try {
    await tableClient.createEntity(entity);
  } catch (error) {
    if (isTableConflictError(error)) {
      throw new Error("Subscription already exists.");
    }

    throw error;
  }

  return toSubscriptionRecord(entity);
};

export const updateSubscription = async ({
  id,
  name,
  description,
  visibility,
  status,
  isDefaultPublic,
  featureKeys,
  functionalityKeys,
  updatedBy,
}: {
  id: string;
  name?: string;
  description?: string | null;
  visibility?: SubscriptionVisibility;
  status?: SubscriptionStatus;
  isDefaultPublic?: boolean;
  featureKeys?: string[];
  functionalityKeys?: string[];
  updatedBy: string;
}) => {
  const existing = await getSubscriptionEntityById(id);

  if (!existing) {
    throw new Error("Subscription not found.");
  }

  const normalizedUpdatedBy = normalizeValue(updatedBy).toLowerCase();

  if (!normalizedUpdatedBy) {
    throw new Error("updatedBy is required.");
  }

  const nextName = name !== undefined ? normalizeValue(name) : existing.name;
  const nextDescription = description !== undefined ? normalizeValue(description) : normalizeValue(existing.description);
  const nextVisibility = visibility !== undefined ? normalizeVisibility(visibility) : normalizeVisibility(existing.visibility);
  const nextStatus = status !== undefined ? normalizeStatus(status) : normalizeStatus(existing.status);
  const nextIsDefaultPublic = isDefaultPublic !== undefined ? Boolean(isDefaultPublic) : Boolean(existing.isDefaultPublic);
  const nextFeatureKeys = featureKeys !== undefined
    ? normalizeFeatureKeys(featureKeys)
    : parseFeatureKeys(existing.featureKeysJson);
  const nextFunctionalityKeys = normalizeFunctionalityKeys(
    nextFeatureKeys,
    functionalityKeys !== undefined
      ? functionalityKeys
      : parseFeatureKeys(existing.functionalityKeysJson),
  );

  if (!nextName) {
    throw new Error("Subscription name is required.");
  }

  if (nextIsDefaultPublic && nextVisibility !== "public") {
    throw new Error("Only public subscriptions can be marked as the default public plan.");
  }

  if (nextIsDefaultPublic) {
    await clearDefaultPublicFlag(existing.id);
  }

  const entity: SubscriptionEntity = {
    ...existing,
    name: nextName,
    description: nextDescription,
    visibility: nextVisibility,
    status: nextStatus,
    isDefaultPublic: nextIsDefaultPublic,
    featureKeysJson: serializeFeatureKeys(nextFeatureKeys),
    functionalityKeysJson: serializeFeatureKeys(nextFunctionalityKeys),
    updatedAt: Date.now(),
    updatedBy: normalizedUpdatedBy,
  };

  const tableClient = await getAppTableClient();
  await tableClient.upsertEntity(entity, "Replace");

  return toSubscriptionRecord(entity);
};

export const listOrganizationSubscriptionAssignments = async (): Promise<OrganizationSubscriptionAssignmentRecord[]> => {
  const tableClient = await getAppTableClient();
  const entities = tableClient.listEntities<SubscriptionAssignmentEntity>({
    queryOptions: {
      filter: `PartitionKey eq '${SUBSCRIPTION_ASSIGNMENT_SCOPE}' and type eq '${SUBSCRIPTION_ASSIGNMENT_TYPE}'`,
    },
  });

  const items: OrganizationSubscriptionAssignmentRecord[] = [];

  for await (const entity of entities) {
    items.push(toAssignmentRecord(entity));
  }

  return items.sort((left, right) => left.organizationId.localeCompare(right.organizationId));
};

export const getOrganizationSubscriptionAssignment = async (
  organizationId: string,
): Promise<OrganizationSubscriptionAssignmentRecord | null> => {
  const entity = await getAssignmentEntityByOrganizationId(organizationId);
  return entity ? toAssignmentRecord(entity) : null;
};

export const assignSubscriptionToOrganization = async ({
  organizationId,
  subscriptionId,
  assignedBy,
}: {
  organizationId: string;
  subscriptionId: string | null;
  assignedBy: string;
}) => {
  const normalizedOrganizationId = normalizeValue(organizationId);
  const normalizedAssignedBy = normalizeValue(assignedBy).toLowerCase();

  if (!normalizedOrganizationId) {
    throw new Error("organizationId is required.");
  }

  if (!normalizedAssignedBy) {
    throw new Error("assignedBy is required.");
  }

  const organization = await getOrganizationById(normalizedOrganizationId);

  if (!organization) {
    throw new Error("Organization not found.");
  }

  const tableClient = await getAppTableClient();
  const existing = await getAssignmentEntityByOrganizationId(normalizedOrganizationId);

  if (!subscriptionId) {
    if (existing) {
      await tableClient.deleteEntity(existing.partitionKey, existing.rowKey);
    }

    return null;
  }

  const normalizedSubscriptionId = normalizeValue(subscriptionId);
  const subscription = await getSubscriptionById(normalizedSubscriptionId);

  if (!subscription) {
    throw new Error("Subscription not found.");
  }

  if (subscription.status !== "active") {
    throw new Error("Only active subscriptions can be assigned.");
  }

  const now = Date.now();
  const entity: SubscriptionAssignmentEntity = {
    partitionKey: SUBSCRIPTION_ASSIGNMENT_SCOPE,
    rowKey: toAssignmentRowKey(normalizedOrganizationId),
    type: SUBSCRIPTION_ASSIGNMENT_TYPE,
    organizationId: normalizedOrganizationId,
    subscriptionId: normalizedSubscriptionId,
    assignedAt: existing?.assignedAt ?? now,
    assignedBy: existing?.assignedBy ?? normalizedAssignedBy,
    updatedAt: now,
    updatedBy: normalizedAssignedBy,
  };

  await tableClient.upsertEntity(entity, "Replace");

  return toAssignmentRecord(entity);
};

export const getDefaultPublicSubscription = async (): Promise<SubscriptionRecord | null> => {
  const subscriptions = await listSubscriptions();

  return subscriptions.find((subscription) =>
    subscription.visibility === "public"
      && subscription.status === "active"
      && subscription.isDefaultPublic,
  ) ?? null;
};

export const assignDefaultPublicSubscriptionToOrganizationIfAvailable = async ({
  organizationId,
  assignedBy,
}: {
  organizationId: string;
  assignedBy: string;
}) => {
  const subscription = await getDefaultPublicSubscription();

  if (!subscription) {
    return null;
  }

  return assignSubscriptionToOrganization({
    organizationId,
    subscriptionId: subscription.id,
    assignedBy,
  });
};

export const resolveOrganizationSubscriptionAccess = async (
  organizationId: string,
): Promise<EffectiveOrganizationSubscriptionAccess> => {
  const assignment = await getOrganizationSubscriptionAssignment(organizationId);

  if (!assignment) {
    return {
      assignment: null,
      subscription: null,
      featureKeys: getLegacyDefaultFeatureKeys(),
      functionalityKeys: getLegacyDefaultFunctionalityKeys(),
      source: "legacy_default",
    };
  }

  const subscription = await getSubscriptionById(assignment.subscriptionId);

  if (!subscription) {
    return {
      assignment,
      subscription: null,
      featureKeys: getLegacyDefaultFeatureKeys(),
      functionalityKeys: getLegacyDefaultFunctionalityKeys(),
      source: "legacy_default",
    };
  }

  return {
    assignment,
    subscription,
    featureKeys: subscription.featureKeys,
    functionalityKeys: subscription.functionalityKeys,
    source: "subscription",
  };
};

export const listOrganizationSubscriptionAssignmentDetails = async (): Promise<
  OrganizationSubscriptionAssignmentDetail[]
> => {
  const [organizations, assignments, subscriptions] = await Promise.all([
    listOrganizations(),
    listOrganizationSubscriptionAssignments(),
    listSubscriptions(),
  ]);

  const assignmentsByOrganizationId = new Map(assignments.map((item) => [item.organizationId, item]));
  const subscriptionsById = new Map(subscriptions.map((item) => [item.id, item]));

  return organizations.map((organization) => {
    const assignment = assignmentsByOrganizationId.get(organization.id) ?? null;
    const subscription = assignment ? subscriptionsById.get(assignment.subscriptionId) ?? null : null;

    return {
      organization,
        assignment,
        subscription,
        featureKeys: subscription?.featureKeys ?? getLegacyDefaultFeatureKeys(),
        functionalityKeys: subscription?.functionalityKeys ?? getLegacyDefaultFunctionalityKeys(),
        source: subscription ? "subscription" : "legacy_default",
      };
  });
};

export const listFeatureCatalogSummary = (): {
  all: FeatureCatalogRecord[];
  assignable: FeatureCatalogRecord[];
  upcoming: FeatureCatalogRecord[];
} => {
  const all = listFeatureCatalog();
  return {
    all,
    assignable: listAssignableFeatures(),
    upcoming: all.filter(
      (feature) => feature.subscriptionSelectable && !isFeatureStatusAssignable(feature.status),
    ),
  };
};
