import { AdminSettingsPortal } from "../../components/AdminSettingsPortal";
import { listAdminAccountsPage } from "../../../lib/admin-access";
import { requireAdminPageSession } from "../../../lib/auth-guards";

export const dynamic = "force-dynamic";

export default async function AdminSettingsPage() {
  const session = await requireAdminPageSession();
  const adminPage = await listAdminAccountsPage(20);

  return (
    <AdminSettingsPortal
      sessionEmail={session.email}
      initialAdmins={adminPage.items}
      initialPageInfo={adminPage.pageInfo}
    />
  );
}
