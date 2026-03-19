import { SystemDashboard } from "../components/SystemDashboard";
import { requireSuperAdminPageSession } from "../../lib/auth-guards";

export const dynamic = "force-dynamic";

export default async function SystemPage() {
  const session = await requireSuperAdminPageSession();

  return <SystemDashboard sessionEmail={session.email} />;
}