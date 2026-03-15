import { randomUUID } from "crypto";
import {
  downloadCvUpload,
  deleteCvUpload,
  saveCvPdf,
} from "./cv-file-service";
import type { AtsEvaluation } from "./ats";
import {
  getAppTableClient,
  isTableConflictError,
  isTableNotFoundError,
} from "./azure-tables";
import { getJobAtsConfigSignature, getJobById, type JobRecord } from "./jobs";
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
  atsStatus: "none" | "queued" | "processing" | "success" | "failed";
  atsConfigSignature: string;
  atsScore: number | null;
  atsMethod: "ai" | "rules" | "none";
  atsSummary: string;
  atsCandidateSummary: string;
  atsConfidenceNotes: string;
  atsExtractedTextPreview: string;
  atsNormalizedSkills: string[];
  atsRelevantRoles: string[];
  atsEducation: string[];
  atsYearsOfExperience: number | null;
  atsRequiredMatched: string[];
  atsRequiredMissing: string[];
  atsPreferredMatched: string[];
  atsPreferredMissing: string[];
  atsEvaluatedAt: string | null;
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
  jobAtsConfigSignature: string;
  atsEnabled: boolean;
};

type UpdateCvSubmissionReviewInput = {
  id: string;
  reviewStatus: CvReviewStatus;
  reviewedBy: string;
  rejectionReason?: string;
};

type UpdateCvSubmissionAtsInput = {
  id: string;
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

export class AtsRecalculationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AtsRecalculationError";
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
  atsStatus?: string;
  atsConfigSignature?: string;
  atsScore?: number;
  atsMethod?: string;
  atsSummary?: string;
  atsCandidateSummary?: string;
  atsConfidenceNotes?: string;
  atsExtractedTextPreview?: string;
  atsNormalizedSkillsJson?: string;
  atsRelevantRolesJson?: string;
  atsEducationJson?: string;
  atsYearsOfExperience?: number;
  atsRequiredMatchedJson?: string;
  atsRequiredMissingJson?: string;
  atsPreferredMatchedJson?: string;
  atsPreferredMissingJson?: string;
  atsEvaluatedAt?: number;
  rejectionReason?: string;
  reviewedAt?: number;
  reviewedBy?: string;
  submittedAt: number;
};

const normalizeReviewStatus = (value: string | undefined): CvReviewStatus => {
  return CV_REVIEW_STATUSES.find((item) => item === value) ?? "pending";
};

const parseStringArray = (value: string | undefined) => {
  if (!value) {
    return [] as string[];
  }

  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed)
      ? parsed.filter((item): item is string => typeof item === "string")
      : [];
  } catch {
    return [];
  }
};

const toNullableFiniteNumber = (value: unknown) => {
  const numericValue = typeof value === "number" ? value : Number(value);
  return Number.isFinite(numericValue) ? numericValue : null;
};

const toOptionalFiniteNumber = (value: unknown) => {
  const numericValue = toNullableFiniteNumber(value);
  return numericValue === null ? undefined : numericValue;
};

const normalizeStoredAtsScore = (value: unknown) => {
  const numericValue = toNullableFiniteNumber(value);

  if (numericValue === null) {
    return null;
  }

  if (numericValue >= 0 && numericValue <= 100) {
    return numericValue;
  }

  // Compatibility fix for scores saved before the weighted formula bug was corrected.
  if (numericValue > 100 && numericValue <= 10_000) {
    return Math.round(numericValue / 100);
  }

  return Math.max(0, Math.min(100, Math.round(numericValue)));
};

const normalizeStoredAtsSummary = (summary: string, score: number | null) => {
  if (!summary || score === null) {
    return summary;
  }

  return summary.replace(/^\d+% match\./, `${score}% match.`);
};

