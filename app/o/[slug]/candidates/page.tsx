import { requireOrganizationFunctionalityPageSession } from "../../../../lib/auth-guards";
import { listCvSubmissions } from "../../../../lib/cv-storage";
import { TenantCandidatesPortal } from "../../../components/TenantCandidatesPortal";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

export default async function TenantCandidatesPage({ params }: Props) {
  const { slug } = await params;
  const { session, featureKeys, functionalityKeys } = await requireOrganizationFunctionalityPageSession(
    slug,
    "tenant_candidates",
    "tenant_candidates.directory",
  );

  const submissions = await listCvSubmissions();

  return (
    <TenantCandidatesPortal
      sessionEmail={session.email}
      organizationSlug={slug}
      tenantFeatureKeys={featureKeys}
      tenantFunctionalityKeys={functionalityKeys}
      submissions={submissions.filter((s) => !s.isDeleted)}
    />
  );
}
