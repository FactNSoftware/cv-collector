import { JobEditorForm } from "../../../components/JobEditorForm";
import { requireAdminPageSession } from "../../../../lib/auth-guards";

export const dynamic = "force-dynamic";

export default async function AdminJobCreatePage() {
  const session = await requireAdminPageSession();

  return (
    <JobEditorForm
      sessionEmail={session.email}
      mode="create"
      initialJob={null}
    />
  );
}
