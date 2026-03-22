import { PortalShell } from "../../components/PortalShell";
import { PortalSettingsSkeleton } from "../../components/PortalDashboardPrimitives";

export default function AdminSettingsLoading() {
  return (
    <PortalShell
      portal="admin"
      sessionEmail=""
      eyebrow="Settings"
      title="Admin settings"
      subtitle="Loading workspace settings."
    >
      <PortalSettingsSkeleton />
    </PortalShell>
  );
}
