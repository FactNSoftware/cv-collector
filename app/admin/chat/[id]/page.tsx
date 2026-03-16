import { ApplicationChatWorkspace } from "../../../components/ApplicationChatWorkspace";
import { ensureApplicationChatAccess } from "../../../../lib/acs-chat";
import { requireAdminPageSession } from "../../../../lib/auth-guards";
import { buildApplicationChatWorkspaceViewModel } from "../../../../lib/chat-view-model";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function AdminApplicationChatPage(
  props: { params: Promise<{ id: string }> },
) {
  const session = await requireAdminPageSession();
  const { id } = await props.params;
  let access: Awaited<ReturnType<typeof ensureApplicationChatAccess>>;

  try {
    access = await ensureApplicationChatAccess(id, session.email);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load application chat.";

    if (/not found|not available|do not have access|only available/i.test(message)) {
      notFound();
    }

    throw error;
  }

  const viewModel = buildApplicationChatWorkspaceViewModel({
    portal: "admin",
    sessionEmail: session.email,
    access,
  });

  return (
    <ApplicationChatWorkspace
      portal="admin"
      sessionEmail={viewModel.sessionEmail}
      applicationId={viewModel.applicationId}
      jobCode={viewModel.jobCode}
      jobTitle={viewModel.jobTitle}
      chatThreadId={viewModel.chatThreadId}
      participantLabel={viewModel.participantLabel}
      primaryActionHref={viewModel.primaryActionHref}
      primaryActionLabel={viewModel.primaryActionLabel}
      secondaryActionHref={viewModel.secondaryActionHref}
      secondaryActionLabel={viewModel.secondaryActionLabel}
      isArchived={viewModel.isArchived}
      initialDeletedMessageIds={viewModel.initialDeletedMessageIds}
    />
  );
}
