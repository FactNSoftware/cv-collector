import { randomUUID } from "crypto";
import { OperationInput } from "@azure/cosmos";
import {
  deleteCvUpload,
  saveCvPdf,
} from "./cv-file-service";
import {
  getAppContainer,
  isCosmosConflictError,
  isCosmosNotFoundError,
} from "./azure-cosmos";

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
  id: string;
  scope: string;
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
    id: submission.id,
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
  id: string,
  data: Record<string, unknown>,
): CvSubmissionDocument => {
  const submittedAtValue = Number(data.submittedAt ?? 0);
  const submittedAt = Number.isFinite(submittedAtValue)
    ? submittedAtValue
    : Date.now();

  return {
    id,
    scope: String(data.scope ?? CV_SCOPE),
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

const toUniqueDocId = (prefix: "email" | "id", value: string) => {
  return `${prefix}:${encodeURIComponent(value.trim().toLowerCase())}`;
};

export const listCvSubmissions = async (): Promise<CvSubmissionRecord[]> => {
  const container = getAppContainer();
  const query = {
    query: "SELECT * FROM c WHERE c.scope = @scope AND c.type = @type ORDER BY c.submittedAt DESC",
    parameters: [
      { name: "@scope", value: CV_SCOPE },
      { name: "@type", value: CV_SUBMISSION_TYPE },
    ],
  };

  const { resources } = await container.items.query<Record<string, unknown>>(query).fetchAll();

  return resources.map((item) => toRecord(toSubmissionDoc(String(item.id ?? ""), item)));
};

export const getCvSubmissionById = async (
  id: string,
): Promise<CvSubmissionRecord | null> => {
  if (!id) {
    return null;
  }

  const container = getAppContainer();

  try {
    const response = await container
      .item(id, CV_SCOPE)
      .read<Record<string, unknown>>();

    const doc = toSubmissionDoc(id, response.resource ?? {});

    if (doc.type !== CV_SUBMISSION_TYPE) {
      return null;
    }

    return toRecord(doc);
  } catch (error) {
    if (isCosmosNotFoundError(error)) {
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
    const container = getAppContainer();
    const submissionId = randomUUID();
    const submittedAt = Date.now();
    const normalizedIdValue = input.idOrPassportNumber.trim();

    const operations: OperationInput[] = [
      {
        operationType: "Create",
        resourceBody: {
          id: toUniqueDocId("email", normalizedEmail),
          scope: CV_SCOPE,
          type: CV_UNIQUE_TYPE,
          keyType: "email",
          value: normalizedEmail,
          submissionId,
          createdAt: submittedAt,
        },
      },
      {
        operationType: "Create",
        resourceBody: {
          id: toUniqueDocId("id", normalizedIdOrPassport),
          scope: CV_SCOPE,
          type: CV_UNIQUE_TYPE,
          keyType: "id",
          value: normalizedIdOrPassport,
          submissionId,
          createdAt: submittedAt,
        },
      },
      {
        operationType: "Create",
        resourceBody: {
          id: submissionId,
          scope: CV_SCOPE,
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
        },
      },
    ];

    const response = await container.items.batch(operations, CV_SCOPE);
    const operationResults = response.result ?? [];
    const hasConflict = operationResults.some((item) => item.statusCode === 409);

    if (hasConflict) {
      throw new DuplicateApplicantError(
        "A user with this email or ID/passport already exists.",
      );
    }

    const hasFailure = operationResults.some((item) => item.statusCode >= 400);

    if (hasFailure) {
      throw new Error("Failed to persist CV submission in Azure Cosmos DB.");
    }

    return toRecord({
      id: submissionId,
      scope: CV_SCOPE,
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

    if (isCosmosConflictError(error)) {
      throw new DuplicateApplicantError(
        "A user with this email or ID/passport already exists.",
      );
    }

    throw error;
  }
};