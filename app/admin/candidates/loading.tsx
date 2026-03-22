import { PortalShell } from "../../components/PortalShell";
import { PortalWorkspaceTableSkeleton } from "../../components/PortalDashboardPrimitives";

export default function AdminCandidatesLoading() {
  return (
    <PortalShell
      portal="admin"
      sessionEmail=""
      eyebrow="Candidates"
      title="Candidate review"
      subtitle="Loading candidate workspace."
    >
      <PortalWorkspaceTableSkeleton />
    </PortalShell>
  );
}
