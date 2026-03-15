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
  closingDate?: string;
  requirements?: string;
  benefits?: string;
  isPublished: boolean;
  createdAt: number;
  updatedAt: number;
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
  closingDate: string;
  requirements: string;
  benefits: string;
  isPublished: boolean;
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
    closingDate: normalizeText(entity.closingDate),
    requirements: normalizeText(entity.requirements),
    benefits: normalizeText(entity.benefits),
    isPublished: Boolean(entity.isPublished),
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

export const listJobs = async (): Promise<JobRecord[]> => {
  const tableClient = await getAppTableClient();
  const entities = tableClient.listEntities<JobEntity>({
    queryOptions: {
      filter: `PartitionKey eq '${JOB_SCOPE}' and type eq '${JOB_TYPE}'`,
    },
  });

  const items: JobRecord[] = [];

  for await (const entity of entities) {
    items.push(toJobRecord(entity));
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

export const getJobById = async (id: string): Promise<JobRecord | null> => {
  if (!id) {
    return null;
  }

  const tableClient = await getAppTableClient();

  try {
    const entity = await tableClient.getEntity<JobEntity>(JOB_SCOPE, toRowKey(id));
    return entity.type === JOB_TYPE ? toJobRecord(entity) : null;
  } catch (error) {
    if (isTableNotFoundError(error)) {
      return null;
    }

    throw error;
  }
};

const getNextJobCode = async () => {
  const jobs = await listJobs();
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
    closingDate: normalizeText(input.closingDate),
    requirements: normalizeText(input.requirements),
    benefits: normalizeText(input.benefits),
    isPublished: input.isPublished,
    createdAt: existing ? Date.parse(existing.createdAt) : now,
    updatedAt: now,
  };

  await tableClient.upsertEntity(entity, "Replace");
  return toJobRecord(entity);
};

export const deleteJob = async (id: string) => {
  const tableClient = await getAppTableClient();
  await tableClient.deleteEntity(JOB_SCOPE, toRowKey(id));
};
