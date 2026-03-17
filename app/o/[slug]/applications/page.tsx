import { requireOrganizationAdminPageSession } from "../../../../lib/auth-guards";
import { listCvSubmissionsByEmail } from "../../../../lib/cv-storage";
import { TenantApplicationsPortal } from "../../../components/TenantApplicationsPortal";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

export default async function TenantApplicationsPage({ params }: Props) {
  const { slug } = await params;
  const { session } = await requireOrganizationAdminPageSession(slug);

  const submissions = await listCvSubmissionsByEmail(session.email);

  return (
    <TenantApplicationsPortal
      sessionEmail={session.email}
      organizationSlug={slug}
      submissions={submissions.filter((s) => !s.isDeleted)}
    />
  );
}
