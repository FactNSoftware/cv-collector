"use client";

import { AzureCommunicationTokenCredential } from "@azure/communication-common";
import { ChatClient } from "@azure/communication-chat";
import type { ChatThreadClient } from "@azure/communication-chat";
import type { ChatMessage } from "@azure/communication-chat";
import type { ReadReceiptReceivedEvent, TypingIndicatorReceivedEvent } from "@azure/communication-chat";
import { Check, MessageSquare, Pencil, Send, Trash2, X } from "lucide-react";
import type { KeyboardEvent as ReactKeyboardEvent } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { PortalShell } from "./PortalShell";
import { useToast } from "./ToastProvider";

type ChatUiMessage = {
  id: string;
  content: string;
  createdAt: string;
  editedAt: string | null;
  senderDisplayName: string;
  senderAcsUserId: string | null;
  isCurrentUser: boolean;
  kind: "message" | "system";
  isDeleted: boolean;
  seenByOther: boolean;
};

type ApplicationChatWorkspaceProps = {
  portal: "admin" | "candidate";
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
  isArchived?: boolean;
  initialDeletedMessageIds?: string[];
};

const toCommunicationUserId = (message: Pick<ChatMessage, "sender">) => {
  if (message.sender && "communicationUserId" in message.sender) {
    return message.sender.communicationUserId ?? null;
  }

  return null;
};

const toUiMessage = (
  message: ChatMessage,
  currentAcsUserId: string | null,
  latestOtherReadOn: number | null,
): ChatUiMessage | null => {
  const senderAcsUserId = toCommunicationUserId(message);
  const rawContent = message.content?.message?.trim() ?? "";
  const isDeleted = Boolean(message.deletedOn);
  const kind = message.type === "text" || message.type === "html" ? "message" : "system";

  if (!rawContent && kind === "message" && !isDeleted) {
    return null;
  }

  const createdAt = message.createdOn.toISOString();
  const editedAt = message.editedOn ? message.editedOn.toISOString() : null;
  const isCurrentUser = Boolean(currentAcsUserId && senderAcsUserId === currentAcsUserId);
  const seenByOther = Boolean(
    kind === "message"
    && isCurrentUser
    && latestOtherReadOn
    && message.createdOn.getTime() <= latestOtherReadOn,
  );

  return {
    id: message.id,
    content: isDeleted
      ? "Message deleted."
      : rawContent || (message.type === "participantAdded" ? "Participants updated." : "System update."),
    createdAt,
    editedAt,
    senderDisplayName: message.senderDisplayName?.trim() || "System",
    senderAcsUserId,
    isCurrentUser,
    kind,
    isDeleted,
    seenByOther,
  };
};

const sortMessages = (items: ChatUiMessage[]) => {
  return [...items].sort((left, right) => left.createdAt.localeCompare(right.createdAt));
};

const formatPresenceTimestamp = (value: string) => {
  const target = new Date(value);
  const diffMs = Date.now() - target.getTime();

  if (!Number.isFinite(diffMs) || diffMs < 0) {
    return `Last seen ${target.toLocaleString()}`;
  }

  const diffMinutes = Math.floor(diffMs / 60_000);

  if (diffMinutes < 1) {
    return "Last seen just now";
  }

  if (diffMinutes < 60) {
    return `Last seen ${diffMinutes} min ago`;
  }

  const diffHours = Math.floor(diffMinutes / 60);

  if (diffHours < 24) {
    return `Last seen ${diffHours} hr ago`;
  }

  return `Last seen ${target.toLocaleString()}`;
};

const normalizeChatErrorMessage = (error: unknown) => {
  const fallback = "Chat connection is temporarily unstable. Retrying...";
  const rawMessage = error instanceof Error ? error.message : typeof error === "string" ? error : "";
  let message = rawMessage;

  if (rawMessage.trim().startsWith("{")) {
    try {
      const parsed = JSON.parse(rawMessage) as {
        CommunicationError?: { Code?: string; Message?: string };
      };
      const communicationError = parsed.CommunicationError;

      if (communicationError?.Code && communicationError.Message) {
        message = `${communicationError.Code}: ${communicationError.Message}`;
      } else if (communicationError?.Code) {
        message = communicationError.Code;
      }
    } catch {
      message = rawMessage;
    }
  }

  if (/TooManyRequests/i.test(message)) {
    return {
      message: "Chat is temporarily busy. Retrying shortly...",
      backoffMs: 10_000,
    };
  }

  if (/Load failed|Failed to fetch|Error sending request/i.test(message)) {
    return {
      message: "Chat connection is temporarily unstable. Retrying...",
      backoffMs: 8_000,
    };
  }

  return {
    message: message || fallback,
    backoffMs: 0,
  };
};

