"use client";

import Link from "next/link";
import { MessageSquare, Search, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import type { ChatInboxItem } from "../../lib/acs-chat";
import { ConfirmDialog } from "./ConfirmDialog";
import { PortalShell } from "./PortalShell";
import { useToast } from "./ToastProvider";

type ChatInboxPortalProps = {
  portal: "admin" | "candidate";
  sessionEmail: string;
  chats: ChatInboxItem[];
  unreadCount: number;
  focusedParticipantKey?: string;
  focusedParticipantLabel?: string;
};

type FilterValue = "all" | "unread" | "read";

export function ChatInboxPortal({
  portal,
  sessionEmail,
  chats,
  unreadCount,
  focusedParticipantKey,
  focusedParticipantLabel,
}: ChatInboxPortalProps) {
  const router = useRouter();
  const { showToast } = useToast();
  const [filter, setFilter] = useState<FilterValue>("all");
  const [search, setSearch] = useState("");
  const [deleteParticipantKey, setDeleteParticipantKey] = useState<string | null>(null);
  const [deleteParticipantLabel, setDeleteParticipantLabel] = useState<string | null>(null);
  const [isDeletingChats, setIsDeletingChats] = useState(false);

  const scopedChats = useMemo(() => {
    if (!focusedParticipantKey) {
      return chats;
    }

    return chats.filter((chat) => chat.participantKey === focusedParticipantKey);
  }, [chats, focusedParticipantKey]);

  const filteredChats = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return scopedChats.filter((chat) => {
      if (filter === "unread" && !chat.unread) {
        return false;
      }

      if (filter === "read" && chat.unread) {
        return false;
      }

      if (!normalizedSearch) {
        return true;
      }

      const searchable = [
        chat.jobCode,
        chat.jobTitle,
        chat.participantLabel,
        chat.participantSecondaryLabel,
        chat.latestMessagePreview,
      ].join(" ").toLowerCase();

      return searchable.includes(normalizedSearch);
    });
  }, [filter, scopedChats, search]);

  const title = portal === "admin"
    ? (focusedParticipantKey ? focusedParticipantLabel ?? "Application Chats" : "Application Chats")
    : "Your Chats";
  const subtitle = portal === "admin"
    ? "Accepted-application conversations grouped by candidate and job."
    : "Accepted-application conversations with the hiring team.";
  const itemHref = (applicationId: string) => (
    portal === "admin" ? `/admin/chat/${applicationId}` : `/applications/chat/${applicationId}`
  );
  const adminPeople = useMemo(() => {
    if (portal !== "admin" || focusedParticipantKey) {
      return [];
    }

    const groups = new Map<string, {
      participantKey: string;
      label: string;
      secondary: string;
      latestMessageAt: string | null;
      latestMessagePreview: string;
      unreadCount: number;
      chatCount: number;
    }>();

    for (const chat of filteredChats) {
      const existing = groups.get(chat.participantKey);
      const chatTime = chat.latestMessageAt ? new Date(chat.latestMessageAt).getTime() : 0;

      if (existing) {
        existing.chatCount += 1;
        if (chat.unread) {
          existing.unreadCount += 1;
        }

        const existingTime = existing.latestMessageAt ? new Date(existing.latestMessageAt).getTime() : 0;
        if (chatTime >= existingTime) {
          existing.latestMessageAt = chat.latestMessageAt;
          existing.latestMessagePreview = chat.latestMessagePreview;
        }
      } else {
        groups.set(chat.participantKey, {
          participantKey: chat.participantKey,
          label: chat.participantLabel,
          secondary: chat.participantSecondaryLabel,
          latestMessageAt: chat.latestMessageAt,
          latestMessagePreview: chat.latestMessagePreview,
          unreadCount: chat.unread ? 1 : 0,
          chatCount: 1,
        });
      }
    }

    return [...groups.values()].sort((left, right) => {
      const leftTime = left.latestMessageAt ? new Date(left.latestMessageAt).getTime() : 0;
      const rightTime = right.latestMessageAt ? new Date(right.latestMessageAt).getTime() : 0;
      return rightTime - leftTime;
    });
  }, [filteredChats, focusedParticipantKey, portal]);

  const adminFocusedChats = useMemo(() => {
    if (portal !== "admin" || !focusedParticipantKey) {
      return [];
    }

    return [...filteredChats].sort((left, right) => {
      const leftTime = left.latestMessageAt ? new Date(left.latestMessageAt).getTime() : 0;
      const rightTime = right.latestMessageAt ? new Date(right.latestMessageAt).getTime() : 0;
      return rightTime - leftTime;
    });
  }, [filteredChats, focusedParticipantKey, portal]);

  const adminIsPeopleIndex = portal === "admin" && !focusedParticipantKey;
  const conversationsHeading = adminIsPeopleIndex
    ? "People"
    : portal === "admin"
      ? `Chats with ${focusedParticipantLabel ?? "candidate"}`
      : "All conversations";
  const searchPlaceholder = adminIsPeopleIndex
    ? "Search people by name or email"
    : "Search chat by job or participant";
  const emptyMessage = chats.length === 0
    ? "No chats are available yet. Chats appear after an application is accepted."
    : adminIsPeopleIndex
      ? "No people match the current filter."
      : "No chats match the current filter.";

  const handleDeleteParticipantChats = async () => {
    if (!deleteParticipantKey || portal !== "admin") {
      return;
    }

    setIsDeletingChats(true);

    try {
      const response = await fetch(`/api/chat/user/${encodeURIComponent(deleteParticipantKey)}`, {
        method: "DELETE",
      });
      const payload = await response.json().catch(() => ({ message: "Failed to delete user chats." }));

      if (!response.ok) {
        throw new Error(payload.message || "Failed to delete user chats.");
      }

      setDeleteParticipantKey(null);
      setDeleteParticipantLabel(null);
      window.dispatchEvent(new Event("chat-summary-changed"));
      router.refresh();
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Failed to delete user chats.", "error");
    } finally {
      setIsDeletingChats(false);
    }
  };

  return (
    <PortalShell
      portal={portal}
      sessionEmail={sessionEmail}
      eyebrow="Application Chat"
      title={title}
      subtitle={subtitle}
    >
      <section className="rounded-[28px] border border-[var(--color-border-strong)] bg-[var(--color-panel)] p-5 shadow-[var(--shadow-soft)] sm:p-6">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <h2 className="text-xl font-semibold text-[var(--color-ink)]">{conversationsHeading}</h2>
              <p className="text-sm text-[var(--color-muted)]">
                {unreadCount > 0
                  ? `${unreadCount} unread conversation${unreadCount === 1 ? "" : "s"} need attention.`
                  : "No unread conversations right now."}
              </p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <label className="relative block">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-muted)]" />
                <input
                  type="search"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder={searchPlaceholder}
                  className="h-11 w-full min-w-[260px] rounded-2xl border border-[var(--color-border)] bg-white pl-10 pr-4 text-sm text-[var(--color-ink)] outline-none focus:border-[var(--color-brand)]"
                />
              </label>
              <select
                value={filter}
                onChange={(event) => setFilter(event.target.value as FilterValue)}
                className="h-11 min-w-[130px] rounded-2xl border border-[var(--color-border)] bg-white px-4 text-sm text-[var(--color-ink)] outline-none focus:border-[var(--color-brand)]"
              >
                <option value="all">All chats</option>
                <option value="unread">Unread</option>
                <option value="read">Read</option>
              </select>
            </div>
          </div>

          {filteredChats.length > 0 ? (
            portal === "admin" ? (
              adminIsPeopleIndex ? (
                <div className="grid gap-3">
                  {adminPeople.map((person) => (
                    <article
                      key={person.participantKey}
                      role="link"
                      tabIndex={0}
                      onClick={() => {
                        router.push(`/admin/chat/user/${encodeURIComponent(person.participantKey)}`);
                      }}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          router.push(`/admin/chat/user/${encodeURIComponent(person.participantKey)}`);
                        }
                      }}
                      className="cursor-pointer rounded-[22px] border border-[var(--color-border)] bg-white p-4 transition hover:border-[var(--color-border-strong)] hover:shadow-[var(--shadow-soft)] focus:outline-none focus-visible:border-[var(--color-brand)] focus-visible:ring-2 focus-visible:ring-[var(--color-brand)]/20"
                    >
                      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            {person.unreadCount > 0 ? (
                              <span className="rounded-full bg-rose-100 px-2.5 py-1 text-xs font-semibold text-rose-700">
                                {person.unreadCount} unread
                              </span>
                            ) : (
                              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
                                All read
                              </span>
                            )}
                            <span className="rounded-full bg-[var(--color-panel)] px-2.5 py-1 text-xs font-semibold text-[var(--color-muted)]">
                              {person.chatCount} job chat{person.chatCount === 1 ? "" : "s"}
                            </span>
                          </div>
                          <h3 className="mt-3 text-lg font-semibold text-[var(--color-ink)]">{person.label}</h3>
                          <p className="mt-1 text-sm text-[var(--color-muted)]">{person.secondary}</p>
                          <p className="mt-3 line-clamp-2 text-sm text-[var(--color-ink)]">
                            {person.latestMessagePreview}
                          </p>
                        </div>
                        <div className="shrink-0 text-right">
                          <div className="flex flex-wrap items-center justify-end gap-2">
                            <div className="inline-flex items-center gap-2 rounded-full bg-[var(--color-panel)] px-3 py-1.5 text-xs font-medium text-[var(--color-muted)]">
                              <MessageSquare className="h-3.5 w-3.5" />
                              {person.latestMessageAt ? new Date(person.latestMessageAt).toLocaleString() : "No messages yet"}
                            </div>
                            <button
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation();
                                setDeleteParticipantKey(person.participantKey);
                                setDeleteParticipantLabel(person.label);
                              }}
                              onKeyDown={(event) => {
                                event.stopPropagation();
                              }}
                              className="theme-action-button inline-flex items-center rounded-xl border border-rose-200 px-3 py-2 text-xs text-rose-700"
                            >
                              <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                              Delete All Chats
                            </button>
                          </div>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <div className="grid gap-4">
                  {adminFocusedChats.map((chat) => (
                    <Link
                      key={chat.applicationId}
                      href={itemHref(chat.applicationId)}
                      className="rounded-[20px] border border-[var(--color-border)] bg-white p-4 transition hover:border-[var(--color-border-strong)] hover:shadow-[var(--shadow-soft)]"
                    >
                      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="theme-badge-brand rounded-full px-2.5 py-1 text-xs font-semibold">
                              {chat.jobCode}
                            </span>
                            {chat.unread ? (
                              <span className="rounded-full bg-rose-100 px-2.5 py-1 text-xs font-semibold text-rose-700">
                                Unread
                              </span>
                            ) : (
                              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
                                Read
                              </span>
                            )}
                          </div>
                          <p className="mt-3 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-muted)]">
                            Relevant job
                          </p>
                          <h4 className="mt-1 text-base font-semibold text-[var(--color-ink)]">{chat.jobTitle}</h4>
                          <p className="mt-3 line-clamp-2 text-sm text-[var(--color-ink)]">
                            {chat.latestMessagePreview}
                          </p>
                        </div>
                        <div className="shrink-0 text-right">
                          <div className="inline-flex items-center gap-2 rounded-full bg-[var(--color-panel)] px-3 py-1.5 text-xs font-medium text-[var(--color-muted)]">
                            <MessageSquare className="h-3.5 w-3.5" />
                            {chat.latestMessageAt ? new Date(chat.latestMessageAt).toLocaleString() : "No messages yet"}
                          </div>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )
            ) : (
              <div className="grid gap-3">
                {filteredChats.map((chat) => (
                  <Link
                    key={chat.applicationId}
                    href={itemHref(chat.applicationId)}
                    className="rounded-[22px] border border-[var(--color-border)] bg-white p-4 transition hover:border-[var(--color-border-strong)] hover:shadow-[var(--shadow-soft)]"
                  >
                    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="theme-badge-brand rounded-full px-2.5 py-1 text-xs font-semibold">
                            {chat.jobCode}
                          </span>
                          {chat.unread ? (
                            <span className="rounded-full bg-rose-100 px-2.5 py-1 text-xs font-semibold text-rose-700">
                              Unread
                            </span>
                          ) : (
                            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
                              Read
                            </span>
                          )}
                        </div>
                        <h3 className="mt-3 text-lg font-semibold text-[var(--color-ink)]">{chat.jobTitle}</h3>
                        <p className="mt-1 text-sm text-[var(--color-muted)]">{chat.participantLabel}</p>
                        <p className="mt-1 text-xs text-[var(--color-muted)]">{chat.participantSecondaryLabel}</p>
                        <p className="mt-3 line-clamp-2 text-sm text-[var(--color-ink)]">
                          {chat.latestMessagePreview}
                        </p>
                      </div>
                      <div className="shrink-0 text-right">
                        <div className="inline-flex items-center gap-2 rounded-full bg-[var(--color-panel)] px-3 py-1.5 text-xs font-medium text-[var(--color-muted)]">
                          <MessageSquare className="h-3.5 w-3.5" />
                          {chat.latestMessageAt ? new Date(chat.latestMessageAt).toLocaleString() : "No messages yet"}
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )
          ) : (
            <div className="rounded-[22px] border border-dashed border-[var(--color-border)] bg-white p-8 text-center text-sm text-[var(--color-muted)]">
              {emptyMessage}
            </div>
          )}
        </div>
      </section>
      <ConfirmDialog
        isOpen={Boolean(deleteParticipantKey)}
        title="Delete User Chats"
        message={`Delete all application chats for ${deleteParticipantLabel ?? "this user"}? This will remove the candidate's chat history from the admin and candidate portals.`}
        confirmLabel="Delete Chats"
        loadingLabel="Deleting Chats..."
        onConfirm={() => void handleDeleteParticipantChats()}
        onCancel={() => {
          if (isDeletingChats) {
            return;
          }

          setDeleteParticipantKey(null);
          setDeleteParticipantLabel(null);
        }}
        isLoading={isDeletingChats}
      />
    </PortalShell>
  );
}
