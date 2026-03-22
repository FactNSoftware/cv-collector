import { PortalShell } from "../../components/PortalShell";
import { TenantDashboardPageSkeleton } from "../../components/PortalDashboardPrimitives";

export default function TenantLoading() {
  return (
    <PortalShell
      portal="tenant"
      sessionEmail=""
      eyebrow="Organization Portal"
      title="Dashboard"
      subtitle="Loading workspace overview."
    >
      <TenantDashboardPageSkeleton />
    </PortalShell>
  );
}
