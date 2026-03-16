"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ClipboardList,
  BriefcaseBusiness,
  House,
  LayoutGrid,
  MessageSquare,
  Settings,
  ShieldCheck,
  UserCircle2,
  UserRound,
  Users,
} from "lucide-react";
import { useEffect, useMemo, useSyncExternalStore } from "react";
import { LogoutButton } from "./LogoutButton";

type PortalShellProps = {
  portal: "admin" | "candidate";
  sessionEmail: string;
  title: string;
  eyebrow: string;
  subtitle?: string;
  switchHref?: string;
  switchLabel?: string;
  secondaryActionHref?: string;
  secondaryActionLabel?: string;
  primaryActionHref?: string;
  primaryActionLabel?: string;
  children: React.ReactNode;
};

type NavItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  matchPrefix?: string;
};

type BreadcrumbItem = {
  href?: string;
  label: string;
};

type ChatNavState = {
  hasChats: boolean;
  unreadCount: number;
};

const ADMIN_NAV: NavItem[] = [
  { href: "/admin", label: "Dashboard", icon: House },
  { href: "/admin/jobs", label: "Jobs", icon: BriefcaseBusiness, matchPrefix: "/admin/jobs" },
  { href: "/admin/candidates", label: "Candidates", icon: Users, matchPrefix: "/admin/candidates" },
  { href: "/admin/audit", label: "Audit", icon: ClipboardList, matchPrefix: "/admin/audit" },
  { href: "/admin/settings", label: "Settings", icon: Settings, matchPrefix: "/admin/settings" },
];

const CANDIDATE_NAV: NavItem[] = [
  { href: "/applications", label: "Dashboard", icon: LayoutGrid },
  { href: "/apply", label: "Apply", icon: BriefcaseBusiness, matchPrefix: "/apply" },
  { href: "/applications/history", label: "Applications", icon: Users, matchPrefix: "/applications/history" },
  { href: "/account", label: "Profile", icon: UserRound, matchPrefix: "/account" },
];

const isActivePath = (pathname: string, item: NavItem) => {
  if (item.matchPrefix) {
    return pathname === item.href || pathname.startsWith(item.matchPrefix);
  }

  return pathname === item.href;
};

const EMPTY_CHAT_NAV_STATE: ChatNavState = {
  hasChats: false,
  unreadCount: 0,
};

const readChatNavStateSnapshot = (storageKey: string): string => {
  if (typeof window === "undefined") {
    return "";
  }

  try {
    return window.localStorage.getItem(storageKey) ?? "";
  } catch {
    return "";
  }
};

const getBreadcrumbs = (
  pathname: string,
  portal: "admin" | "candidate",
  title: string,
): BreadcrumbItem[] => {
  if (portal === "admin") {
    if (pathname === "/admin") {
      return [{ label: "Dashboard" }];
    }

    if (pathname === "/admin/jobs") {
      return [{ href: "/admin", label: "Dashboard" }, { label: "Jobs" }];
    }

    if (pathname === "/admin/jobs/new") {
      return [
        { href: "/admin", label: "Dashboard" },
        { href: "/admin/jobs", label: "Jobs" },
        { label: "New Job" },
      ];
    }

    if (pathname.startsWith("/admin/jobs/") && pathname.endsWith("/edit")) {
      return [
        { href: "/admin", label: "Dashboard" },
        { href: "/admin/jobs", label: "Jobs" },
        { label: title },
      ];
    }

    if (pathname.startsWith("/admin/jobs/") && pathname.endsWith("/preview")) {
      return [
        { href: "/admin", label: "Dashboard" },
        { href: "/admin/jobs", label: "Jobs" },
        { href: pathname.replace(/\/preview$/, "/edit"), label: title },
        { label: "Preview" },
      ];
    }

    if (pathname.startsWith("/admin/jobs/") && pathname.endsWith("/candidates")) {
      return [
        { href: "/admin", label: "Dashboard" },
        { href: "/admin/jobs", label: "Jobs" },
        { label: title },
      ];
    }

    if (pathname.startsWith("/admin/chat/")) {
      return [
        { href: "/admin", label: "Dashboard" },
        { href: "/admin/chat", label: "Chat" },
        { label: title },
      ];
    }

    if (pathname === "/admin/chat") {
      return [{ href: "/admin", label: "Dashboard" }, { label: "Chat" }];
    }

    if (pathname === "/admin/candidates") {
      return [{ href: "/admin", label: "Dashboard" }, { label: "Candidates" }];
    }

    if (pathname.startsWith("/admin/candidates/")) {
      return [
        { href: "/admin", label: "Dashboard" },
        { href: "/admin/candidates", label: "Candidates" },
        { label: title },
      ];
    }

    if (pathname === "/admin/audit") {
      return [{ href: "/admin", label: "Dashboard" }, { label: "Audit" }];
    }

    if (pathname === "/admin/settings") {
      return [{ href: "/admin", label: "Dashboard" }, { label: "Settings" }];
    }
  }

  if (pathname === "/applications") {
    return [{ label: "Dashboard" }];
  }

  if (pathname === "/applications/history") {
    return [{ href: "/applications", label: "Dashboard" }, { label: "Applications" }];
  }

  if (pathname.startsWith("/applications/chat/")) {
    return [
      { href: "/applications", label: "Dashboard" },
      { href: "/applications/chat", label: "Chat" },
      { label: title },
    ];
  }

  if (pathname === "/applications/chat") {
    return [{ href: "/applications", label: "Dashboard" }, { label: "Chat" }];
  }

  if (pathname === "/apply") {
    return [{ href: "/applications", label: "Dashboard" }, { label: "Apply" }];
  }

  if (pathname.startsWith("/apply/")) {
    return [
      { href: "/applications", label: "Dashboard" },
      { href: "/apply", label: "Apply" },
      { label: title },
    ];
  }

  if (pathname === "/account") {
    return [{ href: "/applications", label: "Dashboard" }, { label: "Profile" }];
  }

  return [{ label: title }];
};

