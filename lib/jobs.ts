import { randomUUID } from "crypto";
import { getAppTableClient, isTableNotFoundError } from "./azure-tables";
import { buildPageInfo, type PageInfo } from "./pagination";

const JOB_SCOPE = "job";
const JOB_TYPE = "job";
const JOB_CODE_PREFIX = "JN";

export const EMPLOYMENT_TYPES = [
  "Full-time",
  "Part-time",
  "Contract",
  "Internship",
  "Temporary",
  "Freelance",
] as const;

export const WORKPLACE_TYPES = [
  "On-site",
  "Hybrid",
  "Remote",
] as const;

export const EXPERIENCE_LEVELS = [
  "Entry level",
  "Associate",
  "Mid level",
  "Senior",
  "Lead",
  "Manager",
] as const;

export const SALARY_CURRENCIES = [
  "LKR",
  "USD",
] as const;

export const DEFAULT_JOB_MAX_RETRY_ATTEMPTS = 0;

export type EmploymentType = (typeof EMPLOYMENT_TYPES)[number];
export type WorkplaceType = (typeof WORKPLACE_TYPES)[number];
export type ExperienceLevel = (typeof EXPERIENCE_LEVELS)[number];
export type SalaryCurrency = (typeof SALARY_CURRENCIES)[number];

type JobEntity = {
  partitionKey: string;
  rowKey: string;
  type: string;
  code?: string;
  title: string;
  summary?: string;
  description?: string;
  descriptionHtml?: string;
  department?: string;
  location?: string;
  employmentType?: string;
  workplaceType?: string;
  experienceLevel?: string;
  salaryCurrency?: string;
  salaryRange?: string;
  vacancies?: number;
  maxRetryAttempts?: number;
  atsEnabled?: boolean;
  atsRequiredKeywordsJson?: string;
  atsPreferredKeywordsJson?: string;
  atsMinimumYearsExperience?: number;
  atsRequiredEducationJson?: string;
  atsRequiredCertificationsJson?: string;
  closingDate?: string;
  requirements?: string;
  benefits?: string;
  isPublished: boolean;
  createdAt: number;
  updatedAt: number;
  isDeleted?: boolean;
  deletedAt?: number;
  deletedBy?: string;
};

export type JobRecord = {
  id: string;
  code: string;
  title: string;
  summary: string;
  descriptionHtml: string;
  department: string;
  location: string;
  employmentType: EmploymentType;
  workplaceType: WorkplaceType;
  experienceLevel: ExperienceLevel;
  salaryCurrency: SalaryCurrency;
  salaryRange: string;
  vacancies: number | null;
  maxRetryAttempts: number;
  atsEnabled: boolean;
  atsRequiredKeywords: string[];
  atsPreferredKeywords: string[];
  atsMinimumYearsExperience: number | null;
  atsRequiredEducation: string[];
  atsRequiredCertifications: string[];
  closingDate: string;
  requirements: string;
  benefits: string;
  isPublished: boolean;
  isDeleted: boolean;
  deletedAt: string | null;
  deletedBy: string;
  createdAt: string;
  updatedAt: string;
};

export type JobRecordPage = {
  items: JobRecord[];
  pageInfo: PageInfo;
};

export type UpsertJobInput = {
  id?: string;
  title: string;
  summary?: string;
  descriptionHtml?: string;
  department?: string;
  location?: string;
  employmentType?: string;
  workplaceType?: string;
  experienceLevel?: string;
  salaryCurrency?: string;
  salaryRange?: string;
  vacancies?: number | null;
  maxRetryAttempts?: number | null;
  atsEnabled?: boolean;
  atsRequiredKeywords?: string[];
  atsPreferredKeywords?: string[];
  atsMinimumYearsExperience?: number | null;
  atsRequiredEducation?: string[];
  atsRequiredCertifications?: string[];
  closingDate?: string;
  requirements?: string;
  benefits?: string;
  isPublished: boolean;
};

const toRowKey = (id: string) => `job:${id}`;

