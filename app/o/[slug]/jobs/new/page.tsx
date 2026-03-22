import { requireOrganizationFunctionalityPageSession } from "../../../../../lib/auth-guards";
import { JobEditorForm } from "../../../../components/JobEditorForm";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

export default async function TenantJobCreatePage({ params }: Props) {
  const { slug } = await params;
  const { session, featureKeys } = await requireOrganizationFunctionalityPageSession(
    slug,
    "tenant_jobs",
    "tenant_jobs.create",
    {
    ownerOnly: true,
    },
  );

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
