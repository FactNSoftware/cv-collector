import { notFound } from "next/navigation";
import { AdminJobCandidates } from "../../../../components/AdminJobCandidates";
import { requireAdminPageSession } from "../../../../../lib/auth-guards";
import { getJobById } from "../../../../../lib/jobs";
import { listCvSubmissionsByJobId } from "../../../../../lib/cv-storage";

export const dynamic = "force-dynamic";

export default async function AdminJobCandidatesPage(
  props: { params: Promise<{ id: string }> },
) {
  const session = await requireAdminPageSession();
  const { id } = await props.params;
  const [job, submissions] = await Promise.all([
    getJobById(id),
    listCvSubmissionsByJobId(id),
  ]);

  if (!job) {
    notFound();
  }

  return (
    <AdminJobCandidates
      sessionEmail={session.email}
      job={job}
      submissions={submissions}
    />
  );
}
