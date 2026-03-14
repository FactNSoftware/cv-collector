import { randomUUID } from "crypto";
import { getAppTableClient, isTableNotFoundError } from "./azure-tables";

const JOB_SCOPE = "job";
const JOB_TYPE = "job";

type JobEntity = {
  partitionKey: string;
  rowKey: string;
  type: string;
  title: string;
  description: string;
  isPublished: boolean;
  createdAt: number;
  updatedAt: number;
};

export type JobRecord = {
  id: string;
  title: string;
  description: string;
  isPublished: boolean;
  createdAt: string;
  updatedAt: string;
};

type UpsertJobInput = {
  id?: string;
  title: string;
  description: string;
  isPublished: boolean;
};

const toRowKey = (id: string) => `job:${id}`;

const toJobRecord = (entity: JobEntity): JobRecord => ({
  id: entity.rowKey.replace(/^job:/, ""),
  title: entity.title,
  description: entity.description,
  isPublished: Boolean(entity.isPublished),
  createdAt: new Date(entity.createdAt).toISOString(),
  updatedAt: new Date(entity.updatedAt).toISOString(),
});

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

export const upsertJob = async (input: UpsertJobInput): Promise<JobRecord> => {
  const tableClient = await getAppTableClient();
  const existing = input.id ? await getJobById(input.id) : null;
  const now = Date.now();
  const id = input.id ?? randomUUID();

  const entity: JobEntity = {
    partitionKey: JOB_SCOPE,
    rowKey: toRowKey(id),
    type: JOB_TYPE,
    title: input.title.trim(),
    description: input.description.trim(),
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
