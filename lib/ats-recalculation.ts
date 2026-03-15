import type { CvSubmissionRecord } from "./cv-storage";
import type { JobRecord } from "./jobs";

export const canSubmissionAtsBeRecalculated = (
  submission: Pick<CvSubmissionRecord, "atsStatus" | "atsConfigSignature" | "atsScore">,
  job: Pick<JobRecord, "atsEnabled" | "atsRequiredKeywords" | "atsPreferredKeywords"> & {
    atsConfigSignature?: string;
  },
) => {
  if (!job?.atsEnabled) {
    return false;
  }

  if (submission.atsStatus === "queued" || submission.atsStatus === "processing") {
    return false;
  }

  if (
    submission.atsStatus === "success"
    && submission.atsScore !== null
    && !submission.atsConfigSignature
  ) {
    return false;
  }

  return submission.atsStatus !== "success" || submission.atsConfigSignature !== job.atsConfigSignature;
};
