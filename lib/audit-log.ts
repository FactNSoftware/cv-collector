import { randomUUID } from "crypto";
import { getAppTableClient } from "./azure-tables";
import { buildPageInfo, type PageInfo } from "./pagination";

const AUDIT_SCOPE = "audit";
const AUDIT_TYPE = "admin-log";

type AuditLogEntity = {
  partitionKey: string;
  rowKey: string;
  type: string;
  actorEmail: string;
  action: string;
  targetType: string;
  targetId: string;
  summary: string;
  requestMethod?: string;
  requestPath?: string;
  userAgent?: string;
  detailsJson?: string;
  createdAt: number;
};

export type AdminAuditLogRecord = {
  id: string;
  actorEmail: string;
  action: string;
  targetType: string;
  targetId: string;
  summary: string;
  requestMethod: string;
  requestPath: string;
  userAgent: string;
  details: Record<string, unknown> | null;
  createdAt: string;
};

export type AdminAuditLogPage = {
  items: AdminAuditLogRecord[];
  pageInfo: PageInfo;
};

type RecordAdminAuditInput = {
  actorEmail: string;
  action: string;
  targetType: string;
  targetId?: string;
  summary: string;
  requestMethod?: string;
  requestPath?: string;
  userAgent?: string;
  details?: Record<string, unknown>;
};

const normalizeValue = (value: string | undefined) => value?.trim() ?? "";

const toRowKey = (createdAt: number) => {
  return `log:${String(createdAt).padStart(13, "0")}:${randomUUID()}`;
};

const parseDetails = (value: string | undefined) => {
  if (!value) {
    return null;
  }

  try {
    return JSON.parse(value) as Record<string, unknown>;
  } catch {
    return null;
  }
};

const toRecord = (entity: AuditLogEntity): AdminAuditLogRecord => ({
  id: entity.rowKey.replace(/^log:/, ""),
  actorEmail: entity.actorEmail,
  action: entity.action,
  targetType: entity.targetType,
  targetId: entity.targetId,
  summary: entity.summary,
  requestMethod: entity.requestMethod ?? "",
  requestPath: entity.requestPath ?? "",
  userAgent: entity.userAgent ?? "",
  details: parseDetails(entity.detailsJson),
  createdAt: new Date(entity.createdAt).toISOString(),
});

export const recordAdminAuditEvent = async (input: RecordAdminAuditInput) => {
  const actorEmail = normalizeValue(input.actorEmail).toLowerCase();

  if (!actorEmail) {
    throw new Error("actorEmail is required for admin audit logging.");
  }

  const createdAt = Date.now();
  const entity: AuditLogEntity = {
    partitionKey: AUDIT_SCOPE,
    rowKey: toRowKey(createdAt),
    type: AUDIT_TYPE,
    actorEmail,
    action: normalizeValue(input.action),
    targetType: normalizeValue(input.targetType),
    targetId: normalizeValue(input.targetId),
    summary: normalizeValue(input.summary),
    requestMethod: normalizeValue(input.requestMethod),
    requestPath: normalizeValue(input.requestPath),
    userAgent: normalizeValue(input.userAgent).slice(0, 1024),
    detailsJson: input.details ? JSON.stringify(input.details).slice(0, 4000) : "",
    createdAt,
  };

  const tableClient = await getAppTableClient();
  await tableClient.createEntity(entity);

  return toRecord(entity);
};

export const listAdminAuditEvents = async (): Promise<AdminAuditLogRecord[]> => {
  const tableClient = await getAppTableClient();
  const entities = tableClient.listEntities<AuditLogEntity>({
    queryOptions: {
      filter: `PartitionKey eq '${AUDIT_SCOPE}' and type eq '${AUDIT_TYPE}'`,
    },
  });

  const items: AdminAuditLogRecord[] = [];

  for await (const entity of entities) {
    items.push(toRecord(entity));
  }

  return items.sort((left, right) => right.createdAt.localeCompare(left.createdAt));
};

export const listAdminAuditEventsPage = async ({
  limit,
  cursor,
  actorEmail,
}: {
  limit: number;
  cursor?: string;
  actorEmail?: string;
}): Promise<AdminAuditLogPage> => {
  const filters = [
    `PartitionKey eq '${AUDIT_SCOPE}'`,
    `type eq '${AUDIT_TYPE}'`,
  ];

  if (actorEmail?.trim()) {
    filters.push(`actorEmail eq '${actorEmail.trim().toLowerCase().replace(/'/g, "''")}'`);
  }

  const tableClient = await getAppTableClient();
  const pages = tableClient.listEntities<AuditLogEntity>({
    queryOptions: {
      filter: filters.join(" and "),
    },
  }).byPage({
    continuationToken: cursor || undefined,
    maxPageSize: limit,
  });

  for await (const page of pages) {
    const items = [...page]
      .map((entity) => toRecord(entity))
      .sort((left, right) => right.createdAt.localeCompare(left.createdAt));

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
