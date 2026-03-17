import { requireOrganizationAdminPageSession } from "../../../../lib/auth-guards";
import { listCvSubmissions } from "../../../../lib/cv-storage";
import { TenantCandidatesPortal } from "../../../components/TenantCandidatesPortal";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

export default async function TenantCandidatesPage({ params }: Props) {
  const { slug } = await params;
  const { session } = await requireOrganizationAdminPageSession(slug);

  const submissions = await listCvSubmissions();

  return (
    <TenantCandidatesPortal
      sessionEmail={session.email}
      organizationSlug={slug}
      submissions={submissions.filter((s) => !s.isDeleted)}
    />
  );
}
