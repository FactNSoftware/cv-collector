import { PortalShell } from "../components/PortalShell";
import { PortalDashboardSkeleton } from "../components/PortalDashboardPrimitives";

export default function AdminLoading() {
  return (
    <PortalShell
      portal="admin"
      sessionEmail=""
      eyebrow="Admin Dashboard"
      title="Hiring operations overview"
      subtitle="Track jobs, candidates, review load, and ATS activity from one workspace."
    >
      <PortalDashboardSkeleton />
    </PortalShell>
  );
}
