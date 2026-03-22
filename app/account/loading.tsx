import { PortalShell } from "../components/PortalShell";
import { PortalFormPageSkeleton } from "../components/PortalDashboardPrimitives";

export default function CandidateAccountLoading() {
  return (
    <PortalShell
      portal="candidate"
      sessionEmail=""
      eyebrow="Profile"
      title="Manage your profile"
      subtitle="Loading profile details."
      primaryActionHref="/apply"
      primaryActionLabel="Apply for a Job"
    >
      <PortalFormPageSkeleton />
    </PortalShell>
  );
}
