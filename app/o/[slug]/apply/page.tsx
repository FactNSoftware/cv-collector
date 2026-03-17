import { requireOrganizationAdminPageSession } from "../../../../lib/auth-guards";
import { ensureCandidateProfile } from "../../../../lib/candidate-profile";
import { listCvSubmissionsByEmail } from "../../../../lib/cv-storage";
import { listPublishedJobs } from "../../../../lib/jobs";
import { PortalShell } from "../../../components/PortalShell";
import { CandidateApplyWorkspace } from "../../../components/CandidateApplyWorkspace";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

export default async function TenantApplyPage({ params }: Props) {
  const { slug } = await params;
  const { session } = await requireOrganizationAdminPageSession(slug);

  const [profile, jobs, submissions] = await Promise.all([
    ensureCandidateProfile(session.email),
    listPublishedJobs(),
    listCvSubmissionsByEmail(session.email),
  ]);

  return (
    <PortalShell
      portal="tenant"
      organizationSlug={slug}
      sessionEmail={session.email}
      eyebrow="Apply"
      title="Browse open positions"
      subtitle="Open a role to review the full job description before submitting your application."
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
