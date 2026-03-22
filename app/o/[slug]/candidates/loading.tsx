import { PortalShell } from "../../../components/PortalShell";
import { TenantCandidatesPageSkeleton } from "../../../components/PortalDashboardPrimitives";

export default function TenantCandidatesLoading() {
  return (
    <PortalShell
      portal="tenant"
      sessionEmail=""
      eyebrow="Candidates"
      title="Candidate pipeline"
      subtitle="Loading candidate workspace."
    >
      <TenantCandidatesPageSkeleton />
    </PortalShell>
  );
}
