import { PortalShell } from "../../components/PortalShell";
import { SystemSubscriptionsPageSkeleton } from "../../components/PortalDashboardPrimitives";

export default function SystemSubscriptionsLoading() {
  return (
    <PortalShell
      portal="system"
      sessionEmail=""
      eyebrow="Subscriptions"
      title="Manage subscriptions"
      subtitle="Loading subscription workspace."
    >
      <SystemSubscriptionsPageSkeleton />
    </PortalShell>
  );
}
