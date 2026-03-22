import { requireOrganizationFunctionalityPageSession } from "../../../../lib/auth-guards";
import { listJobs } from "../../../../lib/jobs";
import { TenantJobsPortal } from "../../../components/TenantJobsPortal";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

export default async function TenantJobsPage({ params }: Props) {
  const { slug } = await params;
  const { session, membership, isSuperAdmin, featureKeys, functionalityKeys } = await requireOrganizationFunctionalityPageSession(
    slug,
    "tenant_jobs",
    "tenant_jobs.list",
  );
  const isOwnerOrAdmin =
    isSuperAdmin || membership?.role === "owner" || membership?.role === "admin";

  const jobs = await listJobs();

  return (
    <TenantJobsPortal
      sessionEmail={session.email}
      organizationSlug={slug}
      tenantFeatureKeys={featureKeys}
      tenantFunctionalityKeys={functionalityKeys}
      jobs={jobs.filter((j) => !j.isDeleted)}
      isOwnerOrAdmin={isOwnerOrAdmin}
    />
  );
}
