import { AdminPortal } from "../components/AdminPortal";
import { requireAdminPageSession } from "../../lib/auth-guards";
import { listJobs } from "../../lib/jobs";
import { listAdminAccounts } from "../../lib/admin-access";
import { listCandidateProfiles } from "../../lib/candidate-profile";
import { listCvSubmissions } from "../../lib/cv-storage";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const session = await requireAdminPageSession();
  const [jobs, admins, profiles, submissions] = await Promise.all([
    listJobs(),
    listAdminAccounts(),
    listCandidateProfiles(),
    listCvSubmissions(),
  ]);

  const users = profiles.map((profile) => ({
    ...profile,
    submissions: submissions
      .filter((submission) => submission.email === profile.email)
      .map((submission) => ({
        id: submission.id,
        jobOpening: submission.jobOpening,
        submittedAt: submission.submittedAt,
        resumeOriginalName: submission.resumeOriginalName,
        resumeDownloadUrl: `/api/cv/${submission.id}/resume`,
      })),
  }));

  return (
    <AdminPortal
      sessionEmail={session.email}
      initialJobs={jobs}
      initialAdmins={admins}
      initialUsers={users}
    />
  );
}
