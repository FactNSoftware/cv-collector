import { AdminSettingsPortal } from "../../components/AdminSettingsPortal";
import { listAdminAccounts } from "../../../lib/admin-access";
import { requireAdminPageSession } from "../../../lib/auth-guards";

export const dynamic = "force-dynamic";

export default async function AdminSettingsPage() {
  const session = await requireAdminPageSession();
  const admins = await listAdminAccounts();

  return (
    <AdminSettingsPortal
      sessionEmail={session.email}
      initialAdmins={admins}
    />
  );
}
