import { notFound } from "next/navigation";
import { requireOrganizationFeaturePageSession } from "../../../../../../lib/auth-guards";
import { getJobById } from "../../../../../../lib/jobs";
import { JobEditorForm } from "../../../../../components/JobEditorForm";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string; id: string }> };

export default async function TenantJobEditPage({ params }: Props) {
  const { slug, id } = await params;
  const { session, featureKeys } = await requireOrganizationFeaturePageSession(slug, "tenant_jobs", {
    ownerOnly: true,
  });
  const job = await getJobById(id);

  if (!job || job.isDeleted) {
    notFound();
  }

  return (
    <JobEditorForm
      sessionEmail={session.email}
      mode="edit"
      initialJob={job}
      portal="tenant"
      organizationSlug={slug}
      tenantFeatureKeys={featureKeys}
    />
  );
}
