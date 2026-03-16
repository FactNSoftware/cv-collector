import { ChatInboxPortal } from "../../components/ChatInboxPortal";
import { listChatInboxForRequester } from "../../../lib/acs-chat";
import { requireAdminPageSession } from "../../../lib/auth-guards";
import { buildChatInboxPortalViewModel } from "../../../lib/chat-view-model";

export const dynamic = "force-dynamic";

export default async function AdminChatInboxPage() {
  const session = await requireAdminPageSession();
  const inbox = await listChatInboxForRequester(session.email);
  const viewModel = buildChatInboxPortalViewModel({
    portal: "admin",
    sessionEmail: session.email,
    inbox,
  });

  return (
    <ChatInboxPortal
      portal={viewModel.portal}
      sessionEmail={viewModel.sessionEmail}
      chats={viewModel.chats}
      unreadCount={viewModel.unreadCount}
    />
  );
}
