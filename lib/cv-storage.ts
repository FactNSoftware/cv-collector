import { randomUUID } from "crypto";
import {
  deleteCvUpload,
  saveCvPdf,
} from "./cv-file-service";
import {
  getAppTableClient,
  isTableConflictError,
  isTableNotFoundError,
} from "./azure-tables";
import { getJobById } from "./jobs";
import { buildPageInfo, type PageInfo } from "./pagination";

const CV_SCOPE = "cv";
const CV_SUBMISSION_TYPE = "submission";

export const CV_REVIEW_STATUSES = [
  "pending",
  "accepted",
  "rejected",
] as const;

export type CvReviewStatus = (typeof CV_REVIEW_STATUSES)[number];

export type CvSubmissionRecord = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  idOrPassportNumber: string;
  jobId: string;
  jobCode: string;
  jobTitle: string;
  jobOpening: string;
  resumeOriginalName: string;
  resumeStoredName: string;
  resumeMimeType: string;
  reviewStatus: CvReviewStatus;
  rejectionReason: string;
  reviewedAt: string | null;
  reviewedBy: string;
  submittedAt: string;
};

export type CvSubmissionPage = {
  items: CvSubmissionRecord[];
  pageInfo: PageInfo;
};

type CreateCvSubmissionInput = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  idOrPassportNumber: string;
  jobId: string;
  jobCode: string;
  jobTitle: string;
  jobOpening: string;
  resumeOriginalName: string;
  resumeMimeType: string;
  resumeBuffer: Buffer;
};

type UpdateCvSubmissionReviewInput = {
  id: string;
  reviewStatus: CvReviewStatus;
  reviewedBy: string;
  rejectionReason?: string;
};

export class DuplicateApplicantError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DuplicateApplicantError";
  }
}

export class InvalidApplicationReviewTransitionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidApplicationReviewTransitionError";
  }
}

type CvSubmissionDocument = {
  partitionKey: string;
  rowKey: string;
  type: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  idOrPassportNumber: string;
  jobId?: string;
  jobCode?: string;
  jobTitle?: string;
  jobOpening: string;
  resumeOriginalName: string;
  resumeStoredName: string;
  resumeMimeType: string;
  reviewStatus?: string;
  rejectionReason?: string;
  reviewedAt?: number;
  reviewedBy?: string;
  submittedAt: number;
};

const normalizeReviewStatus = (value: string | undefined): CvReviewStatus => {
  return CV_REVIEW_STATUSES.find((item) => item === value) ?? "pending";
};

const toRecord = (submission: CvSubmissionDocument): CvSubmissionRecord => {
  return {
    id: submission.rowKey.replace(/^submission:/, ""),
    firstName: submission.firstName,
    lastName: submission.lastName,
    email: submission.email,
    phone: submission.phone,
    idOrPassportNumber: submission.idOrPassportNumber,
    jobId: submission.jobId ?? "",
    jobCode: submission.jobCode ?? "",
    jobTitle: submission.jobTitle ?? submission.jobOpening,
    jobOpening: submission.jobOpening,
    resumeOriginalName: submission.resumeOriginalName,
    resumeStoredName: submission.resumeStoredName,
    resumeMimeType: submission.resumeMimeType,
    reviewStatus: normalizeReviewStatus(submission.reviewStatus),
    rejectionReason: submission.rejectionReason ?? "",
    reviewedAt: submission.reviewedAt
      ? new Date(submission.reviewedAt).toISOString()
      : null,
    reviewedBy: submission.reviewedBy ?? "",
    submittedAt: new Date(submission.submittedAt).toISOString(),
  };
};

const toSubmissionDoc = (
  rowKey: string,
  data: Record<string, unknown>,
): CvSubmissionDocument => {
  const submittedAtValue = Number(data.submittedAt ?? 0);
  const submittedAt = Number.isFinite(submittedAtValue)
    ? submittedAtValue
    : Date.now();

  return {
    partitionKey: String(data.partitionKey ?? CV_SCOPE),
    rowKey,
    type: String(data.type ?? ""),
    firstName: String(data.firstName ?? ""),
    lastName: String(data.lastName ?? ""),
    email: String(data.email ?? ""),
    phone: String(data.phone ?? ""),
    idOrPassportNumber: String(data.idOrPassportNumber ?? ""),
    jobId: String(data.jobId ?? ""),
    jobCode: String(data.jobCode ?? ""),
    jobTitle: String(data.jobTitle ?? data.jobOpening ?? ""),
    jobOpening: String(data.jobOpening ?? ""),
    resumeOriginalName: String(data.resumeOriginalName ?? ""),
    resumeStoredName: String(data.resumeStoredName ?? ""),
    resumeMimeType: String(data.resumeMimeType ?? "application/pdf"),
    reviewStatus: String(data.reviewStatus ?? "pending"),
    rejectionReason: String(data.rejectionReason ?? ""),
    reviewedAt: Number(data.reviewedAt ?? 0),
    reviewedBy: String(data.reviewedBy ?? ""),
    submittedAt,
  };
};

