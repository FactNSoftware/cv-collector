import { notFound } from "next/navigation";
import { ChatInboxPortal } from "../../../../components/ChatInboxPortal";
import { listChatInboxForRequester } from "../../../../../lib/acs-chat";
import { requireAdminPageSession } from "../../../../../lib/auth-guards";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{
    email: string;
  }>;
};

export default async function AdminChatUserPage({ params }: PageProps) {
  const session = await requireAdminPageSession();
  const { email } = await params;
  const participantKey = decodeURIComponent(email).trim().toLowerCase();
  const inbox = await listChatInboxForRequester(session.email);
  const matchingChats = inbox.items.filter((chat) => chat.participantKey === participantKey);

  if (matchingChats.length === 0) {
    notFound();
  }

  return (
    <ChatInboxPortal
      portal="admin"
      sessionEmail={session.email}
      chats={inbox.items}
      unreadCount={inbox.unreadCount}
      focusedParticipantKey={participantKey}
      focusedParticipantLabel={matchingChats[0]?.participantLabel ?? participantKey}
    />
  );
}