const toRecord = (submission: CvSubmissionDocument): CvSubmissionRecord => {
  const atsScore = normalizeStoredAtsScore(submission.atsScore);

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
    atsStatus: submission.atsStatus === "queued"
      || submission.atsStatus === "processing"
      || submission.atsStatus === "success"
      || submission.atsStatus === "failed"
      ? submission.atsStatus
      : "none",
    atsConfigSignature: submission.atsConfigSignature ?? "",
    atsScore,
    atsMethod: submission.atsMethod === "ai" || submission.atsMethod === "rules" || submission.atsMethod === "none"
      ? submission.atsMethod
      : "none",
    atsSummary: normalizeStoredAtsSummary(submission.atsSummary ?? "", atsScore),
    atsCandidateSummary: submission.atsCandidateSummary ?? "",
    atsConfidenceNotes: submission.atsConfidenceNotes ?? "",
    atsExtractedTextPreview: submission.atsExtractedTextPreview ?? "",
    atsNormalizedSkills: parseStringArray(submission.atsNormalizedSkillsJson),
    atsRelevantRoles: parseStringArray(submission.atsRelevantRolesJson),
    atsEducation: parseStringArray(submission.atsEducationJson),
    atsYearsOfExperience: toNullableFiniteNumber(submission.atsYearsOfExperience),
    atsRequiredMatched: parseStringArray(submission.atsRequiredMatchedJson),
    atsRequiredMissing: parseStringArray(submission.atsRequiredMissingJson),
    atsPreferredMatched: parseStringArray(submission.atsPreferredMatchedJson),
    atsPreferredMissing: parseStringArray(submission.atsPreferredMissingJson),
    atsEvaluatedAt: submission.atsEvaluatedAt
      ? new Date(submission.atsEvaluatedAt).toISOString()
      : null,
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
    atsStatus: String(data.atsStatus ?? "none"),
    atsConfigSignature: String(data.atsConfigSignature ?? ""),
    atsScore: toOptionalFiniteNumber(data.atsScore),
    atsMethod: String(data.atsMethod ?? "none"),
    atsSummary: String(data.atsSummary ?? ""),
    atsCandidateSummary: String(data.atsCandidateSummary ?? ""),
    atsConfidenceNotes: String(data.atsConfidenceNotes ?? ""),
    atsExtractedTextPreview: String(data.atsExtractedTextPreview ?? ""),
    atsNormalizedSkillsJson: String(data.atsNormalizedSkillsJson ?? "[]"),
    atsRelevantRolesJson: String(data.atsRelevantRolesJson ?? "[]"),
    atsEducationJson: String(data.atsEducationJson ?? "[]"),
    atsYearsOfExperience: toOptionalFiniteNumber(data.atsYearsOfExperience),
    atsRequiredMatchedJson: String(data.atsRequiredMatchedJson ?? "[]"),
    atsRequiredMissingJson: String(data.atsRequiredMissingJson ?? "[]"),
    atsPreferredMatchedJson: String(data.atsPreferredMatchedJson ?? "[]"),
    atsPreferredMissingJson: String(data.atsPreferredMissingJson ?? "[]"),
    atsEvaluatedAt: Number(data.atsEvaluatedAt ?? 0),
    rejectionReason: String(data.rejectionReason ?? ""),
    reviewedAt: Number(data.reviewedAt ?? 0),
    reviewedBy: String(data.reviewedBy ?? ""),
    submittedAt,
  };
};

const toSubmissionRowKey = (id: string) => `submission:${id}`;

const getAtsStatusFromEvaluation = (evaluation: AtsEvaluation): "none" | "success" | "failed" => {
  if (evaluation.method === "none") {
    return "none";
  }

  if (
    evaluation.candidateSummary === "ATS parsing failed for this CV. The application is still saved."
    || evaluation.candidateSummary === "Resume text could not be extracted cleanly."
  ) {
    return "failed";
  }

  return "success";
};

const getQueuedAtsEntityFields = (atsEnabled: boolean) => ({
  atsStatus: atsEnabled ? "queued" : "none",
  atsScore: undefined,
  atsMethod: "none",
  atsSummary: atsEnabled
    ? "ATS analysis is queued and will run in the background."
    : "ATS is not configured for this job.",
  atsCandidateSummary: "",
  atsConfidenceNotes: "",
  atsExtractedTextPreview: "",
  atsNormalizedSkillsJson: "[]",
  atsRelevantRolesJson: "[]",
  atsEducationJson: "[]",
  atsYearsOfExperience: undefined,
  atsRequiredMatchedJson: "[]",
  atsRequiredMissingJson: "[]",
  atsPreferredMatchedJson: "[]",
  atsPreferredMissingJson: "[]",
  atsEvaluatedAt: 0,
});

