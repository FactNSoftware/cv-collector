import { PortalShell } from "../../components/PortalShell";
import { OrganizationsListPageSkeleton } from "../../components/PortalDashboardPrimitives";

export default function SystemOrganizationsLoading() {
  return (
    <PortalShell
      portal="system"
      sessionEmail=""
      eyebrow="Organizations"
      title="Manage organizations"
      subtitle="Loading organization directory."
    >
      <OrganizationsListPageSkeleton />
    </PortalShell>
  );
}
