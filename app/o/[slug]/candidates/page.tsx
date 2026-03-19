import { requireOrganizationFeaturePageSession } from "../../../../lib/auth-guards";
import { listCvSubmissions } from "../../../../lib/cv-storage";
import { TenantCandidatesPortal } from "../../../components/TenantCandidatesPortal";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

export default async function TenantCandidatesPage({ params }: Props) {
  const { slug } = await params;
  const { session, featureKeys } = await requireOrganizationFeaturePageSession(
    slug,
    "tenant_candidates",
  );

  const submissions = await listCvSubmissions();

  return (
    <TenantCandidatesPortal
      sessionEmail={session.email}
      organizationSlug={slug}
      tenantFeatureKeys={featureKeys}
      submissions={submissions.filter((s) => !s.isDeleted)}
    />
  );
}