const getAtsEntityFields = (evaluation: AtsEvaluation) => ({
  atsStatus: getAtsStatusFromEvaluation(evaluation),
  atsScore: evaluation.score ?? undefined,
  atsMethod: evaluation.method,
  atsSummary: evaluation.summary,
  atsCandidateSummary: evaluation.candidateSummary,
  atsConfidenceNotes: evaluation.confidenceNotes,
  atsExtractedTextPreview: evaluation.extractedTextPreview,
  atsNormalizedSkillsJson: JSON.stringify(evaluation.normalizedSkills),
  atsRelevantRolesJson: JSON.stringify(evaluation.relevantRoles),
  atsEducationJson: JSON.stringify(evaluation.education),
  atsYearsOfExperience: evaluation.yearsOfExperience ?? undefined,
  atsRequiredMatchedJson: JSON.stringify(evaluation.requiredMatched),
  atsRequiredMissingJson: JSON.stringify(evaluation.requiredMissing),
  atsPreferredMatchedJson: JSON.stringify(evaluation.preferredMatched),
  atsPreferredMissingJson: JSON.stringify(evaluation.preferredMissing),
  atsEvaluatedAt: evaluation.evaluatedAt ? Date.parse(evaluation.evaluatedAt) : 0,
});

export const canSubmissionAtsBeRecalculated = (
  submission: Pick<CvSubmissionRecord, "atsStatus" | "atsConfigSignature" | "atsScore">,
  job: Pick<
    JobRecord,
    | "atsEnabled"
    | "atsRequiredKeywords"
    | "atsPreferredKeywords"
    | "title"
    | "summary"
    | "requirements"
    | "department"
    | "experienceLevel"
  > | null,
) => {
  if (!job?.atsEnabled) {
    return false;
  }

  const currentSignature = getJobAtsConfigSignature(job);

  if (!currentSignature) {
    return false;
  }

  if (submission.atsStatus === "queued" || submission.atsStatus === "processing") {
    return false;
  }

  // Compatibility: older successful ATS records may not have persisted a config signature.
  // Treat them as up to date unless they failed or are still unscored.
  if (
    submission.atsStatus === "success"
    && submission.atsScore !== null
    && !submission.atsConfigSignature
  ) {
    return false;
  }

  return submission.atsStatus !== "success" || submission.atsConfigSignature !== currentSignature;
};

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
        atsConfigSignature: input.jobAtsConfigSignature,
        ...getQueuedAtsEntityFields(input.atsEnabled),
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
      atsConfigSignature: input.jobAtsConfigSignature,
      ...getQueuedAtsEntityFields(input.atsEnabled),
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
    atsConfigSignature: existing.atsConfigSignature,
    ...getAtsEntityFields({
      score: existing.atsScore,
      method: existing.atsMethod,
      summary: existing.atsSummary,
      candidateSummary: existing.atsCandidateSummary,
      confidenceNotes: existing.atsConfidenceNotes,
      extractedTextPreview: existing.atsExtractedTextPreview,
      normalizedSkills: existing.atsNormalizedSkills,
      relevantRoles: existing.atsRelevantRoles,
      education: existing.atsEducation,
      yearsOfExperience: existing.atsYearsOfExperience,
      requiredMatched: existing.atsRequiredMatched,
      requiredMissing: existing.atsRequiredMissing,
      preferredMatched: existing.atsPreferredMatched,
      preferredMissing: existing.atsPreferredMissing,
      evaluatedAt: existing.atsEvaluatedAt,
    }),
    rejectionReason: normalizedReason,
    reviewedAt,
    reviewedBy: input.reviewedBy.trim().toLowerCase(),
    submittedAt: Date.parse(existing.submittedAt),
  }, "Replace");

  return getCvSubmissionById(input.id);
};

export const markCvSubmissionAtsQueued = async (id: string): Promise<CvSubmissionRecord | null> => {
  const existing = await getCvSubmissionById(id);

  if (!existing) {
    return null;
  }

  const tableClient = await getAppTableClient();

  await tableClient.upsertEntity({
    partitionKey: CV_SCOPE,
    rowKey: toSubmissionRowKey(id),
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
    reviewStatus: existing.reviewStatus,
    atsConfigSignature: existing.atsConfigSignature,
    ...getQueuedAtsEntityFields(true),
    rejectionReason: existing.rejectionReason,
    reviewedAt: existing.reviewedAt ? Date.parse(existing.reviewedAt) : 0,
    reviewedBy: existing.reviewedBy,
    submittedAt: Date.parse(existing.submittedAt),
  }, "Replace");

  return getCvSubmissionById(id);
};

