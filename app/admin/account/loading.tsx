import { PortalShell } from "../../components/PortalShell";
import { PortalFormPageSkeleton } from "../../components/PortalDashboardPrimitives";

export default function AdminAccountLoading() {
  return (
    <PortalShell
      portal="admin"
      sessionEmail=""
      eyebrow="Account"
      title="Your account"
      subtitle="Loading account details."
    >
      <PortalFormPageSkeleton />
    </PortalShell>
  );
}
