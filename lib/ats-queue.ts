import { evaluateResumeAgainstJob } from "./ats";
import { getAppTableClient } from "./azure-tables";
import {
  getCvSubmissionById,
  markCvSubmissionAtsFailed,
  markCvSubmissionAtsProcessing,
  markCvSubmissionAtsQueued,
  saveCvSubmissionAtsEvaluation,
} from "./cv-storage";
import { downloadCvUpload } from "./cv-file-service";
import { getJobAtsConfigSignature, getJobById } from "./jobs";

const ATS_QUEUE_SCOPE = "ats-queue";
const ATS_QUEUE_TYPE = "ats-job";

type AtsQueueJobStatus = "queued" | "processing" | "failed";

type AtsQueueJob = {
  partitionKey: string;
  rowKey: string;
  type: string;
  submissionId: string;
  reason: string;
  status: AtsQueueJobStatus;
  attemptCount: number;
  lastError: string;
  createdAt: number;
  updatedAt: number;
};

let activeProcessingPromise: Promise<void> | null = null;

const toQueueRowKey = (submissionId: string) => `ats:${submissionId}`;

const toQueueJob = (data: Record<string, unknown>): AtsQueueJob => ({
  partitionKey: String(data.partitionKey ?? ATS_QUEUE_SCOPE),
  rowKey: String(data.rowKey ?? ""),
  type: String(data.type ?? ATS_QUEUE_TYPE),
  submissionId: String(data.submissionId ?? ""),
  reason: String(data.reason ?? "submission"),
  status: data.status === "processing" || data.status === "failed" ? data.status : "queued",
  attemptCount: Number(data.attemptCount ?? 0),
  lastError: String(data.lastError ?? ""),
  createdAt: Number(data.createdAt ?? 0),
  updatedAt: Number(data.updatedAt ?? 0),
});

const listQueuedJobs = async () => {
  const tableClient = await getAppTableClient();
  const entities = tableClient.listEntities<Record<string, unknown>>({
    queryOptions: {
      filter: `PartitionKey eq '${ATS_QUEUE_SCOPE}' and type eq '${ATS_QUEUE_TYPE}'`,
    },
  });

  const jobs: AtsQueueJob[] = [];

  for await (const entity of entities) {
    const job = toQueueJob(entity);

    if (job.status === "queued") {
      jobs.push(job);
    }
  }

  return jobs.sort((left, right) => left.createdAt - right.createdAt);
};

export const enqueueAtsProcessing = async ({
  submissionId,
  reason,
}: {
  submissionId: string;
  reason: string;
}) => {
  console.info("[ATS] Queueing ATS processing.", { submissionId, reason });
  const tableClient = await getAppTableClient();
  const now = Date.now();

  await tableClient.upsertEntity({
    partitionKey: ATS_QUEUE_SCOPE,
    rowKey: toQueueRowKey(submissionId),
    type: ATS_QUEUE_TYPE,
    submissionId,
    reason,
    status: "queued",
    attemptCount: 0,
    lastError: "",
    createdAt: now,
    updatedAt: now,
  }, "Replace");

  await markCvSubmissionAtsQueued(submissionId);
};

const updateQueueJob = async (job: AtsQueueJob, patch: Partial<AtsQueueJob>) => {
  const tableClient = await getAppTableClient();
  const nextJob = {
    ...job,
    ...patch,
    updatedAt: Date.now(),
  };

  await tableClient.upsertEntity(nextJob, "Replace");
  return nextJob;
};

const deleteQueueJob = async (job: AtsQueueJob) => {
  const tableClient = await getAppTableClient();
  await tableClient.deleteEntity(job.partitionKey, job.rowKey);
};

const processQueueJob = async (job: AtsQueueJob) => {
  console.info("[ATS] Processing queue job.", {
    submissionId: job.submissionId,
    reason: job.reason,
    attemptCount: job.attemptCount,
  });
  const submission = await getCvSubmissionById(job.submissionId);

  if (!submission) {
    await deleteQueueJob(job);
    return;
  }

  if (!submission.jobId) {
    await markCvSubmissionAtsFailed(submission.id, "ATS processing failed because the job reference is missing.");
    await updateQueueJob(job, {
      status: "failed",
      attemptCount: job.attemptCount + 1,
      lastError: "Missing job reference.",
    });
    return;
  }

  const processingJob = await updateQueueJob(job, {
    status: "processing",
    attemptCount: job.attemptCount + 1,
  });
  await markCvSubmissionAtsProcessing(submission.id);

  try {
    const relatedJob = await getJobById(submission.jobId);

    if (!relatedJob) {
      throw new Error("Related job not found.");
    }

    const resumeBuffer = await downloadCvUpload(submission.resumeStoredName);
    const evaluation = await evaluateResumeAgainstJob({
      job: relatedJob,
      resumeBuffer,
    });

    await saveCvSubmissionAtsEvaluation(
      submission.id,
      evaluation,
      getJobAtsConfigSignature(relatedJob),
    );
    console.info("[ATS] Queue job completed.", {
      submissionId: submission.id,
      atsStatus: evaluation.method === "none" ? "none" : "success",
      atsMethod: evaluation.method,
      atsScore: evaluation.score,
    });
    await deleteQueueJob(processingJob);
  } catch (error) {
    const message = error instanceof Error ? error.message : "ATS processing failed.";
    console.error("[ATS] Queue job failed.", {
      submissionId: submission.id,
      error: message,
    });

    await markCvSubmissionAtsFailed(submission.id, message);
    await updateQueueJob(processingJob, {
      status: "failed",
      lastError: message,
    });
  }
};

const processPendingAtsJobs = async (limit = 3) => {
  const queuedJobs = await listQueuedJobs();
  const jobsToProcess = queuedJobs.slice(0, limit);

  for (const job of jobsToProcess) {
    await processQueueJob(job);
  }
};

export const triggerAtsQueueProcessing = ({ limit = 3, reason }: { limit?: number; reason: string }) => {
  if (activeProcessingPromise) {
    return activeProcessingPromise;
  }

  console.info("[ATS] Triggering queue processing.", { limit, reason });
  activeProcessingPromise = (async () => {
    try {
      await processPendingAtsJobs(limit);
    } finally {
      activeProcessingPromise = null;
    }
  })();

  return activeProcessingPromise;
};
