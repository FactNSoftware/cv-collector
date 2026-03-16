import type { ApplicationChatAccess, ChatInboxSummary } from "./acs-chat";

export type ChatWorkspaceViewModel = {
  sessionEmail: string;
  applicationId: string;
  jobCode: string;
  jobTitle: string;
  chatThreadId: string;
  participantLabel: string;
  primaryActionHref: string;
  primaryActionLabel: string;
  secondaryActionHref?: string;
  secondaryActionLabel?: string;
  isArchived: boolean;
  initialDeletedMessageIds: string[];
};

export const buildApplicationChatWorkspaceViewModel = ({
  portal,
  sessionEmail,
  access,
}: {
  portal: "admin" | "candidate";
  sessionEmail: string;
  access: ApplicationChatAccess;
}): ChatWorkspaceViewModel => {
  const candidateName = access.submission
    ? [access.submission.firstName, access.submission.lastName].filter(Boolean).join(" ").trim()
    : "";

  return {
    sessionEmail,
    applicationId: access.chat.applicationId,
    jobCode: access.submission?.jobCode ?? access.chat.jobCode,
    jobTitle: access.submission?.jobTitle || access.submission?.jobOpening || access.chat.jobTitle,
    chatThreadId: access.chat.chatThreadId,
    participantLabel: portal === "admin"
      ? (candidateName || access.submission?.email || access.chat.candidateEmail)
      : "Hiring team",
    primaryActionHref: portal === "admin"
      ? (access.submission ? `/admin/jobs/${access.submission.jobId}/candidates` : "/admin/chat")
      : "/applications/history",
    primaryActionLabel: portal === "admin"
      ? (access.submission ? "Back to Applicants" : "Back to Chats")
      : "Back to Applications",
    secondaryActionHref: portal === "admin"
      ? (access.submission ? `/admin/candidates/${encodeURIComponent(access.submission.email)}` : undefined)
      : (access.submission ? `/apply/${access.submission.jobId}` : undefined),
    secondaryActionLabel: portal === "admin"
      ? (access.submission ? "View Candidate" : undefined)
      : (access.submission ? "View Job" : undefined),
    isArchived: access.isArchived,
    initialDeletedMessageIds: [],
  };
};

export const buildChatInboxPortalViewModel = ({
  portal,
  sessionEmail,
  inbox,
  focusedParticipantKey,
  focusedParticipantLabel,
}: {
  portal: "admin" | "candidate";
  sessionEmail: string;
  inbox: ChatInboxSummary;
  focusedParticipantKey?: string;
  focusedParticipantLabel?: string;
}) => ({
  portal,
  sessionEmail,
  chats: inbox.items,
  unreadCount: inbox.unreadCount,
  focusedParticipantKey,
  focusedParticipantLabel,
});
