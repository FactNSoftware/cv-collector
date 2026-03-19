import { getAppTableClient, isTableNotFoundError } from "./azure-tables";
import { buildPageInfo, type PageInfo } from "./pagination";

const CANDIDATE_SCOPE = "candidate";
const CANDIDATE_PROFILE_TYPE = "profile";

export type CandidateProfile = {
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  idOrPassportNumber: string;
  createdAt: string | null;
  updatedAt: string | null;
};

export type CandidateProfilePage = {
  items: CandidateProfile[];
  pageInfo: PageInfo;
};

type CandidateProfileEntity = {
  partitionKey: string;
  rowKey: string;
  type: string;
  email: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  idOrPassportNumber?: string;
  createdAt: number;
  updatedAt: number;
};

type UpsertCandidateProfileInput = {
  email: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  idOrPassportNumber?: string;
};

const toRowKey = (email: string) => encodeURIComponent(email.trim().toLowerCase());

const toProfile = (entity: CandidateProfileEntity): CandidateProfile => ({
  email: entity.email,
  firstName: entity.firstName ?? "",
  lastName: entity.lastName ?? "",
  phone: entity.phone ?? "",
  idOrPassportNumber: entity.idOrPassportNumber ?? "",
  createdAt: Number.isFinite(entity.createdAt) && entity.createdAt > 0
    ? new Date(entity.createdAt).toISOString()
    : null,
  updatedAt: Number.isFinite(entity.updatedAt) && entity.updatedAt > 0
    ? new Date(entity.updatedAt).toISOString()
    : null,
});

export const getCandidateProfileByEmail = async (
  email: string,
): Promise<CandidateProfile | null> => {
  const normalizedEmail = email.trim().toLowerCase();

  if (!normalizedEmail) {
    return null;
  }

  const tableClient = await getAppTableClient();

  try {
    const entity = await tableClient.getEntity<CandidateProfileEntity>(
      CANDIDATE_SCOPE,
      toRowKey(normalizedEmail),
    );

    if (entity.type !== CANDIDATE_PROFILE_TYPE) {
      return null;
    }

    return toProfile(entity);
  } catch (error) {
    if (isTableNotFoundError(error)) {
      return null;
    }

    throw error;
  }
};

export const ensureCandidateProfile = async (email: string) => {
  const normalizedEmail = email.trim().toLowerCase();

  if (!normalizedEmail) {
    throw new Error("Email is required to create a candidate profile.");
  }

  const existing = await getCandidateProfileByEmail(normalizedEmail);

  if (existing) {
    return existing;
  }

  const tableClient = await getAppTableClient();
  const now = Date.now();

  await tableClient.upsertEntity<CandidateProfileEntity>({
    partitionKey: CANDIDATE_SCOPE,
    rowKey: toRowKey(normalizedEmail),
    type: CANDIDATE_PROFILE_TYPE,
    email: normalizedEmail,
    firstName: "",
    lastName: "",
    phone: "",
    idOrPassportNumber: "",
    createdAt: now,
    updatedAt: now,
  }, "Replace");

  return {
    email: normalizedEmail,
    firstName: "",
    lastName: "",
    phone: "",
    idOrPassportNumber: "",
    createdAt: new Date(now).toISOString(),
    updatedAt: new Date(now).toISOString(),
  } satisfies CandidateProfile;
};

export const upsertCandidateProfile = async (
  input: UpsertCandidateProfileInput,
): Promise<CandidateProfile> => {
  const normalizedEmail = input.email.trim().toLowerCase();

  if (!normalizedEmail) {
    throw new Error("Email is required to update a candidate profile.");
  }

  const tableClient = await getAppTableClient();
  const now = Date.now();
  const current = await getCandidateProfileByEmail(normalizedEmail);

  const entity: CandidateProfileEntity = {
    partitionKey: CANDIDATE_SCOPE,
    rowKey: toRowKey(normalizedEmail),
    type: CANDIDATE_PROFILE_TYPE,
    email: normalizedEmail,
    firstName: input.firstName?.trim() ?? current?.firstName ?? "",
    lastName: input.lastName?.trim() ?? current?.lastName ?? "",
    phone: input.phone?.trim() ?? current?.phone ?? "",
    idOrPassportNumber: input.idOrPassportNumber?.trim() ?? current?.idOrPassportNumber ?? "",
    createdAt: current?.createdAt ? Date.parse(current.createdAt) || now : now,
    updatedAt: now,
  };

  await tableClient.upsertEntity(entity, "Replace");

  return toProfile(entity);
};

export const listCandidateProfiles = async (): Promise<CandidateProfile[]> => {
  const tableClient = await getAppTableClient();
  const entities = tableClient.listEntities<CandidateProfileEntity>({
    queryOptions: {
      filter: `PartitionKey eq '${CANDIDATE_SCOPE}' and type eq '${CANDIDATE_PROFILE_TYPE}'`,
    },
  });

  const items: CandidateProfile[] = [];

  for await (const entity of entities) {
    items.push(toProfile(entity));
  }

  return items.sort((left, right) => left.email.localeCompare(right.email));
};

export const listCandidateProfilesPage = async (
  limit: number,
  cursor?: string,
): Promise<CandidateProfilePage> => {
  const tableClient = await getAppTableClient();
  const pages = tableClient.listEntities<CandidateProfileEntity>({
    queryOptions: {
      filter: `PartitionKey eq '${CANDIDATE_SCOPE}' and type eq '${CANDIDATE_PROFILE_TYPE}'`,
    },
  }).byPage({
    continuationToken: cursor || undefined,
    maxPageSize: limit,
  });

  for await (const page of pages) {
    const items = [...page]
      .map((entity) => toProfile(entity))
      .sort((left, right) => left.email.localeCompare(right.email));

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
