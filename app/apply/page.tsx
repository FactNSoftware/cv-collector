import { CandidateApplyWorkspace } from "../components/CandidateApplyWorkspace";
import { PortalShell } from "../components/PortalShell";
import { requireCandidatePageSession } from "../../lib/auth-guards";
import { ensureCandidateProfile } from "../../lib/candidate-profile";
import { listPublishedJobs } from "../../lib/jobs";
import { listCvSubmissionsByEmail } from "../../lib/cv-storage";

export default async function ApplyPage() {
  const session = await requireCandidatePageSession();
  const [profile, jobs, submissions] = await Promise.all([
    ensureCandidateProfile(session.email),
    listPublishedJobs(),
    listCvSubmissionsByEmail(session.email),
  ]);

  return (
    <PortalShell
      portal="candidate"
      sessionEmail={session.email}
      eyebrow="Apply"
      title="Browse published jobs"
      subtitle="Open a role to review the full job description before you submit your application."
    >
      <CandidateApplyWorkspace
        sessionEmail={session.email}
        profile={profile}
        jobs={jobs}
        submissions={submissions}
      />
    </PortalShell>
  );
}
