import { AdminAuditPortal } from "../../components/AdminAuditPortal";
import { listAdminAccounts } from "../../../lib/admin-access";
import { listAdminAuditEventsPage } from "../../../lib/audit-log";
import { requireAdminPageSession } from "../../../lib/auth-guards";

export const dynamic = "force-dynamic";

export default async function AdminAuditPage() {
  const session = await requireAdminPageSession();
  const [admins, auditPage] = await Promise.all([
    listAdminAccounts(),
    listAdminAuditEventsPage({ limit: 30 }),
  ]);

  return (
    <AdminAuditPortal
      sessionEmail={session.email}
      admins={admins}
      initialLogs={auditPage.items}
      initialPageInfo={auditPage.pageInfo}
    />
  );
}