export function PortalShell({
  portal,
  sessionEmail,
  title,
  eyebrow,
  subtitle,
  switchHref,
  switchLabel,
  secondaryActionHref,
  secondaryActionLabel,
  primaryActionHref,
  primaryActionLabel,
  children,
}: PortalShellProps) {
  const pathname = usePathname();
  const storageKey = `chat-nav-state:${portal}:${sessionEmail.trim().toLowerCase()}`;
  const chatNavSnapshot = useSyncExternalStore(
    (onStoreChange) => {
      if (typeof window === "undefined") {
        return () => undefined;
      }

      const handler = () => onStoreChange();
      window.addEventListener("storage", handler);
      window.addEventListener("chat-summary-changed", handler);

      return () => {
        window.removeEventListener("storage", handler);
        window.removeEventListener("chat-summary-changed", handler);
      };
    },
    () => readChatNavStateSnapshot(storageKey),
    () => "",
  );
  const chatNavState = useMemo(() => {
    if (!chatNavSnapshot) {
      return EMPTY_CHAT_NAV_STATE;
    }

    try {
      const parsed = JSON.parse(chatNavSnapshot) as { hasChats?: boolean; unreadCount?: number };
      return {
        hasChats: Boolean(parsed.hasChats),
        unreadCount: typeof parsed.unreadCount === "number" ? parsed.unreadCount : 0,
      };
    } catch {
      return EMPTY_CHAT_NAV_STATE;
    }
  }, [chatNavSnapshot]);
  const navItems = useMemo(() => {
    const chatItem: NavItem = {
      href: portal === "admin" ? "/admin/chat" : "/applications/chat",
      label: "Chat",
      icon: MessageSquare,
      matchPrefix: portal === "admin" ? "/admin/chat" : "/applications/chat",
    };

    if (portal === "admin") {
      return chatNavState.hasChats
        ? [ADMIN_NAV[0], ADMIN_NAV[1], ADMIN_NAV[2], chatItem, ADMIN_NAV[3], ADMIN_NAV[4]]
        : ADMIN_NAV;
    }

    return chatNavState.hasChats
      ? [CANDIDATE_NAV[0], CANDIDATE_NAV[1], CANDIDATE_NAV[2], chatItem, CANDIDATE_NAV[3]]
      : CANDIDATE_NAV;
  }, [chatNavState.hasChats, portal]);
  const breadcrumbs = getBreadcrumbs(pathname, portal, title);
  const candidatePortalMark = (
    <div className="relative h-7 w-7">
      <BriefcaseBusiness className="absolute left-0 top-0 h-7 w-7" />
      <UserCircle2 className="absolute -bottom-1 -right-1 h-4 w-4 rounded-full bg-[var(--color-sidebar-accent)]" />
    </div>
  );

  useEffect(() => {
    let cancelled = false;

    const loadChatSummary = async () => {
      try {
        const response = await fetch("/api/chat/inbox", { cache: "no-store" });

        if (!response.ok) {
          return;
        }

        const payload = await response.json() as { hasChats?: boolean; unreadCount?: number };

        if (!cancelled) {
          const currentSnapshot = readChatNavStateSnapshot(storageKey);
          const current = currentSnapshot
            ? (() => {
              try {
                const parsed = JSON.parse(currentSnapshot) as { hasChats?: boolean; unreadCount?: number };
                return {
                  hasChats: Boolean(parsed.hasChats),
                  unreadCount: typeof parsed.unreadCount === "number" ? parsed.unreadCount : 0,
                };
              } catch {
                return EMPTY_CHAT_NAV_STATE;
              }
            })()
            : EMPTY_CHAT_NAV_STATE;
          const nextState = {
            hasChats: current.hasChats || Boolean(payload.hasChats),
            unreadCount: typeof payload.unreadCount === "number" ? payload.unreadCount : current.unreadCount,
          };
          const nextSnapshot = JSON.stringify(nextState);

          if (nextSnapshot !== currentSnapshot) {
            window.localStorage.setItem(storageKey, nextSnapshot);
            window.dispatchEvent(new Event("chat-summary-changed"));
          }
        }
      } catch {
        // Ignore shell chat summary failures.
      }
    };

    void loadChatSummary();
    const intervalId = window.setInterval(() => {
      void loadChatSummary();
    }, 5000);

    const visibilityHandler = () => {
      if (!document.hidden) {
        void loadChatSummary();
      }
    };

    window.addEventListener("focus", loadChatSummary);
    document.addEventListener("visibilitychange", visibilityHandler);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
      window.removeEventListener("focus", loadChatSummary);
      document.removeEventListener("visibilitychange", visibilityHandler);
    };
  }, [pathname, storageKey]);

  return (
    <div className="min-h-screen bg-[var(--color-canvas)] text-[var(--color-ink)]">
      <div className="flex min-h-screen w-full gap-3 px-3 py-3 sm:gap-4 sm:px-4 sm:py-4 lg:px-5 xl:px-6">
        <aside className="sticky top-3 z-30 hidden h-[calc(100vh-24px)] w-[74px] shrink-0 overflow-visible flex-col rounded-[26px] border border-[var(--color-border-strong)] bg-[linear-gradient(180deg,rgba(245,249,243,0.96),rgba(231,240,231,0.96))] p-2.5 shadow-[var(--shadow-soft)] lg:flex sm:top-4 sm:h-[calc(100vh-32px)]">
          <div className="mb-5 flex h-12 items-center justify-center rounded-[18px] bg-[var(--color-sidebar-accent)] text-[var(--color-sidebar-accent-ink)]">
            {portal === "admin" ? <ShieldCheck className="h-6 w-6" /> : candidatePortalMark}
          </div>
          <nav className="flex flex-1 flex-col gap-2.5 overflow-visible">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = isActivePath(pathname, item);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  title={item.label}
                  aria-label={item.label}
                  className={`group relative z-0 flex h-11 items-center justify-center rounded-[18px] border transition hover:z-20 focus-visible:z-20 ${
                    active
                      ? "theme-surface-active"
                      : "border-transparent bg-transparent text-[var(--color-muted)] hover:border-[var(--color-border)] hover:bg-white"
                  }`}
                >
                  <Icon className="h-5 w-5" />
                  {item.label === "Chat" && chatNavState.unreadCount > 0 ? (
                    <span className="absolute -right-1.5 -top-1.5 z-10 inline-flex min-w-[20px] items-center justify-center rounded-full border-2 border-[var(--color-panel)] bg-rose-500 px-1.5 py-0.5 text-[10px] font-semibold leading-none text-white shadow-sm">
                      {chatNavState.unreadCount > 9 ? "9+" : chatNavState.unreadCount}
                    </span>
                  ) : null}
                  <span className="pointer-events-none absolute left-[calc(100%+10px)] top-1/2 z-30 hidden -translate-y-1/2 whitespace-nowrap rounded-xl border border-[var(--color-border-strong)] bg-[var(--color-panel)] px-3 py-1.5 text-xs font-medium text-[var(--color-ink)] opacity-0 shadow-[var(--shadow-soft)] transition group-hover:opacity-100 xl:block">
                    {item.label}
                  </span>
                </Link>
              );
            })}
          </nav>
          {switchHref && switchLabel && (
            <Link
              href={switchHref}
              title={switchLabel}
              aria-label={switchLabel}
              className="group relative z-0 mt-2.5 flex h-11 items-center justify-center rounded-[18px] border border-[var(--color-border)] bg-white text-[var(--color-muted)] transition hover:z-20 hover:border-[var(--color-sidebar-accent)] hover:text-[var(--color-ink)] focus-visible:z-20"
            >
              {portal === "admin" ? <LayoutGrid className="h-5 w-5" /> : <ShieldCheck className="h-5 w-5" />}
              <span className="pointer-events-none absolute left-[calc(100%+10px)] top-1/2 z-30 hidden -translate-y-1/2 whitespace-nowrap rounded-xl border border-[var(--color-border-strong)] bg-[var(--color-panel)] px-3 py-1.5 text-xs font-medium text-[var(--color-ink)] opacity-0 shadow-[var(--shadow-soft)] transition group-hover:opacity-100 xl:block">
                {switchLabel}
              </span>
            </Link>
          )}
        </aside>

        <div className="relative z-0 flex min-w-0 flex-1 flex-col gap-3 pb-24 sm:gap-4 lg:pb-0">
          <header className="rounded-[28px] border border-[var(--color-border-strong)] bg-[var(--color-panel)] px-5 py-5 shadow-[var(--shadow-soft)] sm:px-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="mb-3 flex items-center gap-3 lg:hidden">
                  <div className="flex h-11 w-11 items-center justify-center rounded-[18px] bg-[var(--color-sidebar-accent)] text-[var(--color-sidebar-accent-ink)] shadow-[var(--shadow-soft)]">
                    {portal === "admin" ? <ShieldCheck className="h-5 w-5" /> : candidatePortalMark}
                  </div>
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--color-muted)]">
                    {portal === "admin" ? "Admin Portal" : "Candidate Portal"}
                  </p>
                </div>
                {breadcrumbs.length > 0 && (
                  <nav
                    aria-label="Breadcrumb"
                    className="mb-3 flex flex-wrap items-center gap-2 text-sm text-[var(--color-muted)]"
                  >
                    {breadcrumbs.map((item, index) => (
                      <div key={`${item.label}-${index}`} className="flex items-center gap-2">
                        {index > 0 && <span className="text-[var(--color-border-strong)]">/</span>}
                        {item.href ? (
                          <Link
                            href={item.href}
                            className="transition hover:text-[var(--color-ink)]"
                          >
                            {item.label}
                          </Link>
                        ) : (
                          <span className="font-medium text-[var(--color-ink)]">{item.label}</span>
                        )}
                      </div>
                    ))}
                  </nav>
                )}
                <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[var(--color-brand-strong)]">
                  {eyebrow}
                </p>
                <h1 className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-[var(--color-ink)]">
                  {title}
                </h1>
                <p className="mt-2 text-sm text-[var(--color-muted)]">
                  {subtitle || `Signed in as ${sessionEmail}`}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {switchHref && switchLabel && (
                  <Link
                    href={switchHref}
                    className="theme-action-button theme-action-button-secondary hidden rounded-2xl px-4 py-2.5 transition hover:border-[var(--color-border-strong)] sm:inline-flex"
                  >
                    {switchLabel}
                  </Link>
                )}
                {secondaryActionHref && secondaryActionLabel && (
                  <Link
                    href={secondaryActionHref}
                    className="theme-action-button theme-action-button-secondary hidden rounded-2xl px-4 py-2.5 transition hover:border-[var(--color-border-strong)] sm:inline-flex"
                  >
                    {secondaryActionLabel}
                  </Link>
                )}
                {primaryActionHref && primaryActionLabel && (
                  <Link
                    href={primaryActionHref}
                    className="theme-btn-primary theme-action-button rounded-2xl px-4 py-2.5"
                  >
                    {primaryActionLabel}
                  </Link>
                )}
                <LogoutButton />
              </div>
            </div>

          </header>

          <main className="min-w-0 flex-1">{children}</main>
        </div>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-[var(--color-border-strong)] bg-[rgba(252,253,249,0.96)] px-3 py-3 backdrop-blur lg:hidden">
        <div className="mx-auto flex max-w-screen-sm items-center justify-between gap-2 rounded-[24px] border border-[var(--color-border-strong)] bg-[var(--color-panel)] p-2 shadow-[var(--shadow-soft)]">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActivePath(pathname, item);

            return (
              <Link
                key={item.href}
                href={item.href}
                title={item.label}
                aria-label={item.label}
                className={`theme-action-button relative flex h-12 w-12 shrink-0 items-center justify-center rounded-[18px] transition ${
                  active
                    ? "theme-surface-active"
                    : "text-[var(--color-muted)] hover:bg-white"
                }`}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {item.label === "Chat" && chatNavState.unreadCount > 0 ? (
                  <span className="absolute -right-1 -top-1 z-10 inline-flex min-w-[18px] items-center justify-center rounded-full border-2 border-[var(--color-panel)] bg-rose-500 px-1 text-[9px] font-semibold text-white shadow-sm">
                    {chatNavState.unreadCount > 9 ? "9+" : chatNavState.unreadCount}
                  </span>
                ) : null}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
