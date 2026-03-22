import { PortalShell } from "../../components/PortalShell";
import { PortalFormPageSkeleton } from "../../components/PortalDashboardPrimitives";

export default function SystemAccountLoading() {
  return (
    <PortalShell
      portal="system"
      sessionEmail=""
      eyebrow="Account"
      title="Your account"
      subtitle="Loading account details."
    >
      <PortalFormPageSkeleton />
    </PortalShell>
  );
}
