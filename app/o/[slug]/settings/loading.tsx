import { PortalShell } from "../../../components/PortalShell";
import { PortalSettingsSkeleton } from "../../../components/PortalDashboardPrimitives";

export default function TenantSettingsLoading() {
  return (
    <PortalShell
      portal="tenant"
      sessionEmail=""
      eyebrow="Settings"
      title="Organization settings"
      subtitle="Loading organization settings."
    >
      <PortalSettingsSkeleton />
    </PortalShell>
  );
}
