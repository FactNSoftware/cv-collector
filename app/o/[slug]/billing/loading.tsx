import { PortalShell } from "../../../components/PortalShell";
import { PortalBillingSkeleton } from "../../../components/PortalDashboardPrimitives";

export default function TenantBillingLoading() {
  return (
    <PortalShell
      portal="tenant"
      sessionEmail=""
      eyebrow="Billing"
      title="Billing and plan"
      subtitle="Loading billing details."
    >
      <PortalBillingSkeleton />
    </PortalShell>
  );
}
