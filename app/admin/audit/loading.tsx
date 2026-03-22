import { PortalShell } from "../../components/PortalShell";
import { PortalWorkspaceTableSkeleton } from "../../components/PortalDashboardPrimitives";

export default function AdminAuditLoading() {
  return (
    <PortalShell
      portal="admin"
      sessionEmail=""
      eyebrow="Audit"
      title="Audit trail"
      subtitle="Loading system activity."
    >
      <PortalWorkspaceTableSkeleton />
    </PortalShell>
  );
}
