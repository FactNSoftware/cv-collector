import { PortalShell } from "../../../components/PortalShell";
import { PortalFormPageSkeleton } from "../../../components/PortalDashboardPrimitives";

export default function TenantAccountLoading() {
  return (
    <PortalShell
      portal="tenant"
      sessionEmail=""
      eyebrow="Account"
      title="Your account"
      subtitle="Loading account details."
    >
      <PortalFormPageSkeleton />
    </PortalShell>
  );
}
