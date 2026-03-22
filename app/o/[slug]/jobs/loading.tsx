import { PortalShell } from "../../../components/PortalShell";
import { TenantJobsPageSkeleton } from "../../../components/PortalDashboardPrimitives";

export default function TenantJobsLoading() {
  return (
    <PortalShell
      portal="tenant"
      sessionEmail=""
      eyebrow="Jobs"
      title="Manage jobs"
      subtitle="Loading job workspace."
    >
      <TenantJobsPageSkeleton />
    </PortalShell>
  );
}
