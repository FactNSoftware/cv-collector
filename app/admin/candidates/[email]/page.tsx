import { notFound } from "next/navigation";
import { AdminCandidateDetail } from "../../../components/AdminCandidateDetail";
import { isAdminEmail } from "../../../../lib/admin-access";
import { triggerAtsQueueProcessing } from "../../../../lib/ats-queue";
import { requireAdminPageSession } from "../../../../lib/auth-guards";
import { getCandidateProfileByEmail } from "../../../../lib/candidate-profile";
import { listCvSubmissionsByEmail } from "../../../../lib/cv-storage";
import { getJobById, type JobRecord } from "../../../../lib/jobs";

export const dynamic = "force-dynamic";

export default async function AdminCandidateDetailPage(
  props: { params: Promise<{ email: string }> },
) {
  const session = await requireAdminPageSession();
  const { email } = await props.params;
  void triggerAtsQueueProcessing({ reason: "admin_candidate_detail_page", limit: 2 });
  const candidateEmail = decodeURIComponent(email);
  const [candidate, submissions, candidateIsAdmin] = await Promise.all([
    getCandidateProfileByEmail(candidateEmail),
    listCvSubmissionsByEmail(candidateEmail),
    isAdminEmail(candidateEmail),
  ]);

  if (!candidate) {
    notFound();
  }

  const jobIds = [...new Set(submissions.map((submission) => submission.jobId).filter(Boolean))];
  const jobs = await Promise.all(jobIds.map((jobId) => getJobById(jobId)));
  const jobsById = jobs.reduce<Record<string, JobRecord>>((accumulator, job) => {
    if (job) {
      accumulator[job.id] = job;
    }

    return accumulator;
  }, {});

  return (
    <AdminCandidateDetail
      sessionEmail={session.email}
      candidate={candidate}
      submissions={submissions}
      jobsById={jobsById}
      isAdmin={candidateIsAdmin}
    />
  );
}