const toSubmissionRowKey = (id: string) => `submission:${id}`;

const getMaxRejectedAttemptsForJob = async (jobId: string) => {
  const job = await getJobById(jobId);
  return (job?.maxRetryAttempts ?? 0) + 1;
};

export const listCvSubmissions = async (): Promise<CvSubmissionRecord[]> => {
  const tableClient = await getAppTableClient();
  const entities = tableClient.listEntities<Record<string, unknown>>({
    queryOptions: {
      filter: `PartitionKey eq '${CV_SCOPE}' and type eq '${CV_SUBMISSION_TYPE}'`,
    },
  });

  const resources: CvSubmissionRecord[] = [];

  for await (const entity of entities) {
    const rowKey = String(entity.rowKey ?? "");
    resources.push(toRecord(toSubmissionDoc(rowKey, entity)));
  }

  return resources.sort((left, right) => (
    new Date(right.submittedAt).getTime() - new Date(left.submittedAt).getTime()
  ));
};

export const listCvSubmissionsByEmail = async (
  email: string,
): Promise<CvSubmissionRecord[]> => {
  const normalizedEmail = email.trim().toLowerCase();

  if (!normalizedEmail) {
    return [];
  }

  const submissions = await listCvSubmissions();
  return submissions.filter((submission) => submission.email === normalizedEmail);
};

export const listCvSubmissionsByJobId = async (
  jobId: string,
): Promise<CvSubmissionRecord[]> => {
  const normalizedJobId = jobId.trim();

  if (!normalizedJobId) {
    return [];
  }

  const submissions = await listCvSubmissions();
  return submissions.filter((submission) => submission.jobId === normalizedJobId);
};

export const listLatestCvSubmissionsByJobId = async (
  jobId: string,
): Promise<CvSubmissionRecord[]> => {
  const submissions = await listCvSubmissionsByJobId(jobId);
  const latestByEmail = new Map<string, CvSubmissionRecord>();

  for (const submission of submissions) {
    const existing = latestByEmail.get(submission.email);

    if (!existing || new Date(submission.submittedAt).getTime() > new Date(existing.submittedAt).getTime()) {
      latestByEmail.set(submission.email, submission);
    }
  }

  return [...latestByEmail.values()].sort(
    (left, right) => new Date(right.submittedAt).getTime() - new Date(left.submittedAt).getTime(),
  );
};