const normalizeText = (value: string | undefined) => {
  return value?.trim() ?? "";
};

const stripHtml = (value: string) => {
  return value
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|li|h1|h2|h3|h4|blockquote)>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
};

const sanitizeRichHtml = (value: string | undefined) => {
  const normalized = normalizeText(value);

  if (!normalized) {
    return "";
  }

  return normalized
    .replace(/<(script|style|iframe|object|embed|form)[^>]*>[\s\S]*?<\/\1>/gi, "")
    .replace(/\son[a-z]+\s*=\s*(".*?"|'.*?'|[^\s>]+)/gi, "")
    .replace(/\s(href|src)\s*=\s*(['"])\s*javascript:[^'"]*\2/gi, "")
    .replace(/<(?!\/?(p|br|strong|em|u|ul|ol|li|a|img|h1|h2|h3|blockquote)\b)[^>]*>/gi, "")
    .replace(/<a\b([^>]*)>/gi, (_match, attrs: string) => {
      const href = attrs.match(/\shref\s*=\s*(['"])(.*?)\1/i)?.[2] ?? "#";
      const safeHref = /^https?:\/\//i.test(href) || href.startsWith("/")
        ? href
        : "#";
      return `<a href="${safeHref}" target="_blank" rel="noreferrer">`;
    })
    .replace(/<img\b([^>]*)>/gi, (_match, attrs: string) => {
      const src = attrs.match(/\ssrc\s*=\s*(['"])(.*?)\1/i)?.[2] ?? "";
      const alt = attrs.match(/\salt\s*=\s*(['"])(.*?)\1/i)?.[2] ?? "";
      const safeSrc = /^(https?:\/\/|\/api\/job-assets\/)/i.test(src) ? src : "";

      if (!safeSrc) {
        return "";
      }

      const safeAlt = alt.replace(/"/g, "&quot;");
      return `<img src="${safeSrc}" alt="${safeAlt}" />`;
    });
};

const normalizeEmploymentType = (value: string | undefined): EmploymentType => {
  return EMPLOYMENT_TYPES.find((item) => item === value) ?? "Full-time";
};

const normalizeWorkplaceType = (value: string | undefined): WorkplaceType => {
  return WORKPLACE_TYPES.find((item) => item === value) ?? "On-site";
};

const normalizeExperienceLevel = (value: string | undefined): ExperienceLevel => {
  return EXPERIENCE_LEVELS.find((item) => item === value) ?? "Mid level";
};

const normalizeSalaryCurrency = (value: string | undefined): SalaryCurrency => {
  return SALARY_CURRENCIES.find((item) => item === value) ?? "LKR";
};

const normalizeVacancies = (value: number | null | undefined) => {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
    return null;
  }

  return Math.floor(value);
};

const normalizeMaxRetryAttempts = (value: number | null | undefined) => {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    return DEFAULT_JOB_MAX_RETRY_ATTEMPTS;
  }

  return Math.floor(value);
};

const normalizeMinimumYearsExperience = (value: number | null | undefined) => {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    return null;
  }

  return Math.floor(value);
};

const parseKeywordJson = (value: string | undefined) => {
  if (!value) {
    return [] as string[];
  }

  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed)
      ? parsed.filter((item): item is string => typeof item === "string" && item.trim().length > 0)
      : [];
  } catch {
    return [];
  }
};

const buildJobCode = (sequence: number) => {
  return `${JOB_CODE_PREFIX}${String(sequence).padStart(3, "0")}`;
};

const getCodeSequence = (code: string) => {
  const match = code.match(/^JN(\d+)$/i);
  return match ? Number(match[1]) : 0;
};

const toJobRecord = (entity: JobEntity): JobRecord => {
  const code = normalizeText(entity.code) || buildJobCode(1);
  const descriptionHtml = sanitizeRichHtml(entity.descriptionHtml ?? entity.description ?? "");
  const summary = normalizeText(entity.summary) || stripHtml(descriptionHtml);

  return {
    id: entity.rowKey.replace(/^job:/, ""),
    code,
    title: entity.title,
    summary,
    descriptionHtml,
    department: normalizeText(entity.department),
    location: normalizeText(entity.location),
    employmentType: normalizeEmploymentType(entity.employmentType),
    workplaceType: normalizeWorkplaceType(entity.workplaceType),
    experienceLevel: normalizeExperienceLevel(entity.experienceLevel),
    salaryCurrency: normalizeSalaryCurrency(entity.salaryCurrency),
    salaryRange: normalizeText(entity.salaryRange),
    vacancies: normalizeVacancies(entity.vacancies),
    maxRetryAttempts: normalizeMaxRetryAttempts(entity.maxRetryAttempts),
    atsEnabled: Boolean(entity.atsEnabled),
    atsRequiredKeywords: parseKeywordJson(entity.atsRequiredKeywordsJson),
    atsPreferredKeywords: parseKeywordJson(entity.atsPreferredKeywordsJson),
    atsMinimumYearsExperience: normalizeMinimumYearsExperience(entity.atsMinimumYearsExperience),
    atsRequiredEducation: parseKeywordJson(entity.atsRequiredEducationJson),
    atsRequiredCertifications: parseKeywordJson(entity.atsRequiredCertificationsJson),
    closingDate: normalizeText(entity.closingDate),
    requirements: normalizeText(entity.requirements),
    benefits: normalizeText(entity.benefits),
    isPublished: Boolean(entity.isPublished),
    isDeleted: Boolean(entity.isDeleted),
    deletedAt: entity.deletedAt ? new Date(entity.deletedAt).toISOString() : null,
    deletedBy: normalizeText(entity.deletedBy),
    createdAt: new Date(entity.createdAt).toISOString(),
    updatedAt: new Date(entity.updatedAt).toISOString(),
  };
};

export const getJobDisplayLabel = (job: Pick<JobRecord, "code" | "title">) => {
  return `${job.code} - ${job.title}`;
};

export const getSalaryDisplay = (
  job: Pick<JobRecord, "salaryCurrency" | "salaryRange">,
) => {
  if (!job.salaryRange) {
    return "";
  }

  return `${job.salaryCurrency} ${job.salaryRange}`;
};

export const getJobAtsConfigSignature = (
  job: Pick<
    JobRecord,
    | "atsEnabled"
    | "atsRequiredKeywords"
    | "atsPreferredKeywords"
    | "atsMinimumYearsExperience"
    | "atsRequiredEducation"
    | "atsRequiredCertifications"
    | "title"
    | "summary"
    | "requirements"
    | "department"
    | "experienceLevel"
  >,
) => {
  if (!job.atsEnabled) {
    return "";
  }

  const payload = JSON.stringify({
    atsEnabled: job.atsEnabled,
    required: [...job.atsRequiredKeywords].sort((left, right) => left.localeCompare(right)),
    preferred: [...job.atsPreferredKeywords].sort((left, right) => left.localeCompare(right)),
    minimumYearsExperience: job.atsMinimumYearsExperience ?? null,
    requiredEducation: [...job.atsRequiredEducation].sort((left, right) => left.localeCompare(right)),
    requiredCertifications: [...job.atsRequiredCertifications].sort((left, right) => left.localeCompare(right)),
    title: job.title,
    summary: job.summary,
    requirements: job.requirements,
    department: job.department,
    experienceLevel: job.experienceLevel,
  });

  return payload;
};

export const hasEffectiveAtsCriteria = (
  job: Pick<
    JobRecord,
    | "atsEnabled"
    | "atsRequiredKeywords"
    | "atsPreferredKeywords"
    | "atsMinimumYearsExperience"
    | "atsRequiredEducation"
    | "atsRequiredCertifications"
  >,
) => {
  if (!job.atsEnabled) {
    return false;
  }

  return job.atsRequiredKeywords.length > 0
    || job.atsPreferredKeywords.length > 0
    || (typeof job.atsMinimumYearsExperience === "number" && job.atsMinimumYearsExperience > 0)
    || job.atsRequiredEducation.length > 0
    || job.atsRequiredCertifications.length > 0;
};

export const listJobs = async (): Promise<JobRecord[]> => {
  const tableClient = await getAppTableClient();
  const entities = tableClient.listEntities<JobEntity>({
    queryOptions: {
      filter: `PartitionKey eq '${JOB_SCOPE}' and type eq '${JOB_TYPE}'`,
    },
  });

  const items: JobRecord[] = [];

  for await (const entity of entities) {
    const record = toJobRecord(entity);

    if (!record.isDeleted) {
      items.push(record);
    }
  }

  return items.sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
};

export const listPublishedJobs = async (): Promise<JobRecord[]> => {
  const jobs = await listJobs();
  return jobs.filter((job) => job.isPublished);
};

export const listJobsPage = async (
  limit: number,
  cursor?: string,
  publishedOnly = false,
): Promise<JobRecordPage> => {
  const tableClient = await getAppTableClient();
  const filter = publishedOnly
    ? `PartitionKey eq '${JOB_SCOPE}' and type eq '${JOB_TYPE}' and isPublished eq true`
    : `PartitionKey eq '${JOB_SCOPE}' and type eq '${JOB_TYPE}'`;
  const pages = tableClient.listEntities<JobEntity>({
    queryOptions: { filter },
  }).byPage({
    continuationToken: cursor || undefined,
    maxPageSize: limit,
  });

  for await (const page of pages) {
    const items = [...page]
      .map((entity) => toJobRecord(entity))
      .filter((entity) => !entity.isDeleted)
      .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));

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

export const getJobById = async (id: string, options?: { includeDeleted?: boolean }): Promise<JobRecord | null> => {
  if (!id) {
    return null;
  }

  const tableClient = await getAppTableClient();

  try {
    const entity = await tableClient.getEntity<JobEntity>(JOB_SCOPE, toRowKey(id));
    if (entity.type !== JOB_TYPE) {
      return null;
    }

    const record = toJobRecord(entity);
    return record.isDeleted && !options?.includeDeleted ? null : record;
  } catch (error) {
    if (isTableNotFoundError(error)) {
      return null;
    }

    throw error;
  }
};

const getNextJobCode = async () => {
  const tableClient = await getAppTableClient();
  const entities = tableClient.listEntities<JobEntity>({
    queryOptions: {
      filter: `PartitionKey eq '${JOB_SCOPE}' and type eq '${JOB_TYPE}'`,
    },
  });
  const jobs: JobRecord[] = [];

  for await (const entity of entities) {
    jobs.push(toJobRecord(entity));
  }

  const highestSequence = jobs.reduce((max, job) => {
    return Math.max(max, getCodeSequence(job.code));
  }, 0);

  return buildJobCode(highestSequence + 1);
};

export const upsertJob = async (input: UpsertJobInput): Promise<JobRecord> => {
  const tableClient = await getAppTableClient();
  const existing = input.id ? await getJobById(input.id) : null;
  const now = Date.now();
  const id = input.id ?? randomUUID();
  const code = existing?.code ?? await getNextJobCode();
  const descriptionHtml = sanitizeRichHtml(input.descriptionHtml);
  const summary = normalizeText(input.summary) || stripHtml(descriptionHtml);

  const entity: JobEntity = {
    partitionKey: JOB_SCOPE,
    rowKey: toRowKey(id),
    type: JOB_TYPE,
    code,
    title: input.title.trim(),
    summary,
    descriptionHtml,
    department: normalizeText(input.department),
    location: normalizeText(input.location),
    employmentType: normalizeEmploymentType(input.employmentType),
    workplaceType: normalizeWorkplaceType(input.workplaceType),
    experienceLevel: normalizeExperienceLevel(input.experienceLevel),
    salaryCurrency: normalizeSalaryCurrency(input.salaryCurrency),
    salaryRange: normalizeText(input.salaryRange),
    vacancies: normalizeVacancies(input.vacancies) ?? undefined,
    maxRetryAttempts: normalizeMaxRetryAttempts(input.maxRetryAttempts),
    atsEnabled: Boolean(input.atsEnabled),
    atsRequiredKeywordsJson: JSON.stringify(input.atsEnabled ? (input.atsRequiredKeywords ?? []) : []),
    atsPreferredKeywordsJson: JSON.stringify(input.atsEnabled ? (input.atsPreferredKeywords ?? []) : []),
    atsMinimumYearsExperience: input.atsEnabled
      ? normalizeMinimumYearsExperience(input.atsMinimumYearsExperience) ?? undefined
      : undefined,
    atsRequiredEducationJson: JSON.stringify(input.atsEnabled ? (input.atsRequiredEducation ?? []) : []),
    atsRequiredCertificationsJson: JSON.stringify(input.atsEnabled ? (input.atsRequiredCertifications ?? []) : []),
    closingDate: normalizeText(input.closingDate),
    requirements: normalizeText(input.requirements),
    benefits: normalizeText(input.benefits),
    isPublished: input.isPublished,
    isDeleted: false,
    deletedAt: 0,
    deletedBy: "",
    createdAt: existing ? Date.parse(existing.createdAt) : now,
    updatedAt: now,
  };

  await tableClient.upsertEntity(entity, "Replace");
  return toJobRecord(entity);
};

export const deleteJob = async (id: string, deletedBy: string) => {
  const existing = await getJobById(id, { includeDeleted: true });

  if (!existing) {
    return;
  }

  const tableClient = await getAppTableClient();
  await tableClient.upsertEntity<JobEntity>({
    partitionKey: JOB_SCOPE,
    rowKey: toRowKey(id),
    type: JOB_TYPE,
    code: existing.code,
    title: existing.title,
    summary: existing.summary,
    descriptionHtml: existing.descriptionHtml,
    department: existing.department,
    location: existing.location,
    employmentType: existing.employmentType,
    workplaceType: existing.workplaceType,
    experienceLevel: existing.experienceLevel,
    salaryCurrency: existing.salaryCurrency,
    salaryRange: existing.salaryRange,
    vacancies: existing.vacancies ?? undefined,
    maxRetryAttempts: existing.maxRetryAttempts,
    atsEnabled: existing.atsEnabled,
    atsRequiredKeywordsJson: JSON.stringify(existing.atsRequiredKeywords),
    atsPreferredKeywordsJson: JSON.stringify(existing.atsPreferredKeywords),
    atsMinimumYearsExperience: existing.atsMinimumYearsExperience ?? undefined,
    atsRequiredEducationJson: JSON.stringify(existing.atsRequiredEducation),
    atsRequiredCertificationsJson: JSON.stringify(existing.atsRequiredCertifications),
    closingDate: existing.closingDate,
    requirements: existing.requirements,
    benefits: existing.benefits,
    isPublished: false,
    isDeleted: true,
    deletedAt: Date.now(),
    deletedBy: normalizeText(deletedBy).toLowerCase(),
    createdAt: Date.parse(existing.createdAt),
    updatedAt: Date.now(),
  }, "Replace");
};

export const purgeDeletedJobs = async (olderThanMs: number) => {
  const cutoff = Date.now() - olderThanMs;
  const tableClient = await getAppTableClient();
  const entities = tableClient.listEntities<JobEntity>({
    queryOptions: {
      filter: `PartitionKey eq '${JOB_SCOPE}' and type eq '${JOB_TYPE}'`,
    },
  });

  let purgedCount = 0;

  for await (const entity of entities) {
    if (!entity.isDeleted || !entity.deletedAt || entity.deletedAt > cutoff) {
      continue;
    }

    await tableClient.deleteEntity(JOB_SCOPE, entity.rowKey);
    purgedCount += 1;
  }

  return purgedCount;
};
