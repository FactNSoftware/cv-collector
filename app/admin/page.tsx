import { AdminPortal } from "../components/AdminPortal";
import { requireAdminPageSession } from "../../lib/auth-guards";
import { listAdminAccounts } from "../../lib/admin-access";
import { listCandidateProfiles } from "../../lib/candidate-profile";
import { listJobs } from "../../lib/jobs";
import { listCvSubmissions } from "../../lib/cv-storage";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const session = await requireAdminPageSession();
  const [admins, profiles, submissions, jobs] = await Promise.all([
    listAdminAccounts(),
    listCandidateProfiles(),
    listCvSubmissions(),
    listJobs(),
  ]);

  const users = profiles.map((profile) => ({
    ...profile,
    submissions: submissions
      .filter((submission) => submission.email === profile.email)
      .map((submission) => ({
        id: submission.id,
        jobId: submission.jobId,
        jobCode: submission.jobCode,
        jobTitle: submission.jobTitle,
        jobOpening: submission.jobOpening,
        submittedAt: submission.submittedAt,
        resumeOriginalName: submission.resumeOriginalName,
        resumeDownloadUrl: `/api/admin/cv/${submission.id}/resume`,
      })),
  }));

  return (
    <AdminPortal
      sessionEmail={session.email}
      initialAdmins={admins}
      initialUsers={users}
      jobCount={jobs.length}
    />
  );
}