export const listCvSubmissionsPage = async ({
  limit,
  cursor,
  email,
  jobId,
}: {
  limit: number;
  cursor?: string;
  email?: string;
  jobId?: string;
}): Promise<CvSubmissionPage> => {
  const filters = [
    `PartitionKey eq '${CV_SCOPE}'`,
    `type eq '${CV_SUBMISSION_TYPE}'`,
  ];

  if (email?.trim()) {
    filters.push(`email eq '${email.trim().toLowerCase().replace(/'/g, "''")}'`);
  }

  if (jobId?.trim()) {
    filters.push(`jobId eq '${jobId.trim().replace(/'/g, "''")}'`);
  }

  const tableClient = await getAppTableClient();
  const pages = tableClient.listEntities<Record<string, unknown>>({
    queryOptions: {
      filter: filters.join(" and "),
    },
  }).byPage({
    continuationToken: cursor || undefined,
    maxPageSize: limit,
  });

  for await (const page of pages) {
    const items = [...page]
      .map((entity) => toRecord(toSubmissionDoc(String(entity.rowKey ?? ""), entity)))
      .sort((left, right) => new Date(right.submittedAt).getTime() - new Date(left.submittedAt).getTime());

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

export const getCvSubmissionById = async (
  id: string,
): Promise<CvSubmissionRecord | null> => {
  if (!id) {
    return null;
  }

  const tableClient = await getAppTableClient();

  try {
    const response = await tableClient.getEntity<Record<string, unknown>>(
      CV_SCOPE,
      toSubmissionRowKey(id),
    );
    const doc = toSubmissionDoc(toSubmissionRowKey(id), response);

    if (doc.type !== CV_SUBMISSION_TYPE) {
      return null;
    }

    return toRecord(doc);
  } catch (error) {
    if (isTableNotFoundError(error)) {
      return null;
    }

    throw error;
  }
};

export const createCvSubmission = async (
  input: CreateCvSubmissionInput,
): Promise<CvSubmissionRecord> => {
  const normalizedEmail = input.email.trim().toLowerCase();
  const existingSubmissions = await listCvSubmissionsByEmail(normalizedEmail);
  const maxRejectedAttemptsForJob = await getMaxRejectedAttemptsForJob(input.jobId);
  const rejectedAttemptsForJob = existingSubmissions.filter(
    (submission) => submission.jobId === input.jobId && submission.reviewStatus === "rejected",
  );

  if (existingSubmissions.some((submission) => submission.jobId === input.jobId && submission.reviewStatus !== "rejected")) {
    throw new DuplicateApplicantError(
      "You already have an active application for this job. Withdraw it before applying again.",
    );
  }

  if (rejectedAttemptsForJob.length >= maxRejectedAttemptsForJob) {
    if (maxRejectedAttemptsForJob <= 1) {
      throw new DuplicateApplicantError(
        "This job does not allow reapplying after a rejection.",
      );
    }

    throw new DuplicateApplicantError(
      `You have reached the maximum of ${maxRejectedAttemptsForJob} rejected attempts for this job.`,
    );
  }

  const savedFile = await saveCvPdf({
    fileName: input.resumeOriginalName,
    mimeType: input.resumeMimeType,
    fileBuffer: input.resumeBuffer,
    folderName: input.jobId,
  });

  try {
    const tableClient = await getAppTableClient();
    const submissionId = randomUUID();
    const submittedAt = Date.now();
    const normalizedIdValue = input.idOrPassportNumber.trim();
    await tableClient.submitTransaction([
      ["create", {
        partitionKey: CV_SCOPE,
        rowKey: toSubmissionRowKey(submissionId),
        type: CV_SUBMISSION_TYPE,
        firstName: input.firstName,
        lastName: input.lastName,
        email: normalizedEmail,
        phone: input.phone,
        idOrPassportNumber: normalizedIdValue,
        jobId: input.jobId,
        jobCode: input.jobCode,
        jobTitle: input.jobTitle,
        jobOpening: input.jobOpening,
        resumeOriginalName: input.resumeOriginalName,
        resumeStoredName: savedFile.storedFileName,
        resumeMimeType: savedFile.mimeType,
        reviewStatus: "pending",
        rejectionReason: "",
        reviewedAt: 0,
        reviewedBy: "",
        submittedAt,
      }],
    ]);

    return toRecord({
      partitionKey: CV_SCOPE,
      rowKey: toSubmissionRowKey(submissionId),
      type: CV_SUBMISSION_TYPE,
      firstName: input.firstName,
      lastName: input.lastName,
      email: normalizedEmail,
      phone: input.phone,
      idOrPassportNumber: normalizedIdValue,
      jobId: input.jobId,
      jobCode: input.jobCode,
      jobTitle: input.jobTitle,
      jobOpening: input.jobOpening,
      resumeOriginalName: input.resumeOriginalName,
      resumeStoredName: savedFile.storedFileName,
      resumeMimeType: savedFile.mimeType,
      reviewStatus: "pending",
      rejectionReason: "",
      reviewedAt: 0,
      reviewedBy: "",
      submittedAt,
    });
  } catch (error) {
    await deleteCvUpload(savedFile.storedFileName);

    if (error instanceof DuplicateApplicantError) {
      throw error;
    }

    if (isTableConflictError(error)) {
      throw new DuplicateApplicantError(
        "You already have an active application for this job. Withdraw it before applying again.",
      );
    }

    throw error;
  }
};

export const updateCvSubmissionReview = async (
  input: UpdateCvSubmissionReviewInput,
): Promise<CvSubmissionRecord | null> => {
  const existing = await getCvSubmissionById(input.id);

  if (!existing) {
    return null;
  }

  if (existing.reviewStatus === "accepted" && input.reviewStatus !== "accepted") {
    throw new InvalidApplicationReviewTransitionError(
      "Accepted applications cannot be changed to another status.",
    );
  }

  if (existing.reviewStatus === "rejected" && input.reviewStatus !== "rejected") {
    throw new InvalidApplicationReviewTransitionError(
      "Rejected applications cannot be changed to another status.",
    );
  }

  const tableClient = await getAppTableClient();
  const reviewedAt = Date.now();
  const normalizedReason = input.reviewStatus === "rejected"
    ? (input.rejectionReason ?? "").trim()
    : "";

  await tableClient.upsertEntity({
    partitionKey: CV_SCOPE,
    rowKey: toSubmissionRowKey(input.id),
    type: CV_SUBMISSION_TYPE,
    firstName: existing.firstName,
    lastName: existing.lastName,
    email: existing.email,
    phone: existing.phone,
    idOrPassportNumber: existing.idOrPassportNumber,
    jobId: existing.jobId,
    jobCode: existing.jobCode,
    jobTitle: existing.jobTitle,
    jobOpening: existing.jobOpening,
    resumeOriginalName: existing.resumeOriginalName,
    resumeStoredName: existing.resumeStoredName,
    resumeMimeType: existing.resumeMimeType,
    reviewStatus: input.reviewStatus,
    rejectionReason: normalizedReason,
    reviewedAt,
    reviewedBy: input.reviewedBy.trim().toLowerCase(),
    submittedAt: Date.parse(existing.submittedAt),
  }, "Replace");

  return getCvSubmissionById(input.id);
};

export const deleteCvSubmission = async (id: string): Promise<boolean> => {
  const existing = await getCvSubmissionById(id);

  if (!existing) {
    return false;
  }

  const tableClient = await getAppTableClient();

  await tableClient.deleteEntity(CV_SCOPE, toSubmissionRowKey(id));

  await deleteCvUpload(existing.resumeStoredName);
  return true;
};
