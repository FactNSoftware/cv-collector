import { notFound, redirect } from "next/navigation";
import { CandidateJobApplyView } from "../../components/CandidateJobApplyView";
import { PortalShell } from "../../components/PortalShell";
import { getPostAuthRedirectPath } from "../../../lib/auth-guards";
import { ensureCandidateProfile } from "../../../lib/candidate-profile";
import { getAuthSessionFromCookies } from "../../../lib/auth-session";
import { getJobById } from "../../../lib/jobs";
import { listCvSubmissionsByEmail } from "../../../lib/cv-storage";

export const dynamic = "force-dynamic";

type ApplyJobPageProps = {
  params: Promise<{
    jobId: string;
  }>;
};

export default async function ApplyJobPage({ params }: ApplyJobPageProps) {
  const { jobId } = await params;
  const requestedPath = `/apply/${jobId}`;
  const job = await getJobById(jobId);

  if (!job || !job.isPublished) {
    notFound();
  }

  const session = await getAuthSessionFromCookies();

  if (!session) {
    redirect(`/?next=${encodeURIComponent(requestedPath)}`);
  }

  const redirectPath = await getPostAuthRedirectPath(session.email, requestedPath);

  if (redirectPath !== requestedPath) {
    redirect(redirectPath);
  }

  const [profile, submissions] = await Promise.all([
    ensureCandidateProfile(session.email),
    listCvSubmissionsByEmail(session.email),
  ]);

  const existingSubmission = submissions.find(
    (submission) => submission.jobId === job.id && submission.reviewStatus !== "rejected",
  ) ?? null;
  const rejectedAttempts = submissions
    .filter((submission) => submission.jobId === job.id && submission.reviewStatus === "rejected")
    .sort((left, right) => new Date(right.submittedAt).getTime() - new Date(left.submittedAt).getTime());

  return (
    <PortalShell
      portal="candidate"
      sessionEmail={session.email}
      eyebrow="Job Details"
      title={job.title}
      subtitle={`Review ${job.code} and submit your application when you are ready.`}
    >
      <CandidateJobApplyView
        sessionEmail={session.email}
        initialProfile={profile}
        job={job}
        existingSubmission={existingSubmission}
        rejectedAttempts={rejectedAttempts}
      />
    </PortalShell>
  );
}
