import { requireOrganizationFeaturePageSession } from "../../../../../lib/auth-guards";
import { JobEditorForm } from "../../../../components/JobEditorForm";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

export default async function TenantJobCreatePage({ params }: Props) {
  const { slug } = await params;
  const { session, featureKeys } = await requireOrganizationFeaturePageSession(slug, "tenant_jobs", {
    ownerOnly: true,
  });

  return (
    <JobEditorForm
      sessionEmail={session.email}
      mode="create"
      initialJob={null}
      portal="tenant"
      organizationSlug={slug}
      tenantFeatureKeys={featureKeys}
    />
  );
}
