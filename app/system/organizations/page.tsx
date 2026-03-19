import { OrganizationsList } from "../../components/OrganizationsList";
import { requireSuperAdminPageSession } from "../../../lib/auth-guards";
import { listOrganizationsPage } from "../../../lib/organizations";
import { DEFAULT_PAGE_SIZE } from "../../../lib/pagination";

export const dynamic = "force-dynamic";

export default async function SystemOrganizationsPage() {
  const session = await requireSuperAdminPageSession();
  const page = await listOrganizationsPage(DEFAULT_PAGE_SIZE);

  return (
    <OrganizationsList
      sessionEmail={session.email}
      initialOrganizations={page.items}
      initialPageInfo={page.pageInfo}
    />
  );
}