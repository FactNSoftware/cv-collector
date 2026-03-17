import { SuperAdminPortal } from "../components/SuperAdminPortal";
import { requireSuperAdminPageSession } from "../../lib/auth-guards";
import { listOrganizations } from "../../lib/organizations";

export const dynamic = "force-dynamic";

export default async function SystemPage() {
  const session = await requireSuperAdminPageSession();
  const organizations = await listOrganizations();

  return (
    <SuperAdminPortal
      sessionEmail={session.email}
      initialOrganizations={organizations}
    />
  );
}