export const markCvSubmissionAtsProcessing = async (id: string): Promise<CvSubmissionRecord | null> => {
  const existing = await getCvSubmissionById(id);

  if (!existing) {
    return null;
  }

  const tableClient = await getAppTableClient();

  await tableClient.upsertEntity({
    partitionKey: CV_SCOPE,
    rowKey: toSubmissionRowKey(id),
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
    reviewStatus: existing.reviewStatus,
    atsConfigSignature: existing.atsConfigSignature,
    ...getQueuedAtsEntityFields(true),
    atsStatus: "processing",
    atsSummary: "ATS analysis is currently running.",
    rejectionReason: existing.rejectionReason,
    reviewedAt: existing.reviewedAt ? Date.parse(existing.reviewedAt) : 0,
    reviewedBy: existing.reviewedBy,
    submittedAt: Date.parse(existing.submittedAt),
  }, "Replace");

  return getCvSubmissionById(id);
};

export const saveCvSubmissionAtsEvaluation = async (
  id: string,
  evaluation: AtsEvaluation,
  atsConfigSignature: string,
): Promise<CvSubmissionRecord | null> => {
  const existing = await getCvSubmissionById(id);

  if (!existing) {
    return null;
  }

  const tableClient = await getAppTableClient();

  await tableClient.upsertEntity({
    partitionKey: CV_SCOPE,
    rowKey: toSubmissionRowKey(id),
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
    reviewStatus: existing.reviewStatus,
    atsConfigSignature,
    ...getAtsEntityFields(evaluation),
    rejectionReason: existing.rejectionReason,
    reviewedAt: existing.reviewedAt ? Date.parse(existing.reviewedAt) : 0,
    reviewedBy: existing.reviewedBy,
    submittedAt: Date.parse(existing.submittedAt),
  }, "Replace");

  return getCvSubmissionById(id);
};

export const markCvSubmissionAtsFailed = async (
  id: string,
  message: string,
): Promise<CvSubmissionRecord | null> => {
  const existing = await getCvSubmissionById(id);

  if (!existing) {
    return null;
  }

  const tableClient = await getAppTableClient();

  await tableClient.upsertEntity({
    partitionKey: CV_SCOPE,
    rowKey: toSubmissionRowKey(id),
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
    reviewStatus: existing.reviewStatus,
    atsConfigSignature: existing.atsConfigSignature,
    ...getQueuedAtsEntityFields(true),
    atsStatus: "failed",
    atsSummary: message,
    atsCandidateSummary: message,
    rejectionReason: existing.rejectionReason,
    reviewedAt: existing.reviewedAt ? Date.parse(existing.reviewedAt) : 0,
    reviewedBy: existing.reviewedBy,
    submittedAt: Date.parse(existing.submittedAt),
  }, "Replace");

  return getCvSubmissionById(id);
};

export const updateCvSubmissionAts = async (
  input: UpdateCvSubmissionAtsInput,
): Promise<CvSubmissionRecord | null> => {
  const existing = await getCvSubmissionById(input.id);

  if (!existing) {
    return null;
  }

  if (!existing.jobId) {
    throw new AtsRecalculationError("This application is missing a job reference.");
  }

  const job = await getJobById(existing.jobId);

  if (!job) {
    throw new AtsRecalculationError("The related job could not be found for ATS recalculation.");
  }

  if (!canSubmissionAtsBeRecalculated(existing, job)) {
    throw new AtsRecalculationError("ATS is already up to date for this application.");
  }

  const resumeBuffer = await downloadCvUpload(existing.resumeStoredName);
  const { evaluateResumeAgainstJob } = await import("./ats");
  const evaluation = await evaluateResumeAgainstJob({
    job,
    resumeBuffer,
  });
  const atsConfigSignature = getJobAtsConfigSignature(job);

  const tableClient = await getAppTableClient();

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
    reviewStatus: existing.reviewStatus,
    atsConfigSignature,
    ...getAtsEntityFields(evaluation),
    rejectionReason: existing.rejectionReason,
    reviewedAt: existing.reviewedAt ? Date.parse(existing.reviewedAt) : 0,
    reviewedBy: existing.reviewedBy,
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
