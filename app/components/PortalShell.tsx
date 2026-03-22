"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Building2,
  ClipboardList,
  CreditCard,
  BriefcaseBusiness,
  House,
  LayoutGrid,
  LogOut,
  MessageSquare,
  Settings,
  ShieldCheck,
  UserCircle2,
  UserRound,
  Users,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { isFeatureEnabled } from "../../lib/feature-catalog";
import { ConfirmDialog } from "./ConfirmDialog";

type PortalShellProps = {
  portal: "admin" | "candidate" | "system" | "tenant";
  sessionEmail: string;
  title: string;
  eyebrow: string;
  subtitle?: string;
  organizationSlug?: string;
  tenantFeatureKeys?: string[];
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

type TenantOrganizationOption = {
  id: string;
  slug: string;
  name: string;
  role: "owner" | "admin";
  isRootOwner: boolean;
  logoUrl?: string | null;
};

type UserMenuItem = {
  href?: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  onClick?: () => void;
  tone?: "default" | "danger";
};

const formatSessionDisplayName = (email: string) => {
  const localPart = email.trim().split("@")[0] ?? "";

  if (!localPart) {
    return "Account";
  }

  return localPart
    .replace(/[._-]+/g, " ")
    .split(" ")
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ");
};

function PortalUserMenu({
  sessionEmail,
  displayName,
  items,
  compact = false,
}: {
  sessionEmail: string;
  displayName: string;
  items: UserMenuItem[];
  compact?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const initials = useMemo(() => {
    const nameParts = displayName.split(" ").filter(Boolean);
    return (nameParts[0]?.[0] ?? sessionEmail[0] ?? "U").toUpperCase();
  }, [displayName, sessionEmail]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handlePointerDown = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen]);

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setIsOpen((current) => !current)}
        className={`group flex items-center gap-3 text-left transition ${
          compact
            ? "mx-auto h-12 w-12 justify-center rounded-full border border-[var(--color-border)] bg-white p-1 shadow-[var(--shadow-soft)] hover:border-[var(--color-border-strong)]"
            : "w-full rounded-[18px] border border-[var(--color-border)] bg-white px-3 py-2 hover:border-[var(--color-border-strong)]"
        }`}
      >
        <span className={`flex shrink-0 items-center justify-center rounded-full bg-[var(--color-panel-strong)] text-sm font-semibold text-[var(--color-brand-strong)] ${
          compact ? "h-9 w-9" : "h-10 w-10"
        }`}>
          {initials}
        </span>
        {!compact ? (
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-semibold text-[var(--color-ink)]">{displayName}</span>
            <span className="block truncate text-xs text-[var(--color-muted)]">{sessionEmail}</span>
          </span>
        ) : null}
      </button>

      {isOpen ? (
        <div className={`absolute z-40 w-[260px] rounded-[18px] border border-[var(--color-border-strong)] bg-[var(--color-panel)] p-2 shadow-[var(--shadow-soft)] ${
          compact ? "bottom-0 left-[calc(100%+10px)]" : "bottom-[calc(100%+10px)] left-0"
        }`}>
          <div className="rounded-[14px] bg-white px-3 py-3">
            <p className="truncate text-sm font-semibold text-[var(--color-ink)]">{displayName}</p>
            <p className="mt-1 truncate text-xs text-[var(--color-muted)]">{sessionEmail}</p>
          </div>
          <div className="mt-2 space-y-1">
            {items.map((item) => {
              const Icon = item.icon;
              const className = `flex w-full items-center gap-3 rounded-[14px] px-3 py-2.5 text-sm transition ${
                item.tone === "danger"
                  ? "text-red-600 hover:bg-red-50"
                  : "text-[var(--color-ink)] hover:bg-white"
              }`;

              if (item.href) {
                return (
                  <Link
                    key={item.label}
                    href={item.href}
                    onClick={() => setIsOpen(false)}
                    className={className}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{item.label}</span>
                  </Link>
                );
              }

              return (
                <button
                  key={item.label}
                  type="button"
                  onClick={() => {
                    setIsOpen(false);
                    item.onClick?.();
                  }}
                  className={className}
                >
                  <Icon className="h-4 w-4" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}

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

const SYSTEM_NAV: NavItem[] = [
  { href: "/system", label: "Dashboard", icon: LayoutGrid },
  { href: "/system/organizations", label: "Organizations", icon: Building2, matchPrefix: "/system/organizations" },
  { href: "/system/subscriptions", label: "Subscriptions", icon: ClipboardList, matchPrefix: "/system/subscriptions" },
  { href: "/system/users", label: "Super Admins", icon: ShieldCheck, matchPrefix: "/system/users" },
];

const buildTenantNav = (slug: string, tenantFeatureKeys?: string[]): NavItem[] => {
  const items: NavItem[] = [
    { href: `/o/${slug}`, label: "Dashboard", icon: LayoutGrid },
  ];

  if (isFeatureEnabled(tenantFeatureKeys ?? [], "tenant_jobs")) {
    items.push({ href: `/o/${slug}/jobs`, label: "Jobs", icon: BriefcaseBusiness, matchPrefix: `/o/${slug}/jobs` });
  }

  if (isFeatureEnabled(tenantFeatureKeys ?? [], "tenant_candidates")) {
    items.push({ href: `/o/${slug}/candidates`, label: "Candidates", icon: Users, matchPrefix: `/o/${slug}/candidates` });
  }

  if (isFeatureEnabled(tenantFeatureKeys ?? [], "tenant_settings")) {
    items.push({ href: `/o/${slug}/settings`, label: "Settings", icon: Settings, matchPrefix: `/o/${slug}/settings` });
  }

  return items;
};

const TENANT_LOADING_NAV: NavItem[] = [
  { href: "/__tenant-loading/dashboard", label: "Dashboard", icon: LayoutGrid },
  { href: "/__tenant-loading/jobs", label: "Jobs", icon: BriefcaseBusiness },
  { href: "/__tenant-loading/candidates", label: "Candidates", icon: Users },
  { href: "/__tenant-loading/settings", label: "Settings", icon: Settings },
];

const normalizeTenantPath = (path: string, slug: string) => {
  const base = `/o/${slug}`;

  if (path === base) {
    return "/";
  }

  if (path.startsWith(`${base}/`)) {
    return path.slice(base.length);
  }

  return path;
};

const isActivePath = (
  pathname: string,
  item: NavItem,
  portal: "admin" | "candidate" | "system" | "tenant",
  organizationSlug?: string,
) => {
  const normalizedPathname = portal === "tenant" && organizationSlug
    ? normalizeTenantPath(pathname, organizationSlug)
    : pathname;

  const normalizedHref = portal === "tenant" && organizationSlug
    ? normalizeTenantPath(item.href, organizationSlug)
    : item.href;

  const normalizedMatchPrefix = item.matchPrefix && portal === "tenant" && organizationSlug
    ? normalizeTenantPath(item.matchPrefix, organizationSlug)
    : item.matchPrefix;

  if (item.matchPrefix) {
    return normalizedPathname === normalizedHref
      || Boolean(normalizedMatchPrefix && normalizedPathname.startsWith(normalizedMatchPrefix));
  }

  return normalizedPathname === normalizedHref;
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
  portal: "admin" | "candidate" | "system" | "tenant",
  title: string,
  organizationSlug?: string,
): BreadcrumbItem[] => {
  if (portal === "tenant" && organizationSlug) {
    const base = `/o/${organizationSlug}`;
    const tenantPath = normalizeTenantPath(pathname, organizationSlug);
    if (tenantPath === "/") return [{ label: "Dashboard" }];
    if (tenantPath === "/jobs") return [{ href: base, label: "Dashboard" }, { label: "Jobs" }];
    if (tenantPath === "/candidates") return [{ href: base, label: "Dashboard" }, { label: "Candidates" }];
    if (tenantPath === "/settings") return [{ href: base, label: "Dashboard" }, { label: "Settings" }];
    if (tenantPath.startsWith("/jobs/")) return [{ href: base, label: "Dashboard" }, { href: `${base}/jobs`, label: "Jobs" }, { label: title }];
    if (tenantPath.startsWith("/candidates/")) return [{ href: base, label: "Dashboard" }, { href: `${base}/candidates`, label: "Candidates" }, { label: title }];
    return [{ href: base, label: "Dashboard" }, { label: title }];
  }
  if (portal === "system") {
    if (pathname === "/system") {
      return [{ label: "Dashboard" }];
    }
    if (pathname === "/system/organizations") {
      return [{ href: "/system", label: "Dashboard" }, { label: "Organizations" }];
    }
    if (pathname === "/system/subscriptions") {
      return [{ href: "/system", label: "Dashboard" }, { label: "Subscriptions" }];
    }
    if (pathname.startsWith("/system/organizations/")) {
      return [
        { href: "/system", label: "Dashboard" },
        { href: "/system/organizations", label: "Organizations" },
        { label: title },
      ];
    }
    if (pathname === "/system/users") {
      return [{ href: "/system", label: "Dashboard" }, { label: "Super Admins" }];
    }
    return [{ href: "/system", label: "Dashboard" }, { label: title }];
  }

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
  organizationSlug,
  tenantFeatureKeys,
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
  const [tenantOrganizations, setTenantOrganizations] = useState<TenantOrganizationOption[]>([]);
  const [isLoadingTenantOrganizations, setIsLoadingTenantOrganizations] = useState(false);
  const [cachedOrgName, setCachedOrgName] = useState<string | null>(null);
  const [showTenantExitConfirm, setShowTenantExitConfirm] = useState(false);
  const [isTenantExitLoading, setIsTenantExitLoading] = useState(false);
  const [isMenuLogoutLoading, setIsMenuLogoutLoading] = useState(false);
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
  const tenantPortalMark = <Building2 className="h-6 w-6" />;
  const navItems = useMemo(() => {
    if (portal === "system") {
      return SYSTEM_NAV;
    }

    if (portal === "tenant") {
      return organizationSlug ? buildTenantNav(organizationSlug, tenantFeatureKeys) : TENANT_LOADING_NAV;
    }

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
  }, [chatNavState.hasChats, organizationSlug, portal, tenantFeatureKeys]);
  const tenantSwitcherItems = useMemo(() => {
    if (portal !== "tenant") {
      return [] as TenantOrganizationOption[];
    }

    const seenSlugs = new Set<string>();
    const items: TenantOrganizationOption[] = [];

    for (const option of tenantOrganizations) {
      if (!option.slug || seenSlugs.has(option.slug)) {
        continue;
      }

      seenSlugs.add(option.slug);
      items.push(option);
    }

    if (organizationSlug && !seenSlugs.has(organizationSlug)) {
      items.unshift({
        id: organizationSlug,
        slug: organizationSlug,
        name: cachedOrgName ?? organizationSlug,
        role: "admin",
        isRootOwner: false,
        logoUrl: null,
      });
    }

    return items;
  }, [cachedOrgName, organizationSlug, portal, tenantOrganizations]);

  const handleTenantOrganizationChange = (nextSlug: string) => {
    if (portal !== "tenant" || !nextSlug || !organizationSlug || nextSlug === organizationSlug) {
      return;
    }

    const currentTenantPath = normalizeTenantPath(pathname, organizationSlug);
    const normalizedTenantPath = currentTenantPath.startsWith("/")
      ? currentTenantPath
      : `/${currentTenantPath}`;
    const hostname = window.location.hostname.toLowerCase();
    const isTenantHost = hostname.startsWith(`${organizationSlug}.`) || hostname.endsWith(".localhost");
    const switchPath = isTenantHost
      ? (
        normalizedTenantPath === "/"
          ? `/switch/${nextSlug}`
          : `/switch/${nextSlug}?next=${encodeURIComponent(normalizedTenantPath)}`
      )
      : (
        normalizedTenantPath === "/"
          ? `/o/${organizationSlug}/switch/${nextSlug}`
          : `/o/${organizationSlug}/switch/${nextSlug}?next=${encodeURIComponent(normalizedTenantPath)}`
      );

    window.location.assign(switchPath);
  };
  const breadcrumbs = getBreadcrumbs(pathname, portal, title, organizationSlug);
  const candidatePortalMark = (
    <div className="relative h-7 w-7">
      <BriefcaseBusiness className="absolute left-0 top-0 h-7 w-7" />
      <UserCircle2 className="absolute -bottom-1 -right-1 h-4 w-4 rounded-full bg-[var(--color-sidebar-accent)]" />
    </div>
  );
  const systemPortalMark = <Building2 className="h-6 w-6" />; // keep for backward compat

  useEffect(() => {
    if (portal !== "tenant" || !organizationSlug) {
      return;
    }

    const guardedUrl = window.location.href;
    const sentinelMarker = {
      tenantBackGuard: true,
      slug: organizationSlug,
      path: pathname,
    };

    window.history.pushState(sentinelMarker, "", guardedUrl);

    const handlePopState = () => {
      window.history.pushState(sentinelMarker, "", guardedUrl);
      setShowTenantExitConfirm(true);
    };

    window.addEventListener("popstate", handlePopState);

    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, [organizationSlug, pathname, portal]);

  useEffect(() => {
    if (portal === "system" || portal === "tenant") {
      return;
    }

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
  }, [pathname, portal, storageKey]);

  useEffect(() => {
    if (portal === "tenant" && organizationSlug) {
      setCachedOrgName(localStorage.getItem(`org-name:${organizationSlug}`));
    }
  }, [organizationSlug, portal]);

  useEffect(() => {
    if (portal !== "tenant") {
      return;
    }

    let cancelled = false;

    const loadOrganizations = async () => {
      setIsLoadingTenantOrganizations(true);

      try {
        const response = await fetch("/api/tenant/organizations", { cache: "no-store" });

        if (!response.ok) {
          return;
        }

        const payload = await response.json() as { items?: TenantOrganizationOption[] };

        if (!cancelled && Array.isArray(payload.items)) {
          for (const item of payload.items) {
            if (item.slug && item.name) {
              localStorage.setItem(`org-name:${item.slug}`, item.name);
            }
          }
          setTenantOrganizations(payload.items);
        }
      } catch {
        // Ignore organization switcher loading failures.
      } finally {
        if (!cancelled) {
          setIsLoadingTenantOrganizations(false);
        }
      }
    };

    void loadOrganizations();

    return () => {
      cancelled = true;
    };
  }, [portal, sessionEmail]);

  const displayName = useMemo(
    () => formatSessionDisplayName(sessionEmail),
    [sessionEmail],
  );
  const currentTenantOption = useMemo(
    () => tenantSwitcherItems.find((item) => item.slug === organizationSlug) ?? null,
    [organizationSlug, tenantSwitcherItems],
  );
  const accountHref = useMemo(() => {
    if (portal === "candidate") {
      return "/account";
    }

    if (portal === "admin") {
      return "/admin/account";
    }

    if (portal === "system") {
      return "/system/account";
    }

    return organizationSlug ? `/o/${organizationSlug}/account` : undefined;
  }, [organizationSlug, portal]);
  const billingHref = useMemo(() => {
    if (
      portal !== "tenant"
      || !organizationSlug
      || !currentTenantOption
      || (currentTenantOption.role !== "owner" && !currentTenantOption.isRootOwner)
    ) {
      return undefined;
    }

    return `/o/${organizationSlug}/billing`;
  }, [currentTenantOption, organizationSlug, portal]);

  const handleTenantExitConfirm = async () => {
    setIsTenantExitLoading(true);

    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
    } catch {
      // Ignore logout failures and continue to the public home.
    } finally {
      const { protocol, port } = window.location;
      const portSuffix = port ? `:${port}` : "";
      window.location.assign(`${protocol}//lvh.me${portSuffix}/`);
    }
  };

  const handleMenuLogout = async () => {
    setIsMenuLogoutLoading(true);

    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
    } catch {
      // Ignore logout failures and continue to the public home.
    } finally {
      const { protocol, port } = window.location;
      const portSuffix = port ? `:${port}` : "";
      window.location.assign(`${protocol}//lvh.me${portSuffix}/`);
    }
  };

  const userMenuItems = useMemo<UserMenuItem[]>(() => {
    const items: UserMenuItem[] = [];

    if (accountHref) {
      items.push({
        href: accountHref,
        label: "Account",
        icon: UserRound,
      });
    }

    if (billingHref) {
      items.push({
        href: billingHref,
        label: "Billing",
        icon: CreditCard,
      });
    }

    items.push({
      label: isMenuLogoutLoading ? "Logging out..." : "Logout",
      icon: LogOut,
      onClick: handleMenuLogout,
      tone: "danger",
    });

    return items;
  }, [accountHref, billingHref, isMenuLogoutLoading]);

  return (
    <>
      <ConfirmDialog
        isOpen={showTenantExitConfirm}
        title="Leave this portal?"
        message="Going back will log you out of the current organization portal and return you to the root portal."
        confirmLabel="Logout"
        loadingLabel="Logging out..."
        tone="warning"
        isLoading={isTenantExitLoading}
        onConfirm={handleTenantExitConfirm}
        onCancel={() => setShowTenantExitConfirm(false)}
      />
      <div className="min-h-screen bg-[var(--color-canvas)] text-[var(--color-ink)]">
        <div className="flex min-h-screen w-full gap-3 px-3 py-3 sm:gap-4 sm:px-4 sm:py-4 lg:px-5 xl:px-6">
        <aside className="sticky top-3 z-30 hidden h-[calc(100vh-24px)] w-[74px] shrink-0 overflow-visible flex-col rounded-[26px] border border-[var(--color-border-strong)] bg-[linear-gradient(180deg,var(--color-panel),var(--color-panel-strong))] p-2.5 shadow-[var(--shadow-soft)] lg:flex sm:top-4 sm:h-[calc(100vh-32px)]">
          <div className="mb-5 flex h-12 items-center justify-center rounded-[18px] bg-[var(--color-sidebar-accent)] text-[var(--color-sidebar-accent-ink)]">
            {portal === "candidate"
              ? candidatePortalMark
              : portal === "admin"
                ? <ShieldCheck className="h-6 w-6" />
                : portal === "tenant"
                  ? tenantPortalMark
                  : systemPortalMark}
          </div>
          <nav className="flex flex-1 flex-col gap-2.5 overflow-visible">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = isActivePath(pathname, item, portal, organizationSlug);

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
              {portal === "admin"
                ? <LayoutGrid className="h-5 w-5" />
                : portal === "candidate"
                  ? <ShieldCheck className="h-5 w-5" />
                  : <House className="h-5 w-5" />}
              <span className="pointer-events-none absolute left-[calc(100%+10px)] top-1/2 z-30 hidden -translate-y-1/2 whitespace-nowrap rounded-xl border border-[var(--color-border-strong)] bg-[var(--color-panel)] px-3 py-1.5 text-xs font-medium text-[var(--color-ink)] opacity-0 shadow-[var(--shadow-soft)] transition group-hover:opacity-100 xl:block">
                {switchLabel}
              </span>
            </Link>
          )}
          <div className="mt-3">
            <PortalUserMenu
              sessionEmail={sessionEmail}
              displayName={displayName}
              items={userMenuItems}
              compact
            />
          </div>
        </aside>

        <div className="relative z-0 flex min-w-0 flex-1 flex-col gap-3 pb-24 sm:gap-4 lg:pb-0">
          <header className="rounded-[28px] border border-[var(--color-border-strong)] bg-[var(--color-panel)] px-5 py-5 shadow-[var(--shadow-soft)] sm:px-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="mb-3 flex items-center gap-3 lg:hidden">
                  <div className="flex h-11 w-11 items-center justify-center rounded-[18px] bg-[var(--color-sidebar-accent)] text-[var(--color-sidebar-accent-ink)] shadow-[var(--shadow-soft)]">
                    {portal === "candidate"
                      ? candidatePortalMark
                      : portal === "admin"
                        ? <ShieldCheck className="h-5 w-5" />
                        : portal === "tenant"
                          ? tenantPortalMark
                          : systemPortalMark}
                  </div>
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--color-muted)]">
                    {portal === "admin"
                      ? "Admin Portal"
                      : portal === "candidate"
                        ? "Candidate Portal"
                        : portal === "tenant"
                          ? "Organization Portal"
                          : "System Portal"}
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

              <div className="flex flex-wrap items-end gap-2">
                {portal === "tenant" && organizationSlug && (
                  <div className="w-full sm:w-[280px]">
                    <label
                      htmlFor="tenant-organization-switcher"
                      className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--color-muted)]"
                    >
                      Organization
                    </label>
                    <select
                      id="tenant-organization-switcher"
                      value={organizationSlug}
                      onChange={(event) => handleTenantOrganizationChange(event.target.value)}
                      disabled={isLoadingTenantOrganizations || tenantSwitcherItems.length <= 1}
                      className="h-10 w-full rounded-xl border border-[var(--color-border)] bg-white px-3 text-sm text-[var(--color-ink)] outline-none transition focus:border-[var(--color-brand-strong)] focus:ring-4 focus:ring-[var(--color-focus-ring)] disabled:cursor-not-allowed disabled:opacity-70"
                    >
                      {tenantSwitcherItems.map((item) => (
                        <option key={item.slug} value={item.slug}>
                          {item.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
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
                <div className="sm:hidden">
                  <PortalUserMenu
                    sessionEmail={sessionEmail}
                    displayName={displayName}
                    items={userMenuItems}
                    compact
                  />
                </div>
                <div className="hidden">
                  <PortalUserMenu
                    sessionEmail={sessionEmail}
                    displayName={displayName}
                    items={userMenuItems}
                  />
                </div>
              </div>
            </div>

          </header>

          <main className="min-w-0 flex-1">{children}</main>
        </div>
        </div>

        <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-[var(--color-border-strong)] bg-[var(--color-panel)] px-3 py-3 backdrop-blur lg:hidden">
          <div className="mx-auto flex max-w-screen-sm items-center justify-between gap-2 rounded-[24px] border border-[var(--color-border-strong)] bg-[var(--color-panel)] p-2 shadow-[var(--shadow-soft)]">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = isActivePath(pathname, item, portal, organizationSlug);

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
    </>
  );
}
