import { requireOrganizationFeaturePageSession } from "../../../../lib/auth-guards";
import { getOrganizationBrandingSettingsBySlug } from "../../../../lib/organization-branding";
import { listOrganizationMemberships } from "../../../../lib/organizations";
import { getAppBaseUrl } from "../../../../lib/app-url";
import { TenantSettingsPortal } from "../../../components/TenantSettingsPortal";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

export default async function TenantSettingsPage({ params }: Props) {
  const { slug } = await params;
  const { session, organization, membership, isSuperAdmin, featureKeys, functionalityKeys } =
    await requireOrganizationFeaturePageSession(slug, "tenant_settings");

  const isOwner = isSuperAdmin || membership?.role === "owner";

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
      isOwner={isOwner}
      initialSettings={settings}
      platformHost={platformHost}
      tenantFeatureKeys={featureKeys}
      tenantFunctionalityKeys={functionalityKeys}
    />
  );
}
