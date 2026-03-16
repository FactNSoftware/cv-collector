import { purgeDeletedAdminAccounts } from "./admin-access";
import { purgeDeletedCvSubmissions } from "./cv-storage";
import { purgeDeletedJobs } from "./jobs";

export const SOFT_DELETE_RETENTION_DAYS = 30;
export const SOFT_DELETE_RETENTION_MS = SOFT_DELETE_RETENTION_DAYS * 24 * 60 * 60 * 1000;

export type SoftDeleteCleanupResult = {
  jobs: number;
  applications: number;
  adminAccounts: number;
  total: number;
};

export const runSoftDeleteCleanup = async (
  olderThanMs = SOFT_DELETE_RETENTION_MS,
): Promise<SoftDeleteCleanupResult> => {
  const [jobs, applications, adminAccounts] = await Promise.all([
    purgeDeletedJobs(olderThanMs),
    purgeDeletedCvSubmissions(olderThanMs),
    purgeDeletedAdminAccounts(olderThanMs),
  ]);

  return {
    jobs,
    applications,
    adminAccounts,
    total: jobs + applications + adminAccounts,
  };
};