const isTransientConnectionMessage = (value: string | null) => Boolean(
  value && /temporarily busy|temporarily unstable|retrying/i.test(value),
);

const haveSameIds = (left: string[], right: string[]) => (
  left.length === right.length && left.every((item, index) => item === right[index])
);

export function ApplicationChatWorkspace({
  portal,
  sessionEmail,
  applicationId,
  jobCode,
  jobTitle,
  chatThreadId,
  participantLabel,
  primaryActionHref,
  primaryActionLabel,
  secondaryActionHref,
  secondaryActionLabel,
  isArchived = false,
  initialDeletedMessageIds = [],
}: ApplicationChatWorkspaceProps) {
  const { showToast } = useToast();
  const [messages, setMessages] = useState<ChatUiMessage[]>([]);
  const [composer, setComposer] = useState("");
  const [isConnecting, setIsConnecting] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState("");
  const [messageActionId, setMessageActionId] = useState<string | null>(null);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [lastSeenAt, setLastSeenAt] = useState<string | null>(null);
  const [typingDisplayName, setTypingDisplayName] = useState<string | null>(null);
  const currentAcsUserIdRef = useRef<string | null>(null);
  const threadClientRef = useRef<ChatThreadClient | null>(null);
  const otherParticipantIdsRef = useRef<string[]>([]);
  const latestOtherReadOnRef = useRef<number | null>(null);
  const participantStateLoadedAtRef = useRef(0);
  const lastSentReadReceiptMessageIdRef = useRef<string | null>(null);
  const loadMessagesInFlightRef = useRef(false);
  const pendingRefreshRef = useRef(false);
  const acsBackoffUntilRef = useRef(0);
  const endRef = useRef<HTMLDivElement | null>(null);
  const messageListRef = useRef<HTMLDivElement | null>(null);
  const markReadInFlightRef = useRef(false);
  const typingResetTimeoutRef = useRef<number | null>(null);
  const deletedMessageIdsRef = useRef<string[]>(initialDeletedMessageIds);
  const shouldStickToBottomRef = useRef(true);
  const pendingAutoScrollRef = useRef(true);
  const lastRenderedMessageSignatureRef = useRef<string | null>(null);

  const markChatRead = useCallback(async () => {
    if (isArchived || markReadInFlightRef.current) {
      return;
    }

    markReadInFlightRef.current = true;

    try {
      const response = await fetch(`/api/chat/application/${applicationId}`, {
        method: "POST",
        cache: "no-store",
      });

      if (response.ok) {
        window.dispatchEvent(new Event("chat-summary-changed"));
      }
    } catch {
      // Ignore read-state update failures in the UI.
    } finally {
      markReadInFlightRef.current = false;
    }
  }, [applicationId, isArchived]);

  const loadOtherParticipantState = useCallback(async () => {
    const threadClient = threadClientRef.current;
    const currentAcsUserId = currentAcsUserIdRef.current;

    if (!threadClient || !currentAcsUserId) {
      otherParticipantIdsRef.current = [];
      return null;
    }

    const now = Date.now();

    if (participantStateLoadedAtRef.current && now - participantStateLoadedAtRef.current < 10_000) {
      return latestOtherReadOnRef.current;
    }

    const participantIds: string[] = [];

    for await (const participant of threadClient.listParticipants()) {
      if ("communicationUserId" in participant.id && participant.id.communicationUserId) {
        participantIds.push(participant.id.communicationUserId);
      }
    }

    const otherParticipantIds = participantIds.filter((id) => id !== currentAcsUserId);
    otherParticipantIdsRef.current = otherParticipantIds;

    if (otherParticipantIds.length === 0) {
      participantStateLoadedAtRef.current = now;
      latestOtherReadOnRef.current = null;
      return null;
    }

    let latestOtherReadOn: number | null = null;

    for await (const receipt of threadClient.listReadReceipts()) {
      const senderId = "communicationUserId" in receipt.sender
        ? receipt.sender.communicationUserId ?? null
        : null;

      if (!senderId || !otherParticipantIds.includes(senderId)) {
        continue;
      }

      const readOn = receipt.readOn.getTime();

      if (!latestOtherReadOn || readOn > latestOtherReadOn) {
        latestOtherReadOn = readOn;
      }
    }

    participantStateLoadedAtRef.current = now;
    latestOtherReadOnRef.current = latestOtherReadOn;
    setLastSeenAt(latestOtherReadOn ? new Date(latestOtherReadOn).toISOString() : null);
    return latestOtherReadOn;
  }, []);

  const loadMessages = useCallback(async () => {
    if (loadMessagesInFlightRef.current) {
      pendingRefreshRef.current = true;
      return;
    }

    if (Date.now() < acsBackoffUntilRef.current) {
      return;
    }

    const threadClient = threadClientRef.current;
    const currentAcsUserId = currentAcsUserIdRef.current;

    if (!threadClient) {
      return;
    }

    loadMessagesInFlightRef.current = true;

    try {
      try {
        const metadataResponse = await fetch(`/api/chat/application/${applicationId}`, {
          cache: "no-store",
        });

        if (metadataResponse.ok) {
          const metadata = await metadataResponse.json() as { deletedMessageIds?: string[] };
          const nextDeletedMessageIds = Array.isArray(metadata.deletedMessageIds) ? metadata.deletedMessageIds : [];

          if (!haveSameIds(deletedMessageIdsRef.current, nextDeletedMessageIds)) {
            deletedMessageIdsRef.current = nextDeletedMessageIds;
          }
        }
      } catch {
        // Ignore metadata refresh failures and keep the last known moderation state.
      }

      const latestOtherReadOn = await loadOtherParticipantState();
      const nextMessages: ChatUiMessage[] = [];
      const deletedMessageIdSet = new Set(deletedMessageIdsRef.current);

      for await (const message of threadClient.listMessages()) {
        const mapped = toUiMessage(message, currentAcsUserId, latestOtherReadOn);

        if (mapped) {
          if (deletedMessageIdSet.has(mapped.id) && mapped.kind === "message" && !mapped.isDeleted) {
            nextMessages.push({
              ...mapped,
              content: "Message deleted.",
              isDeleted: true,
            });
            continue;
          }

          nextMessages.push(mapped);
        }
      }

      const sortedMessages = sortMessages(nextMessages);
      setMessages(sortedMessages);
      setConnectionError((current) => {
        if (!current) {
          return current;
        }

        return /temporarily unstable|load failed|failed to fetch|error sending request/i.test(current)
          ? null
          : current;
      });

      if (sortedMessages.length > 0) {
        const latestMessage = [...sortedMessages]
          .reverse()
          .find((message) => message.kind === "message" && !message.isCurrentUser && !message.isDeleted);

        if (
          latestMessage
          && !latestMessage.isCurrentUser
          && lastSentReadReceiptMessageIdRef.current !== latestMessage.id
        ) {
          try {
            await threadClient.sendReadReceipt({ chatMessageId: latestMessage.id });
            lastSentReadReceiptMessageIdRef.current = latestMessage.id;
          } catch {
            // Ignore ACS read receipt failures in the UI. App-side state still updates below.
          }

          await markChatRead();
        }
      }
    } catch (error) {
      const normalizedError = normalizeChatErrorMessage(error);

      if (normalizedError.backoffMs > 0) {
        acsBackoffUntilRef.current = Date.now() + normalizedError.backoffMs;
      }

      setConnectionError(normalizedError.message);
    } finally {
      loadMessagesInFlightRef.current = false;

      if (pendingRefreshRef.current) {
        pendingRefreshRef.current = false;
        window.setTimeout(() => {
          void loadMessages();
        }, 250);
      }
    }
  }, [applicationId, loadOtherParticipantState, markChatRead]);

  useEffect(() => {
    let cancelled = false;
    let chatClient: ChatClient | null = null;
    let receivedListener: (() => void) | null = null;
    let editedListener: (() => void) | null = null;
    let deletedListener: (() => void) | null = null;
    let readReceiptListener: ((event: ReadReceiptReceivedEvent) => void) | null = null;
    let typingListener: ((event: TypingIndicatorReceivedEvent) => void) | null = null;
    let pollingIntervalId: number | null = null;

    const connect = async () => {
      setIsConnecting(true);
      setConnectionError(null);

      try {
        const response = await fetch("/api/chat/token", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ applicationId }),
        });
        const payload = await response.json().catch(() => ({ message: "Failed to connect to chat." }));

        if (!response.ok) {
          throw new Error(payload.message || "Failed to connect to chat.");
        }

        if (cancelled) {
          return;
        }

        const credential = new AzureCommunicationTokenCredential(payload.token);
        currentAcsUserIdRef.current = payload.acsUserId;
        chatClient = new ChatClient(payload.endpoint, credential);
        threadClientRef.current = chatClient.getChatThreadClient(payload.chatThreadId || chatThreadId);

        await loadMessages();
        await chatClient.startRealtimeNotifications();

        const refreshMessages = () => {
          void loadMessages();
        };

        receivedListener = refreshMessages;
        editedListener = refreshMessages;
        deletedListener = refreshMessages;
        readReceiptListener = (event: ReadReceiptReceivedEvent) => {
          const senderId = "communicationUserId" in event.sender
            ? event.sender.communicationUserId ?? null
            : null;

          if (!senderId || !otherParticipantIdsRef.current.includes(senderId)) {
            return;
          }

          latestOtherReadOnRef.current = event.readOn.getTime();
          participantStateLoadedAtRef.current = Date.now();
          setLastSeenAt(event.readOn.toISOString());
          void loadMessages();
        };
        typingListener = (event: TypingIndicatorReceivedEvent) => {
          const senderId = "communicationUserId" in event.sender
            ? event.sender.communicationUserId ?? null
            : null;

          if (!senderId || !otherParticipantIdsRef.current.includes(senderId)) {
            return;
          }

          const nextDisplayName = event.senderDisplayName?.trim() || participantLabel;
          setTypingDisplayName(nextDisplayName);

          if (typingResetTimeoutRef.current) {
            window.clearTimeout(typingResetTimeoutRef.current);
          }

          typingResetTimeoutRef.current = window.setTimeout(() => {
            setTypingDisplayName(null);
            typingResetTimeoutRef.current = null;
          }, 5000);
        };
        chatClient.on("chatMessageReceived", receivedListener);
        chatClient.on("chatMessageEdited", editedListener);
        chatClient.on("chatMessageDeleted", deletedListener);
        chatClient.on("readReceiptReceived", readReceiptListener);
        chatClient.on("typingIndicatorReceived", typingListener);
        pollingIntervalId = window.setInterval(() => {
          void loadMessages();
        }, 5000);
        window.dispatchEvent(new Event("chat-summary-changed"));
      } catch (error) {
        if (!cancelled) {
          const normalizedError = normalizeChatErrorMessage(error);

          if (normalizedError.backoffMs > 0) {
            acsBackoffUntilRef.current = Date.now() + normalizedError.backoffMs;
          }

          setConnectionError(normalizedError.message);
        }
      } finally {
        if (!cancelled) {
          setIsConnecting(false);
        }
      }
    };

    void connect();

    return () => {
      cancelled = true;

      if (chatClient && receivedListener) {
        chatClient.off("chatMessageReceived", receivedListener);
      }

      if (chatClient && editedListener) {
        chatClient.off("chatMessageEdited", editedListener);
      }

      if (chatClient && deletedListener) {
        chatClient.off("chatMessageDeleted", deletedListener);
      }

      if (chatClient && readReceiptListener) {
        chatClient.off("readReceiptReceived", readReceiptListener);
      }

      if (chatClient && typingListener) {
        chatClient.off("typingIndicatorReceived", typingListener);
      }

      if (pollingIntervalId) {
        window.clearInterval(pollingIntervalId);
      }

      if (typingResetTimeoutRef.current) {
        window.clearTimeout(typingResetTimeoutRef.current);
      }

      threadClientRef.current = null;
      currentAcsUserIdRef.current = null;
      otherParticipantIdsRef.current = [];
      latestOtherReadOnRef.current = null;
      participantStateLoadedAtRef.current = 0;
      lastSentReadReceiptMessageIdRef.current = null;
      setLastSeenAt(null);
      setTypingDisplayName(null);
    };
  }, [applicationId, chatThreadId, loadMessages, participantLabel]);

  useEffect(() => {
    const threadClient = threadClientRef.current;

    if (!threadClient || isArchived || isConnecting || connectionError || !composer.trim()) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      void threadClient.sendTypingNotification().catch(() => {
        // Ignore transient typing notification failures.
      });
    }, 350);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [composer, connectionError, isArchived, isConnecting]);

  useEffect(() => {
    const container = messageListRef.current;

    if (!container) {
      return;
    }

    const handleScroll = () => {
      const distanceFromBottom = container.scrollHeight - container.scrollTop - container.clientHeight;
      shouldStickToBottomRef.current = distanceFromBottom < 96;
    };

    handleScroll();
    container.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      container.removeEventListener("scroll", handleScroll);
    };
  }, []);

  useEffect(() => {
    if (!messages.length) {
      return;
    }

    const latestMessage = messages[messages.length - 1];
    const latestSignature = latestMessage
      ? `${latestMessage.id}:${latestMessage.createdAt}:${latestMessage.editedAt ?? ""}:${latestMessage.isDeleted ? "deleted" : "live"}`
      : null;

    const didLatestMessageChange = latestSignature !== lastRenderedMessageSignatureRef.current;
    lastRenderedMessageSignatureRef.current = latestSignature;

    if (!didLatestMessageChange) {
      return;
    }

    if (!pendingAutoScrollRef.current && !shouldStickToBottomRef.current) {
      return;
    }

    pendingAutoScrollRef.current = false;
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages]);

  const chatStatus = useMemo(() => {
    if (isArchived) {
      return `Archived chat with ${participantLabel}`;
    }

    if (isConnecting) {
      return "Connecting chat...";
    }

    if (connectionError && !isTransientConnectionMessage(connectionError)) {
      return connectionError;
    }

    return `Live chat with ${participantLabel}`;
  }, [connectionError, isArchived, isConnecting, participantLabel]);

  const conversationScopeLabel = portal === "admin"
    ? `Private conversation with ${participantLabel} for ${jobCode}.`
    : `Private conversation with the hiring team for ${jobCode}.`;

  const presenceLabel = useMemo(() => {
    if (isArchived) {
      return "Archived conversation";
    }

    if (typingDisplayName) {
      return `${typingDisplayName} is typing...`;
    }

    if (lastSeenAt) {
      return formatPresenceTimestamp(lastSeenAt);
    }

    if (isConnecting) {
      return "Connecting live presence...";
    }

    return "Live conversation";
  }, [isArchived, isConnecting, lastSeenAt, typingDisplayName]);

  const hasBlockingConnectionError = Boolean(connectionError && !isTransientConnectionMessage(connectionError));
  const hasBackgroundRetry = Boolean(connectionError && isTransientConnectionMessage(connectionError));

  const startEditingMessage = (message: ChatUiMessage) => {
    setEditingMessageId(message.id);
    setEditingContent(message.content);
  };

  const cancelEditingMessage = () => {
    setEditingMessageId(null);
    setEditingContent("");
  };

  const handleDeleteMessage = useCallback(async (message: ChatUiMessage) => {
    if (
      portal !== "admin"
      || isArchived
      || message.kind !== "message"
      || message.isDeleted
      || messageActionId
    ) {
      return;
    }

    setMessageActionId(message.id);

    try {
      const response = await fetch(`/api/chat/application/${applicationId}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messageId: message.id }),
      });
      const payload = await response.json().catch(() => ({ message: "Failed to delete chat message." }));

      if (!response.ok) {
        throw new Error(payload.message || "Failed to delete chat message.");
      }

      if (!deletedMessageIdsRef.current.includes(message.id)) {
        deletedMessageIdsRef.current = [...deletedMessageIdsRef.current, message.id];
      }
      if (editingMessageId === message.id) {
        cancelEditingMessage();
      }
      await loadMessages();
      window.dispatchEvent(new Event("chat-summary-changed"));
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Failed to delete chat message.", "error");
    } finally {
      setMessageActionId(null);
    }
  }, [applicationId, editingMessageId, isArchived, loadMessages, messageActionId, portal, showToast]);

  const handleSaveMessageEdit = useCallback(async () => {
    const threadClient = threadClientRef.current;
    const message = messages.find((item) => item.id === editingMessageId);
    const nextContent = editingContent.trim();

    if (
      !threadClient
      || !message
      || !editingMessageId
      || isArchived
      || message.kind !== "message"
      || !message.isCurrentUser
      || message.isDeleted
      || message.seenByOther
      || !nextContent
      || nextContent === message.content.trim()
      || messageActionId
    ) {
      return;
    }

    setMessageActionId(editingMessageId);

    try {
      await threadClient.updateMessage(editingMessageId, { content: nextContent });
      cancelEditingMessage();
      await loadMessages();
      window.dispatchEvent(new Event("chat-summary-changed"));
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Failed to update chat message.", "error");
    } finally {
      setMessageActionId(null);
    }
  }, [editingContent, editingMessageId, isArchived, loadMessages, messageActionId, messages, showToast]);

  const handleSend = useCallback(async () => {
    const threadClient = threadClientRef.current;
    const content = composer.trim();

    if (!threadClient || !content || isSending || isArchived) {
      return;
    }

    setIsSending(true);
    pendingAutoScrollRef.current = true;

    try {
      await threadClient.sendMessage({ content });
      setComposer("");
      await loadMessages();
      window.dispatchEvent(new Event("chat-summary-changed"));
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Failed to send chat message.", "error");
    } finally {
      setIsSending(false);
    }
  }, [composer, isArchived, isSending, loadMessages, showToast]);

  const handleComposerKeyDown = useCallback((event: ReactKeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key !== "Enter" || event.shiftKey) {
      return;
    }

    event.preventDefault();

    if (!composer.trim() || isSending || isConnecting || Boolean(connectionError) || isArchived) {
      return;
    }

    void handleSend();
  }, [composer, connectionError, handleSend, isArchived, isConnecting, isSending]);

  const canEditMessage = (message: ChatUiMessage) => (
    !isArchived
    && message.kind === "message"
    && message.isCurrentUser
    && !message.isDeleted
    && !message.seenByOther
  );

  const canDeleteMessage = (message: ChatUiMessage) => (
    !isArchived
    && message.kind === "message"
    && !message.isDeleted
    && portal === "admin"
  );

  return (
    <PortalShell
      portal={portal}
      sessionEmail={sessionEmail}
      eyebrow={`${jobCode} Chat`}
      title={jobTitle}
      subtitle="Real-time application conversation available after acceptance."
      primaryActionHref={isArchived ? undefined : primaryActionHref}
      primaryActionLabel={isArchived ? undefined : primaryActionLabel}
      secondaryActionHref={isArchived ? undefined : secondaryActionHref}
      secondaryActionLabel={isArchived ? undefined : secondaryActionLabel}
    >
      <section className="grid gap-4 xl:min-h-[calc(100dvh-220px)] xl:grid-cols-[0.62fr_1.38fr]">
        <article className="rounded-[28px] border border-[var(--color-border-strong)] bg-[var(--color-panel)] p-5 shadow-[var(--shadow-soft)] xl:sticky xl:top-4 xl:max-h-[calc(100dvh-220px)] xl:self-start xl:overflow-y-auto">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[var(--color-sidebar-accent)] text-[var(--color-sidebar-accent-ink)]">
              <MessageSquare className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--color-brand-strong)]">
                Application Chat
              </p>
              <h2 className="mt-2 text-2xl font-semibold text-[var(--color-ink)]">{participantLabel}</h2>
              <p className="mt-2 text-sm leading-6 text-[var(--color-muted)]">
                {isArchived
                  ? `The original application record is no longer available. You can still review the conversation history for ${jobCode}, but new actions are disabled.`
                  : `Chat is available only for this accepted application. Messages stay scoped to ${jobCode}.`}
              </p>
            </div>
          </div>

          <div className="mt-5 grid gap-3">
            <div className="rounded-2xl bg-white p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-muted)]">Status</p>
              <p className={`mt-2 text-sm ${connectionError ? "text-rose-700" : "text-[var(--color-ink)]"}`}>
                {chatStatus}
              </p>
            </div>
            <div className="rounded-2xl bg-white p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-muted)]">Conversation scope</p>
              <p className="mt-2 text-sm leading-6 text-[var(--color-ink)]">
                {conversationScopeLabel}
              </p>
            </div>
            <div className="rounded-2xl bg-white p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-muted)]">Context</p>
              <p className="mt-2 text-sm text-[var(--color-ink)]">{jobTitle}</p>
              <p className="mt-1 text-xs text-[var(--color-muted)]">
                {isArchived
                  ? "Archived application chat. History remains visible, but the conversation is read-only."
                  : "Secure application conversation for accepted candidates only."}
              </p>
            </div>
          </div>
        </article>

        <article className="flex min-h-[68dvh] flex-col rounded-[28px] border border-[var(--color-border-strong)] bg-[var(--color-panel)] p-4 shadow-[var(--shadow-soft)] sm:min-h-[72dvh] sm:p-5 xl:h-[calc(100dvh-220px)] xl:min-h-0">
          <div className="rounded-[22px] border border-[var(--color-border)] bg-white px-4 py-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-medium text-[var(--color-ink)]">Conversation</p>
              <p className={`text-xs ${
                typingDisplayName
                  ? "font-medium text-[var(--color-brand-strong)]"
                  : "text-[var(--color-muted)]"
              }`}>
                {presenceLabel}
              </p>
            </div>
            <p className="mt-1 text-xs text-[var(--color-muted)]">
              New messages appear here as soon as they are received.
            </p>
            {hasBackgroundRetry ? (
              <p className="mt-1 text-xs text-amber-700">{connectionError}</p>
            ) : null}
          </div>

          <div className="mt-3 flex-1 overflow-hidden rounded-[24px] border border-[var(--color-border)] bg-white">
            <div ref={messageListRef} className="flex h-full min-h-0 flex-col overflow-y-auto px-3 py-3 sm:px-4">
              {isConnecting ? (
                <div className="m-auto text-center text-sm text-[var(--color-muted)]">Connecting to chat...</div>
              ) : hasBlockingConnectionError ? (
                <div className="m-auto max-w-md rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
                  {connectionError}
                </div>
              ) : messages.length === 0 ? (
                <div className="m-auto text-center text-sm text-[var(--color-muted)]">
                  {isArchived ? "No messages are available in this archived chat." : "No messages yet. Start the conversation below."}
                </div>
              ) : (
                <div className="space-y-2.5">
                  {messages.map((message) => (
                    <div
                      key={message.id}
                      className={message.kind === "system"
                        ? "mx-auto w-fit max-w-xl rounded-2xl bg-slate-100 px-4 py-2.5 text-center text-sm text-slate-600"
                        : message.isCurrentUser
                          ? "relative ml-auto w-fit max-w-[85%] rounded-[20px] bg-[var(--color-sidebar-accent)] px-4 py-2.5 text-[var(--color-sidebar-accent-ink)] sm:max-w-[72%]"
                          : "relative mr-auto w-fit max-w-[85%] rounded-[20px] border border-[var(--color-border)] bg-[var(--color-panel)] px-4 py-2.5 text-[var(--color-ink)] sm:max-w-[72%]"
                      }
                    >
                      {message.kind === "message" ? (
                        <>
                          {!editingMessageId && (canEditMessage(message) || canDeleteMessage(message)) ? (
                            <div className="absolute right-3 top-3">
                              <div className="flex items-center gap-1.5">
                                {canEditMessage(message) ? (
                                  <button
                                    type="button"
                                    onClick={() => startEditingMessage(message)}
                                    disabled={Boolean(messageActionId)}
                                    aria-label="Edit message"
                                    className={`inline-flex h-8 w-8 items-center justify-center rounded-xl ${
                                      message.isCurrentUser
                                        ? "bg-white/10 text-[var(--color-sidebar-accent-ink)]/85"
                                        : "bg-slate-200/70 text-[var(--color-ink)]/75"
                                    } disabled:cursor-not-allowed disabled:opacity-50`}
                                  >
                                    <Pencil className="h-4 w-4" />
                                  </button>
                                ) : null}
                                {canDeleteMessage(message) ? (
                                  <button
                                    type="button"
                                    onClick={() => void handleDeleteMessage(message)}
                                    disabled={Boolean(messageActionId)}
                                    aria-label="Delete message"
                                    className={`inline-flex h-8 w-8 items-center justify-center rounded-xl ${
                                      message.isCurrentUser
                                        ? "bg-white/10 text-[var(--color-sidebar-accent-ink)]/85"
                                        : "bg-slate-200/70 text-rose-600"
                                    } disabled:cursor-not-allowed disabled:opacity-50`}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </button>
                                ) : null}
                              </div>
                            </div>
                          ) : null}
                          <p className={`pr-8 text-xs font-semibold ${message.isCurrentUser ? "text-[var(--color-sidebar-accent-ink)]/80" : "text-[var(--color-muted)]"}`}>
                            {message.isCurrentUser ? "You" : message.senderDisplayName}
                          </p>
                          {editingMessageId === message.id ? (
                            <div className="mt-2 space-y-2">
                              <textarea
                                value={editingContent}
                                onChange={(event) => setEditingContent(event.target.value)}
                                rows={3}
                                className="w-full resize-none rounded-2xl border border-white/30 bg-white/10 px-3 py-2 text-sm text-current outline-none"
                              />
                              <div className="flex flex-wrap items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => void handleSaveMessageEdit()}
                                  disabled={!editingContent.trim() || messageActionId === message.id}
                                  className="inline-flex items-center rounded-xl bg-white/15 px-3 py-2 text-xs font-medium text-current disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                  <Check className="mr-1.5 h-3.5 w-3.5" />
                                  {messageActionId === message.id ? "Saving..." : "Save"}
                                </button>
                                <button
                                  type="button"
                                  onClick={cancelEditingMessage}
                                  disabled={messageActionId === message.id}
                                  className="inline-flex items-center rounded-xl bg-white/10 px-3 py-2 text-xs font-medium text-current/85 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                  <X className="mr-1.5 h-3.5 w-3.5" />
                                  Cancel
                                </button>
                              </div>
                            </div>
                          ) : (
                            <>
                              <p className={`mt-1 whitespace-pre-wrap pr-8 text-sm leading-6 ${message.isDeleted ? "italic opacity-70" : ""}`}>
                                {message.content}
                              </p>
                              <div className={`mt-1.5 flex flex-wrap items-center gap-2 text-[11px] ${message.isCurrentUser ? "text-[var(--color-sidebar-accent-ink)]/70" : "text-[var(--color-muted)]"}`}>
                                <span>{new Date(message.createdAt).toLocaleString()}</span>
                                {message.editedAt && !message.isDeleted ? <span>Edited</span> : null}
                                {message.isCurrentUser && !message.isDeleted ? (
                                  <span>{message.seenByOther ? "Seen" : "Sent"}</span>
                                ) : null}
                              </div>
                            </>
                          )}
                        </>
                      ) : (
                        <>
                          <p>{message.content}</p>
                          <p className="mt-1 text-[11px] text-slate-500">
                            {new Date(message.createdAt).toLocaleString()}
                          </p>
                        </>
                      )}
                    </div>
                  ))}
                  <div ref={endRef} />
                </div>
              )}
            </div>
          </div>

          <div className="mt-3 rounded-[22px] border border-[var(--color-border)] bg-white p-3">
            {isArchived ? (
              <div className="rounded-2xl border border-dashed border-[var(--color-border)] bg-[var(--color-panel)] px-4 py-6 text-sm text-[var(--color-muted)]">
                This conversation is available for reference only. New messages are disabled because the linked application record is no longer available.
              </div>
            ) : (
              <div className="flex flex-col gap-2.5 sm:flex-row sm:items-end">
                <textarea
                  value={composer}
                  onChange={(event) => setComposer(event.target.value)}
                  onKeyDown={handleComposerKeyDown}
                  placeholder="Write a message..."
                  rows={2}
                  disabled={hasBlockingConnectionError || isConnecting}
                  className="min-h-[72px] flex-1 resize-none rounded-2xl border border-[var(--color-border)] bg-[var(--color-panel)] px-4 py-3 text-sm text-[var(--color-ink)] outline-none focus:border-[var(--color-brand)] disabled:cursor-not-allowed disabled:opacity-60"
                />
                <button
                  type="button"
                  onClick={() => void handleSend()}
                  disabled={!composer.trim() || isSending || isConnecting || hasBlockingConnectionError}
                  className="theme-action-button inline-flex h-11 items-center justify-center rounded-2xl px-4 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-50 sm:min-w-[110px]"
                >
                  <Send className="mr-2 h-4 w-4" />
                  {isSending ? "Sending..." : "Send"}
                </button>
              </div>
            )}
          </div>
        </article>
      </section>
    </PortalShell>
  );
}
