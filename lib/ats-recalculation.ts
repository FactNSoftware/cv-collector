import type { CvSubmissionRecord } from "./cv-storage";
import type { JobRecord } from "./jobs";

export const canSubmissionAtsBeRecalculated = (
  submission: Pick<CvSubmissionRecord, "reviewStatus" | "atsStatus" | "atsConfigSignature" | "atsScore">,
  job: Pick<
    JobRecord,
    | "atsEnabled"
    | "atsRequiredKeywords"
    | "atsPreferredKeywords"
    | "atsMinimumYearsExperience"
    | "atsRequiredEducation"
    | "atsRequiredCertifications"
  > & {
    atsConfigSignature?: string;
  },
) => {
  if (!job?.atsEnabled) {
    return false;
  }

  if (submission.reviewStatus !== "pending") {
    return false;
  }

  if (submission.atsStatus === "queued" || submission.atsStatus === "processing") {
    return false;
  }

  return true;
};
