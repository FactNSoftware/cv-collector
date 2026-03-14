import { AdminJobsIndex } from "../../components/AdminJobsIndex";
import { requireAdminPageSession } from "../../../lib/auth-guards";
import { listJobs } from "../../../lib/jobs";
import { listCvSubmissions } from "../../../lib/cv-storage";

export const dynamic = "force-dynamic";

export default async function AdminJobsPage() {
  const session = await requireAdminPageSession();
  const [jobs, submissions] = await Promise.all([
    listJobs(),
    listCvSubmissions(),
  ]);

  const jobsWithCounts = jobs.map((job) => ({
    ...job,
    applicantCount: submissions.filter((submission) => submission.jobId === job.id).length,
  }));

  return (
    <AdminJobsIndex
      sessionEmail={session.email}
      jobs={jobsWithCounts}
    />
  );
}
