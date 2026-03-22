import { PortalShell } from "../../components/PortalShell";
import { SystemUsersPageSkeleton } from "../../components/PortalDashboardPrimitives";

export default function SystemUsersLoading() {
  return (
    <PortalShell
      portal="system"
      sessionEmail=""
      eyebrow="System"
      title="Super Admins"
      subtitle="Loading access management."
    >
      <SystemUsersPageSkeleton />
    </PortalShell>
  );
}
