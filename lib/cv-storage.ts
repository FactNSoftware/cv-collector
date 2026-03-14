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

const CV_SCOPE = "cv";
const CV_SUBMISSION_TYPE = "submission";
const CV_UNIQUE_TYPE = "unique";

export type CvSubmissionRecord = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  idOrPassportNumber: string;
  jobOpening: string;
  resumeOriginalName: string;
  resumeStoredName: string;
  resumeMimeType: string;
  submittedAt: string;
};

type CreateCvSubmissionInput = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  idOrPassportNumber: string;
  jobOpening: string;
  resumeOriginalName: string;
  resumeMimeType: string;
  resumeBuffer: Buffer;
};

export class DuplicateApplicantError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DuplicateApplicantError";
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
  jobOpening: string;
  resumeOriginalName: string;
  resumeStoredName: string;
  resumeMimeType: string;
  submittedAt: number;
};

const toRecord = (submission: CvSubmissionDocument): CvSubmissionRecord => {
  return {
    id: submission.rowKey.replace(/^submission:/, ""),
    firstName: submission.firstName,
    lastName: submission.lastName,
    email: submission.email,
    phone: submission.phone,
    idOrPassportNumber: submission.idOrPassportNumber,
    jobOpening: submission.jobOpening,
    resumeOriginalName: submission.resumeOriginalName,
    resumeStoredName: submission.resumeStoredName,
    resumeMimeType: submission.resumeMimeType,
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
    jobOpening: String(data.jobOpening ?? ""),
    resumeOriginalName: String(data.resumeOriginalName ?? ""),
    resumeStoredName: String(data.resumeStoredName ?? ""),
    resumeMimeType: String(data.resumeMimeType ?? "application/pdf"),
    submittedAt,
  };
};

const toSubmissionRowKey = (id: string) => `submission:${id}`;

const toUniqueDocId = (prefix: "email" | "id", value: string) => {
  return `unique:${prefix}:${encodeURIComponent(value.trim().toLowerCase())}`;
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
  const normalizedIdOrPassport = input.idOrPassportNumber.trim().toLowerCase();

  const savedFile = await saveCvPdf({
    fileName: input.resumeOriginalName,
    mimeType: input.resumeMimeType,
    fileBuffer: input.resumeBuffer,
  });

  try {
    const tableClient = await getAppTableClient();
    const submissionId = randomUUID();
    const submittedAt = Date.now();
    const normalizedIdValue = input.idOrPassportNumber.trim();
    await tableClient.submitTransaction([
      ["create", {
        partitionKey: CV_SCOPE,
        rowKey: toUniqueDocId("email", normalizedEmail),
        type: CV_UNIQUE_TYPE,
        keyType: "email",
        value: normalizedEmail,
        submissionId,
        createdAt: submittedAt,
      }],
      ["create", {
        partitionKey: CV_SCOPE,
        rowKey: toUniqueDocId("id", normalizedIdOrPassport),
        type: CV_UNIQUE_TYPE,
        keyType: "id",
        value: normalizedIdOrPassport,
        submissionId,
        createdAt: submittedAt,
      }],
      ["create", {
        partitionKey: CV_SCOPE,
        rowKey: toSubmissionRowKey(submissionId),
        type: CV_SUBMISSION_TYPE,
        firstName: input.firstName,
        lastName: input.lastName,
        email: normalizedEmail,
        phone: input.phone,
        idOrPassportNumber: normalizedIdValue,
        jobOpening: input.jobOpening,
        resumeOriginalName: input.resumeOriginalName,
        resumeStoredName: savedFile.storedFileName,
        resumeMimeType: savedFile.mimeType,
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
      jobOpening: input.jobOpening,
      resumeOriginalName: input.resumeOriginalName,
      resumeStoredName: savedFile.storedFileName,
      resumeMimeType: savedFile.mimeType,
      submittedAt,
    });
  } catch (error) {
    await deleteCvUpload(savedFile.storedFileName);

    if (error instanceof DuplicateApplicantError) {
      throw error;
    }

    if (isTableConflictError(error)) {
      throw new DuplicateApplicantError(
        "A user with this email or ID/passport already exists.",
      );
    }

    throw error;
  }
};
