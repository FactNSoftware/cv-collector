import { notFound } from "next/navigation";
import { AdminJobPreviewClient } from "../../../../components/AdminJobPreviewClient";
import { requireAdminPageSession } from "../../../../../lib/auth-guards";
import { getJobById } from "../../../../../lib/jobs";

export const dynamic = "force-dynamic";

export default async function AdminJobPreviewPage(
  props: { params: Promise<{ id: string }> },
) {
  const session = await requireAdminPageSession();
  const { id } = await props.params;
  const job = await getJobById(id);

  if (!job) {
    notFound();
  }

  return <AdminJobPreviewClient sessionEmail={session.email} job={job} />;
}
