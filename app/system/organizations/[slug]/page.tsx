import { TenantSettingsPortal } from "../../../components/TenantSettingsPortal";
import { requireSuperAdminPageSession } from "../../../../lib/auth-guards";
import { getOrganizationBySlug, listOrganizationMemberships } from "../../../../lib/organizations";
import { getOrganizationBrandingSettingsBySlug } from "../../../../lib/organization-branding";
import { getAppBaseUrl } from "../../../../lib/app-url";

export const dynamic = "force-dynamic";

export default async function SystemOrgDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const session = await requireSuperAdminPageSession();
  const { slug } = await params;

  const organization = await getOrganizationBySlug(slug);

  if (!organization) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold">Organization not found</h1>
          <p className="text-muted mt-2">
            <a href="/system/organizations" className="text-blue-600 hover:underline">
              Back to organizations
            </a>
          </p>
        </div>
      </div>
    );
  }

  const [members, { settings }] = await Promise.all([
    listOrganizationMemberships(organization.id),
    getOrganizationBrandingSettingsBySlug(slug),
  ]);

  const platformHost = new URL(getAppBaseUrl()).hostname;

  return (
    <TenantSettingsPortal
      sessionEmail={session.email}
      organization={organization}
      members={members}
      isOwner={true}
      initialSettings={settings}
      platformHost={platformHost}
      backHref="/system/organizations"
    />
  );
}
