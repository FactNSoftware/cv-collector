import { SystemUsersPortal } from "../../components/SystemUsersPortal";
import { requireSuperAdminPageSession } from "../../../lib/auth-guards";
import { listSuperAdminAccounts } from "../../../lib/super-admin-access";

export const dynamic = "force-dynamic";

export default async function SystemUsersPage() {
  const session = await requireSuperAdminPageSession();
  const accounts = await listSuperAdminAccounts();

  return (
    <SystemUsersPortal
      sessionEmail={session.email}
      initialAccounts={accounts}
    />
  );
}
