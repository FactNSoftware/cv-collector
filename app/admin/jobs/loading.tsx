import { PortalShell } from "../../components/PortalShell";
import { PortalWorkspaceTableSkeleton } from "../../components/PortalDashboardPrimitives";

export default function AdminJobsLoading() {
  return (
    <PortalShell
      portal="admin"
      sessionEmail=""
      eyebrow="Jobs"
      title="Manage jobs"
      subtitle="Loading job workspace."
    >
      <PortalWorkspaceTableSkeleton />
    </PortalShell>
  );
}
