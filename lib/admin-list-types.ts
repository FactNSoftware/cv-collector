import type { AdminAccount } from "./admin-access";
import type { AdminAuditLogRecord } from "./audit-log";
import type { CandidateProfile } from "./candidate-profile";
import type { CvSubmissionRecord, CvReviewStatus } from "./cv-storage";
import type { JobRecord } from "./jobs";

export type AdminJobListItem = JobRecord & {
  applicantCount: number;
};

export type AdminCandidateListItem = CandidateProfile & {
  submissionCount: number;
  latestSubmissionAt: string | null;
  latestReviewStatus: CvReviewStatus | "none";
  latestAtsStatus: CvSubmissionRecord["atsStatus"];
  latestAtsScore: number | null;
};

export type AdminAccountListItem = AdminAccount;
export type AdminAuditListItem = AdminAuditLogRecord;

export const buildAdminJobListItems = (
  jobs: JobRecord[],
  submissions: CvSubmissionRecord[],
): AdminJobListItem[] => {
  const applicantCounts = submissions.reduce<Record<string, number>>((accumulator, submission) => {
    accumulator[submission.jobId] = (accumulator[submission.jobId] ?? 0) + 1;
    return accumulator;
  }, {});

  return jobs
    .map((job) => ({
      ...job,
      applicantCount: applicantCounts[job.id] ?? 0,
    }))
    .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
};

export const buildAdminCandidateListItems = (
  profiles: CandidateProfile[],
  submissions: CvSubmissionRecord[],
): AdminCandidateListItem[] => {
  const submissionsByEmail = submissions.reduce<Record<string, CvSubmissionRecord[]>>((accumulator, submission) => {
    const email = submission.email.toLowerCase();
    accumulator[email] = accumulator[email] ? [...accumulator[email], submission] : [submission];
    return accumulator;
  }, {});

  return profiles
    .map((profile) => {
      const candidateSubmissions = submissionsByEmail[profile.email.toLowerCase()] ?? [];

      return {
        ...profile,
        submissionCount: candidateSubmissions.length,
        latestSubmissionAt: candidateSubmissions[0]?.submittedAt ?? null,
        latestReviewStatus: candidateSubmissions[0]?.reviewStatus ?? "none",
        latestAtsStatus: candidateSubmissions[0]?.atsStatus ?? "none",
        latestAtsScore: candidateSubmissions[0]?.atsScore ?? null,
      } satisfies AdminCandidateListItem;
    })
    .sort((left, right) => {
      const leftScore = left.latestAtsScore ?? -1;
      const rightScore = right.latestAtsScore ?? -1;

      if (rightScore !== leftScore) {
        return rightScore - leftScore;
      }

      if (left.latestSubmissionAt && right.latestSubmissionAt) {
        const submissionOrder = right.latestSubmissionAt.localeCompare(left.latestSubmissionAt);

        if (submissionOrder !== 0) {
          return submissionOrder;
        }
      }

      return left.email.localeCompare(right.email);
    });
};
