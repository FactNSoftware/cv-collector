import { ChatInboxPortal } from "../../components/ChatInboxPortal";
import { listChatInboxForRequester } from "../../../lib/acs-chat";
import { requireCandidatePageSession } from "../../../lib/auth-guards";
import { buildChatInboxPortalViewModel } from "../../../lib/chat-view-model";

export const dynamic = "force-dynamic";

export default async function CandidateChatInboxPage() {
  const session = await requireCandidatePageSession();
  const inbox = await listChatInboxForRequester(session.email);
  const viewModel = buildChatInboxPortalViewModel({
    portal: "candidate",
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
