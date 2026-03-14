import { notFound } from "next/navigation";
import { JobEditorForm } from "../../../../components/JobEditorForm";
import { requireAdminPageSession } from "../../../../../lib/auth-guards";
import { getJobById } from "../../../../../lib/jobs";

export const dynamic = "force-dynamic";

export default async function AdminJobEditPage(
  props: { params: Promise<{ id: string }> },
) {
  const session = await requireAdminPageSession();
  const { id } = await props.params;
  const job = await getJobById(id);

  if (!job) {
    notFound();
  }

  return (
    <JobEditorForm
      sessionEmail={session.email}
      mode="edit"
      initialJob={job}
    />
  );
}
