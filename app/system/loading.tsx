import { PortalShell } from "../components/PortalShell";
import { PortalDashboardSkeleton } from "../components/PortalDashboardPrimitives";

export default function SystemLoading() {
  return (
    <PortalShell
      portal="system"
      sessionEmail=""
      eyebrow="System Dashboard"
      title="System overview"
      subtitle="Loading platform analytics."
    >
      <PortalDashboardSkeleton />
    </PortalShell>
  );
}
