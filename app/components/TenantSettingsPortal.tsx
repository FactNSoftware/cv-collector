"use client";

import React, { ChangeEvent, FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  Building2,
  CheckCircle2,
  Clock,
  Copy,
  Globe,
  Lock,
  Mail,
  Palette,
  Trash2,
  UserPlus,
  Users,
} from "lucide-react";
import type {
  OrganizationMembership,
  OrganizationRecord,
  OrganizationRole,
} from "../../lib/organizations";
import type {
  OrganizationBrandingSettings,
  TenantTheme,
  EmailDomainDnsRecord,
} from "../../lib/organization-branding";
import { toTenantCssVariables, getEmailDomainDnsRecords } from "../../lib/organization-branding";
import { ConfirmDialog } from "./ConfirmDialog";
import { PortalShell } from "./PortalShell";
import { useToast } from "./ToastProvider";

type Tab = "details" | "theme" | "members";

type DomainPhase = "idle" | "pending" | "verified";

type LogoInputMode = "url" | "file";

type OrganizationProfileDraft = {
  name: string;
  slug: string;
  logoUrl: string;
  websiteUrl: string;
  contactEmail: string;
  contactPhone: string;
  location: string;
  description: string;
};

type SlugCheckState = {
  status: "idle" | "checking" | "available" | "taken";
  slug: string;
  message: string;
};

type Props = {
  sessionEmail: string;
  organization: OrganizationRecord;
  members: OrganizationMembership[];
  isOwner: boolean;
  initialSettings: OrganizationBrandingSettings | null;
  platformHost: string;
};

const DEFAULT_THEME: TenantTheme = {
  canvas: "#eef4ee",
  panel: "#fcfdf9",
  panelStrong: "#e5efe5",
  sidebarAccent: "#003d18",
  sidebarAccentInk: "#a5eb2e",
  ink: "#171a17",
  muted: "#667067",
  brand: "#a5eb2e",
  brandStrong: "#0f4f21",
  border: "#d4ded4",
  borderStrong: "#b8c9b8",
};

type ThemePreset = { id: string; name: string; colors: TenantTheme };

const PRESET_THEMES: ThemePreset[] = [
  { id: "forest", name: "Forest", colors: DEFAULT_THEME },
  {
    id: "ocean",
    name: "Ocean",
    colors: {
      canvas: "#eef3f8",
      panel: "#f8fbff",
      panelStrong: "#ddeaf5",
      sidebarAccent: "#003d6b",
      sidebarAccentInk: "#7dd3fc",
      ink: "#0f1f2e",
      muted: "#4a6880",
      brand: "#7dd3fc",
      brandStrong: "#0369a1",
      border: "#c8dcea",
      borderStrong: "#aac4d8",
    },
  },
  {
    id: "slate",
    name: "Slate",
    colors: {
      canvas: "#f1f3f5",
      panel: "#f8f9fa",
      panelStrong: "#e2e6ea",
      sidebarAccent: "#1e2d3d",
      sidebarAccentInk: "#94a3b8",
      ink: "#0f1c2a",
      muted: "#5a6e80",
      brand: "#94a3b8",
      brandStrong: "#1e3a5f",
      border: "#cfd8e0",
      borderStrong: "#b0bec8",
    },
  },
  {
    id: "sunset",
    name: "Sunset",
    colors: {
      canvas: "#fdf6ee",
      panel: "#fffaf5",
      panelStrong: "#faecd8",
      sidebarAccent: "#7c2d12",
      sidebarAccentInk: "#fdba74",
      ink: "#1c0f06",
      muted: "#7a4828",
      brand: "#fdba74",
      brandStrong: "#9a3412",
      border: "#f0d5b8",
      borderStrong: "#e0ba98",
    },
  },
  {
    id: "mono",
    name: "Mono",
    colors: {
      canvas: "#f5f5f5",
      panel: "#ffffff",
      panelStrong: "#e8e8e8",
      sidebarAccent: "#1a1a1a",
      sidebarAccentInk: "#d4d4d4",
      ink: "#111111",
      muted: "#666666",
      brand: "#d4d4d4",
      brandStrong: "#1a1a1a",
      border: "#d4d4d4",
      borderStrong: "#aaaaaa",
    },
  },
];

const detectPresetId = (theme: TenantTheme): string => {
  const match = PRESET_THEMES.find((p) =>
    (Object.keys(p.colors) as Array<keyof TenantTheme>).every(
      (k) => p.colors[k] === theme[k],
    ),
  );
  return match?.id ?? "custom";
};

const THEME_FIELDS: Array<{ key: keyof TenantTheme; label: string; hint: string }> = [
  { key: "canvas", label: "Canvas", hint: "Page background" },
  { key: "panel", label: "Panel", hint: "Card backgrounds" },
  { key: "panelStrong", label: "Panel Strong", hint: "Elevated surface" },
  { key: "sidebarAccent", label: "Sidebar Accent", hint: "Sidebar fill" },
  { key: "sidebarAccentInk", label: "Sidebar Ink", hint: "Text on sidebar" },
  { key: "ink", label: "Ink", hint: "Primary text" },
  { key: "muted", label: "Muted", hint: "Secondary text" },
  { key: "brand", label: "Brand", hint: "Accent fill" },
  { key: "brandStrong", label: "Brand Strong", hint: "Links & labels" },
  { key: "border", label: "Border", hint: "Default border" },
  { key: "borderStrong", label: "Border Strong", hint: "Prominent borders" },
];

const ROLE_OPTIONS: Array<{ value: OrganizationRole; label: string; description: string }> = [
  { value: "owner", label: "Owner", description: "Full access including settings and billing" },
  { value: "admin", label: "Admin", description: "Manage jobs and candidates" },
];

const isHexColor = (v: string) => /^#[0-9a-f]{6}$/i.test(v.trim());

const normalizeSlugInput = (value: string) => {
  return value
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
};

const isSlugInputValid = (value: string) => /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value);

const normalizeHexColor = (value: string): string | null => {
  const normalized = value.trim().toLowerCase();
  if (/^#[0-9a-f]{6}$/i.test(normalized)) return normalized;
  if (/^#[0-9a-f]{3}$/i.test(normalized)) {
    const [r, g, b] = normalized.slice(1).split("");
    return `#${r}${r}${g}${g}${b}${b}`;
  }
  return null;
};

const RoleBadge = ({ role }: { role: string }) => {
  const colorMap: Record<string, string> = {
    owner: "bg-violet-100 text-violet-800",
    admin: "bg-blue-100 text-blue-800",
  };
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${
        colorMap[role] ?? "bg-slate-100 text-slate-700"
      }`}
    >
      {role}
    </span>
  );
};

export function TenantSettingsPortal({
  sessionEmail,
  organization,
  members: initialMembers,
  isOwner,
  initialSettings,
  platformHost,
}: Props) {
  const router = useRouter();
  const { showToast } = useToast();
  const [tab, setTab] = useState<Tab>("details");

  const [organizationDraft, setOrganizationDraft] = useState<OrganizationProfileDraft>({
    name: organization.name,
    slug: organization.slug,
    logoUrl: organization.logoUrl ?? "",
    websiteUrl: organization.websiteUrl ?? "",
    contactEmail: organization.contactEmail ?? "",
    contactPhone: organization.contactPhone ?? "",
    location: organization.location ?? "",
    description: organization.description ?? "",
  });
  const [isSavingOrganization, setIsSavingOrganization] = useState(false);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [logoInputMode, setLogoInputMode] = useState<LogoInputMode>(() => {
    const currentLogoUrl = organization.logoUrl ?? "";

    if (!currentLogoUrl) {
      return "file";
    }

    return currentLogoUrl.startsWith("/api/job-assets/organization-logos/")
      ? "file"
      : "url";
  });
  const [lastUploadedLogoDimensions, setLastUploadedLogoDimensions] = useState<{
    width: number;
    height: number;
  } | null>(null);
  const [slugCheckState, setSlugCheckState] = useState<SlugCheckState>({
    status: "idle",
    slug: organization.slug,
    message: "",
  });

  const normalizedDraftSlug = normalizeSlugInput(organizationDraft.slug);
  const effectivePortalSlug = normalizedDraftSlug || organization.slug;
  const portalHostnamePreview = `${effectivePortalSlug}.${platformHost}`;

  const toNullableValue = (value: string) => {
    const normalized = value.trim();
    return normalized ? normalized : null;
  };

  const checkSlugAvailability = async (candidate?: string) => {
    const normalizedCandidate = normalizeSlugInput(candidate ?? organizationDraft.slug);

    if (!normalizedCandidate) {
      setSlugCheckState({
        status: "taken",
        slug: "",
        message: "Slug is required.",
      });
      return { available: false, slug: "" };
    }

    if (!isSlugInputValid(normalizedCandidate)) {
      setSlugCheckState({
        status: "taken",
        slug: normalizedCandidate,
        message: "Slug must use lowercase letters, numbers, and hyphens only.",
      });
      return { available: false, slug: normalizedCandidate, message: "Slug must use lowercase letters, numbers, and hyphens only." };
    }

    if (normalizedCandidate === organization.slug) {
      setSlugCheckState({
        status: "available",
        slug: normalizedCandidate,
        message: "Using current slug.",
      });
      return { available: true, slug: normalizedCandidate, message: "Using current slug." };
    }

    setSlugCheckState({
      status: "checking",
      slug: normalizedCandidate,
      message: "Checking slug availability...",
    });

    try {
      const response = await fetch(
        `/api/tenant/${organization.slug}/organization/slug-availability?slug=${encodeURIComponent(normalizedCandidate)}`,
      );
      const payload = await response
        .json()
        .catch(() => ({ available: false, slug: normalizedCandidate, message: "Slug check failed." }));

      const available = response.ok && payload.available === true;
      const message = payload.message || (available ? "Slug is available." : "Slug is already in use.");
      setSlugCheckState({
        status: available ? "available" : "taken",
        slug: payload.slug ?? normalizedCandidate,
        message,
      });

      return { available, slug: payload.slug ?? normalizedCandidate, message };
    } catch {
      const message = "Unable to verify slug availability right now.";
      setSlugCheckState({
        status: "taken",
        slug: normalizedCandidate,
        message,
      });

      return { available: false, slug: normalizedCandidate, message };
    }
  };

  const handleSaveOrganizationProfile = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!isOwner) {
      showToast("Only owners can update organization details.", "warning");
      return;
    }

    const nextName = organizationDraft.name.trim();

    if (!nextName) {
      showToast("Organization name is required.", "warning");
      return;
    }

    setIsSavingOrganization(true);

    try {
      // In file mode the logo is managed solely by the upload handler;
      // omit logoUrl from the main form save to avoid sending a stale or
      // invalid draft URL while the user is in upload mode.
      const logoUrlPayload = logoInputMode === "url"
        ? { logoUrl: toNullableValue(organizationDraft.logoUrl) }
        : {};

      const response = await fetch(`/api/tenant/${organization.slug}/organization`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: nextName,
          ...logoUrlPayload,
          websiteUrl: toNullableValue(organizationDraft.websiteUrl),
          contactEmail: toNullableValue(organizationDraft.contactEmail),
          contactPhone: toNullableValue(organizationDraft.contactPhone),
          location: toNullableValue(organizationDraft.location),
          description: toNullableValue(organizationDraft.description),
        }),
      });

      const payload = await response
        .json()
        .catch(() => ({ message: "Failed to update organization profile." }));

      if (!response.ok) {
        showToast(payload.message || "Failed to update organization profile.", "error");
        return;
      }

      const nextOrganization = payload.organization as OrganizationRecord | undefined;

      if (nextOrganization) {
        setOrganizationDraft((current) => ({
          ...current,
          name: nextOrganization.name,
          logoUrl: nextOrganization.logoUrl ?? "",
          websiteUrl: nextOrganization.websiteUrl ?? "",
          contactEmail: nextOrganization.contactEmail ?? "",
          contactPhone: nextOrganization.contactPhone ?? "",
          location: nextOrganization.location ?? "",
          description: nextOrganization.description ?? "",
        }));
      }

      showToast(payload.message || "Organization profile saved.");
      router.refresh();
    } finally {
      setIsSavingOrganization(false);
    }
  };

  const handleSaveSlug = async () => {
    if (!isOwner) return;

    const nextSlug = normalizeSlugInput(organizationDraft.slug);

    if (!nextSlug || !isSlugInputValid(nextSlug)) {
      showToast("Slug must use lowercase letters, numbers, and hyphens only.", "warning");
      return;
    }

    if (nextSlug === organization.slug) {
      showToast("Slug is already up to date.", "warning");
      return;
    }

    const slugCheck = await checkSlugAvailability(nextSlug);

    if (!slugCheck.available) {
      // slugCheckState message is set by checkSlugAvailability; use the
      // returned message directly to avoid stale closure issues.
      showToast(slugCheck.message || "That slug is not available. Choose a different one.", "error");
      return;
    }

    setIsSavingOrganization(true);

    try {
      const response = await fetch(`/api/tenant/${organization.slug}/organization`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug: nextSlug }),
      });

      const payload = await response
        .json()
        .catch(() => ({ message: "Failed to update slug." }));

      if (!response.ok) {
        showToast(payload.message || "Failed to update slug.", "error");
        return;
      }

      showToast("Portal slug updated. Redirecting…");
      // Navigate to the new slug settings page. Using window.location (hard nav)
      // follows the middleware subdomain redirect natively while the session
      // cookie (domain-scoped in production) travels to the new subdomain.
      const currentHostname = window.location.hostname.toLowerCase();
      const isOnSubdomain =
        platformHost &&
        currentHostname !== platformHost &&
        currentHostname.endsWith(`.${platformHost}`);

      if (isOnSubdomain) {
        const next = new URL(window.location.href);
        next.hostname = `${nextSlug}.${platformHost}`;
        next.pathname = "/settings";
        window.location.replace(next.toString());
      } else {
        window.location.replace(`/o/${nextSlug}/settings`);
      }
    } finally {
      setIsSavingOrganization(false);
    }
  };

  const handleLogoFileUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const input = event.target;
    const logoFile = input.files?.[0];

    if (!logoFile) {
      return;
    }

    setIsUploadingLogo(true);

    try {
      const formData = new FormData();
      formData.append("logo", logoFile);

      const uploadResponse = await fetch(`/api/tenant/${organization.slug}/organization/logo`, {
        method: "POST",
        body: formData,
      });

      const uploadPayload = await uploadResponse
        .json()
        .catch(() => ({ message: "Failed to upload logo." }));

      if (!uploadResponse.ok) {
        const message = uploadResponse.status >= 500
          ? "Logo processing is temporarily unavailable. Please try again in a few moments."
          : (uploadPayload.message || "Failed to upload logo.");
        showToast(message, "error");
        return;
      }

      const uploadedLogoUrl = typeof uploadPayload.item?.url === "string"
        ? uploadPayload.item.url
        : "";

      if (!uploadedLogoUrl) {
        showToast("Logo upload succeeded but URL is missing.", "error");
        return;
      }

      const saveResponse = await fetch(`/api/tenant/${organization.slug}/organization`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ logoUrl: uploadedLogoUrl }),
      });

      const savePayload = await saveResponse
        .json()
        .catch(() => ({ message: "Failed to save uploaded logo." }));

      if (!saveResponse.ok) {
        const message = saveResponse.status >= 500
          ? "Logo was uploaded but could not be saved due to a temporary server issue. Please retry."
          : (savePayload.message || "Failed to save uploaded logo.");
        showToast(message, "error");
        return;
      }

      const nextOrganization = savePayload.organization as OrganizationRecord | undefined;

      if (nextOrganization) {
        setOrganizationDraft((current) => ({
          ...current,
          logoUrl: nextOrganization.logoUrl ?? uploadedLogoUrl,
        }));
      } else {
        setOrganizationDraft((current) => ({
          ...current,
          logoUrl: uploadedLogoUrl,
        }));
      }

      const width = Number(uploadPayload.item?.width);
      const height = Number(uploadPayload.item?.height);

      if (Number.isFinite(width) && Number.isFinite(height) && width > 0 && height > 0) {
        setLastUploadedLogoDimensions({ width, height });
        showToast(`Logo uploaded and saved (${width}x${height}).`);
      } else {
        setLastUploadedLogoDimensions(null);
        showToast("Logo uploaded and saved.");
      }

      setLogoInputMode("file");

      router.refresh();
    } finally {
      input.value = "";
      setIsUploadingLogo(false);
    }
  };

  // ── Custom domain verification ─────────────────────────────────────────────
  const [domainInput, setDomainInput] = useState(initialSettings?.customDomain ?? "");
  const [domainPhase, setDomainPhase] = useState<DomainPhase>(() => {
    if (!initialSettings?.customDomain) return "idle";
    if (initialSettings.domainVerified) return "verified";
    return "pending";
  });
  const [isSavingDomain, setIsSavingDomain] = useState(false);
  const [isVerifyingDomain, setIsVerifyingDomain] = useState(false);
  const [verifyResult, setVerifyResult] = useState<{
    verified: boolean;
    message: string;
    details?: string;
  } | null>(null);

  const savedDomain = domainPhase !== "idle"
    ? (initialSettings?.customDomain ?? domainInput)
    : "";

  const domainSubdomain = (() => {
    const parts = savedDomain.split(".");
    return parts.length > 2 ? parts.slice(0, parts.length - 2).join(".") : "@";
  })();

  const handleSaveDomain = async () => {
    const normalized = domainInput
      .trim()
      .toLowerCase()
      .replace(/^https?:\/\//, "")
      .split("/")[0]
      .split("?")[0]
      .split("#")[0]
      .trim();

    setIsSavingDomain(true);
    try {
      const response = await fetch(`/api/tenant/${organization.slug}/settings`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customDomain: normalized || null }),
      });
      const payload = await response
        .json()
        .catch(() => ({ message: "Failed to save." }));
      if (!response.ok) {
        showToast(payload.message || "Failed to save domain.", "error");
        return;
      }
      setDomainPhase("pending");
      setVerifyResult(null);
      showToast("Domain saved. Add the DNS record below to activate it.");
      router.refresh();
    } finally {
      setIsSavingDomain(false);
    }
  };

  const handleVerifyDomain = async () => {
    setIsVerifyingDomain(true);
    setVerifyResult(null);
    try {
      const response = await fetch(
        `/api/tenant/${organization.slug}/settings/verify-domain`,
        { method: "POST" },
      );
      const data = await response
        .json()
        .catch(() => ({ verified: false, message: "Verification request failed." }));
      setVerifyResult(data);
      if (data.verified) {
        setDomainPhase("verified");
        showToast("Domain verified and activated!");
        router.refresh();
      }
    } finally {
      setIsVerifyingDomain(false);
    }
  };

  const handleClearDomain = async () => {
    setIsSavingDomain(true);
    try {
      const response = await fetch(`/api/tenant/${organization.slug}/settings`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customDomain: null }),
      });
      if (!response.ok) {
        showToast("Failed to remove domain.", "error");
        return;
      }
      setDomainInput("");
      setDomainPhase("idle");
      setVerifyResult(null);
      showToast("Custom domain removed.");
      router.refresh();
    } finally {
      setIsSavingDomain(false);
    }
  };

  const copyToClipboard = (value: string, label: string) => {
    navigator.clipboard.writeText(value).then(
      () => showToast(`${label} copied.`),
      () => showToast("Copy failed — please copy manually.", "error"),
    );
  };

  // ── Email domain ───────────────────────────────────────────────────────────
  type EmailDomainPhase = "idle" | "pending" | "verified";
  type EmailVerifyResult = {
    spf: boolean; dkim1: boolean; dkim2: boolean;
    allVerified: boolean; message: string;
  };
  const [emailDomainInput, setEmailDomainInput] = useState(initialSettings?.emailDomain ?? "");
  const [emailSenderNameInput, setEmailSenderNameInput] = useState(initialSettings?.emailSenderName ?? "");
  const [emailDomainPhase, setEmailDomainPhase] = useState<EmailDomainPhase>(() => {
    if (!initialSettings?.emailDomain) return "idle";
    if (initialSettings.emailDomainVerified) return "verified";
    return "pending";
  });
  const [isSavingEmailDomain, setIsSavingEmailDomain] = useState(false);
  const [isVerifyingEmailDomain, setIsVerifyingEmailDomain] = useState(false);
  const [emailVerifyResult, setEmailVerifyResult] = useState<EmailVerifyResult | null>(null);

  const handleSaveEmailDomain = async () => {
    const normalized = emailDomainInput.trim().toLowerCase().replace(/^https?:\/\//, "").split("/")[0];
    if (!normalized) {
      showToast("Enter a domain name first.", "error"); return;
    }
    setIsSavingEmailDomain(true);
    try {
      const response = await fetch(`/api/tenant/${organization.slug}/settings`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emailDomain: normalized, emailSenderName: emailSenderNameInput.trim() }),
      });
      if (!response.ok) {
        const p = await response.json().catch(() => ({ message: "Failed to save." })) as { message?: string };
        showToast(p.message || "Failed to save email domain.", "error"); return;
      }
      setEmailDomainInput(normalized);
      setEmailDomainPhase("pending");
      setEmailVerifyResult(null);
      showToast("Email domain saved — add the DNS records below, then verify.");
      router.refresh();
    } finally {
      setIsSavingEmailDomain(false);
    }
  };

  const handleVerifyEmailDomain = async () => {
    setIsVerifyingEmailDomain(true);
    try {
      const response = await fetch(`/api/tenant/${organization.slug}/settings/verify-email-domain`, {
        method: "POST",
      });
      const result = await response.json() as EmailVerifyResult;
      setEmailVerifyResult(result);
      if (result.allVerified) {
        setEmailDomainPhase("verified");
        showToast("Email domain verified — outgoing emails will now use this domain.");
        router.refresh();
      } else {
        showToast(result.message || "DNS records not yet propagated.", "error");
      }
    } finally {
      setIsVerifyingEmailDomain(false);
    }
  };

  const handleClearEmailDomain = async () => {
    setIsSavingEmailDomain(true);
    try {
      const response = await fetch(`/api/tenant/${organization.slug}/settings`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emailDomain: null }),
      });
      if (!response.ok) { showToast("Failed to remove email domain.", "error"); return; }
      setEmailDomainInput("");
      setEmailSenderNameInput("");
      setEmailDomainPhase("idle");
      setEmailVerifyResult(null);
      showToast("Email domain removed.");
      router.refresh();
    } finally {
      setIsSavingEmailDomain(false);
    }
  };

  // ── Theme ──────────────────────────────────────────────────────────────────
  const [themeDraft, setThemeDraft] = useState<TenantTheme>(
    initialSettings?.theme ?? { ...DEFAULT_THEME },
  );
  const [selectedPreset, setSelectedPreset] = useState<string>(() =>
    detectPresetId(initialSettings?.theme ?? DEFAULT_THEME),
  );
  const [isSavingTheme, setIsSavingTheme] = useState(false);
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);

  const applyThemeToPortal = (theme: TenantTheme) => {
    const root = document.querySelector<HTMLElement>("[data-tenant-theme]");
    if (!root) return;
    const vars = toTenantCssVariables(theme);
    Object.entries(vars).forEach(([k, v]) => root.style.setProperty(k, v));
  };

  const handleThemeColorChange = (key: keyof TenantTheme, rawValue: string) => {
    const normalized = normalizeHexColor(rawValue);
    if (!normalized) return;
    setSelectedPreset("custom");
    setThemeDraft((cur) => ({ ...cur, [key]: normalized }));
  };

  const handleSaveTheme = async () => {
    setIsSavingTheme(true);
    try {
      const response = await fetch(`/api/tenant/${organization.slug}/settings`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ theme: themeDraft }),
      });
      const payload = await response
        .json()
        .catch(() => ({ message: "Failed to save." }));
      if (!response.ok) {
        showToast(payload.message || "Failed to save theme.", "error");
        return;
      }
      showToast("Theme saved — portal colors updated.");
      applyThemeToPortal(themeDraft);
      router.refresh();
    } finally {
      setIsSavingTheme(false);
    }
  };

  // ── Members ────────────────────────────────────────────────────────────────
  const [members, setMembers] = useState(initialMembers);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<OrganizationRole>("admin");
  const [isInviting, setIsInviting] = useState(false);
  const [pendingInvite, setPendingInvite] = useState<{
    email: string;
    role: OrganizationRole;
  } | null>(null);
  const [pendingRemoveEmail, setPendingRemoveEmail] = useState<string | null>(null);
  const [pendingTransferEmail, setPendingTransferEmail] = useState<string | null>(null);

  const normalizedSessionEmail = sessionEmail.trim().toLowerCase();
  const currentUserMembership = members.find((member) => member.email === normalizedSessionEmail);
  const isCurrentUserRootOwner = Boolean(currentUserMembership?.isRootOwner);

  const submitInvite = async (email: string, role: OrganizationRole) => {
    setIsInviting(true);
    try {
      const response = await fetch(`/api/tenant/${organization.slug}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, role }),
      });
      const payload = await response
        .json()
        .catch(() => ({ message: "Failed to update member." }));
      if (!response.ok) {
        showToast(payload.message || "Failed to update member.", "error");
        return;
      }

      const existing = members.find((m) => m.email === payload.item.email);
      if (existing) {
        setMembers((prev) =>
          prev.map((m) => (m.email === payload.item.email ? payload.item : m)),
        );
      } else {
        setMembers((prev) => [...prev, payload.item]);
      }

      showToast(payload.message || (existing ? "Member role updated." : "Member invited successfully."));

      if (payload.warning) {
        showToast(payload.warning, "warning");
      }

      setInviteEmail("");
      setPendingInvite(null);
    } finally {
      setIsInviting(false);
    }
  };

  const handleInvite = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const email = inviteEmail.trim().toLowerCase();

    if (!email) {
      showToast("Email is required.", "error");
      return;
    }

    setPendingInvite({ email, role: inviteRole });
  };

  const handleRemove = async (email: string) => {
    const response = await fetch(
      `/api/tenant/${organization.slug}/members/${encodeURIComponent(email)}`,
      { method: "DELETE" },
    );
    const payload = await response
      .json()
      .catch(() => ({ message: "Failed to remove member." }));
    if (!response.ok) {
      showToast(payload.message || "Failed to remove member.", "error");
      return;
    }
    setMembers((prev) => prev.filter((m) => m.email !== email));
    showToast(payload.message || "Member removed.");
    if (payload.warning) {
      showToast(payload.warning, "warning");
    }
    setPendingRemoveEmail(null);
  };

  const handleTransferRootOwnership = async (email: string) => {
    const response = await fetch(`/api/tenant/${organization.slug}/members/transfer-root`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ newRootOwnerEmail: email }),
    });

    const payload = await response
      .json()
      .catch(() => ({ message: "Failed to transfer root ownership." }));

    if (!response.ok) {
      showToast(payload.message || "Failed to transfer root ownership.", "error");
      return;
    }

    setMembers((prev) =>
      prev.map((member) => ({
        ...member,
        isRootOwner: member.email === email,
      })),
    );

    showToast(payload.message || "Root ownership transferred.");
    if (payload.warning) {
      showToast(payload.warning, "warning");
    }
    setPendingTransferEmail(null);
  };

  // ── Tab config ─────────────────────────────────────────────────────────────
  const TABS: Array<{
    id: Tab;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
  }> = [
    { id: "details", label: "Details", icon: Building2 },
    { id: "theme", label: "Theme", icon: Palette },
    { id: "members", label: "Administrators", icon: Users },
  ];

  return (
    <PortalShell
      portal="tenant"
      organizationSlug={organization.slug}
      sessionEmail={sessionEmail}
      eyebrow="Settings"
      title="Organization settings"
      subtitle="Configure your portal, branding, and team."
    >
      <ConfirmDialog
        isOpen={!!pendingInvite}
        title={members.some((member) => member.email === pendingInvite?.email)
          ? "Update member role?"
          : "Invite member?"}
        message={pendingInvite
          ? `${pendingInvite.email} will ${members.some((member) => member.email === pendingInvite.email) ? "be updated to" : "be invited as"} ${pendingInvite.role}.`
          : ""}
        confirmLabel={members.some((member) => member.email === pendingInvite?.email) ? "Update role" : "Send invite"}
        onConfirm={() => {
          if (pendingInvite) {
            return submitInvite(pendingInvite.email, pendingInvite.role);
          }
        }}
        onCancel={() => setPendingInvite(null)}
      />

      <ConfirmDialog
        isOpen={!!pendingRemoveEmail}
        title="Remove member?"
        message={`${pendingRemoveEmail} will lose access to this organization portal.`}
        confirmLabel="Remove"
        onConfirm={() => {
          if (pendingRemoveEmail) {
            return handleRemove(pendingRemoveEmail);
          }
        }}
        onCancel={() => setPendingRemoveEmail(null)}
      />

      <ConfirmDialog
        isOpen={!!pendingTransferEmail}
        title="Transfer root ownership?"
        message={pendingTransferEmail
          ? `Root ownership will be transferred to ${pendingTransferEmail}. This user will become the non-removable root owner.`
          : ""}
        confirmLabel="Transfer"
        onConfirm={() => {
          if (pendingTransferEmail) {
            return handleTransferRootOwnership(pendingTransferEmail);
          }
        }}
        onCancel={() => setPendingTransferEmail(null)}
      />

      <ConfirmDialog
        isOpen={isResetConfirmOpen}
        title="Reset theme?"
        message={`Reset all colors back to the ${PRESET_THEMES.find((p) => p.id === selectedPreset)?.name ?? "Forest"} preset defaults? Any unsaved changes will be discarded.`}
        confirmLabel="Reset"
        onConfirm={() => {
          const preset = PRESET_THEMES.find((p) => p.id === selectedPreset);
          setThemeDraft({ ...(preset?.colors ?? DEFAULT_THEME) });
          setIsResetConfirmOpen(false);
        }}
        onCancel={() => setIsResetConfirmOpen(false)}
      />

      {/* ── Tab bar ──────────────────────────────────────────────────────── */}
      <div className="mb-5 flex gap-1 rounded-[20px] border border-[var(--color-border-strong)] bg-[var(--color-panel)] p-1.5 shadow-[var(--shadow-soft)]">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`inline-flex flex-1 items-center justify-center gap-2 rounded-[16px] px-4 py-2.5 text-sm font-medium transition ${
              tab === id
                ? "bg-[var(--color-sidebar-accent)] text-[var(--color-sidebar-accent-ink)] shadow-sm"
                : "text-[var(--color-muted)] hover:bg-[var(--color-panel-strong)] hover:text-[var(--color-ink)]"
            }`}
          >
            <Icon className="h-4 w-4 shrink-0" />
            {label}
          </button>
        ))}
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          DETAILS TAB
      ══════════════════════════════════════════════════════════════════════ */}
      {tab === "details" && (
        <div className="space-y-5">
          <section className="rounded-[28px] border border-[var(--color-border-strong)] bg-[var(--color-panel)] p-6 shadow-[var(--shadow-soft)]">
            <h2 className="mb-4 text-base font-semibold text-[var(--color-ink)]">
              Organization details
            </h2>
            {isOwner ? (
              <form onSubmit={handleSaveOrganizationProfile} className="grid gap-4 sm:grid-cols-2">
                <label className="sm:col-span-2 text-sm font-medium text-[var(--color-ink)]">
                  Organization name
                  <input
                    type="text"
                    value={organizationDraft.name}
                    onChange={(event) => {
                      const value = event.target.value;
                      setOrganizationDraft((current) => ({ ...current, name: value }));
                    }}
                    placeholder="Acme Technologies"
                    className="mt-2 h-10 w-full rounded-xl border border-[var(--color-border)] bg-white px-3 text-sm text-[var(--color-ink)] outline-none focus:border-[var(--color-brand-strong)] focus:ring-4 focus:ring-[var(--color-focus-ring)]"
                  />
                </label>

                <div className="text-sm font-medium text-[var(--color-ink)]">
                  <p>Logo source</p>
                  <div className="mt-2 flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setLogoInputMode("file");
                        // Clear any URL-mode draft value so stale text doesn't
                        // get sent on the next form save.
                        setOrganizationDraft((current) => ({ ...current, logoUrl: organization.logoUrl ?? "" }));
                      }}
                      className={`inline-flex h-9 items-center rounded-xl border px-3 text-xs font-medium transition ${
                        logoInputMode === "file"
                          ? "border-[var(--color-border-strong)] bg-[var(--color-panel-strong)] text-[var(--color-ink)]"
                          : "border-[var(--color-border)] text-[var(--color-muted)] hover:bg-[var(--color-panel-strong)]"
                      }`}
                    >
                      Upload file
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setLogoInputMode("url");
                        // When switching to URL mode restore the saved URL so
                        // the user can see and edit the current value.
                        setOrganizationDraft((current) => ({ ...current, logoUrl: organization.logoUrl ?? "" }));
                      }}
                      className={`inline-flex h-9 items-center rounded-xl border px-3 text-xs font-medium transition ${
                        logoInputMode === "url"
                          ? "border-[var(--color-border-strong)] bg-[var(--color-panel-strong)] text-[var(--color-ink)]"
                          : "border-[var(--color-border)] text-[var(--color-muted)] hover:bg-[var(--color-panel-strong)]"
                      }`}
                    >
                      Use URL
                    </button>
                  </div>
                  <p className="mt-1 text-xs text-[var(--color-muted)]">
                    Choose one mode: either upload a file or enter a URL.
                  </p>
                </div>

                {logoInputMode === "url" ? (
                  <label key="logo-input-url" className="text-sm font-medium text-[var(--color-ink)]">
                    Logo URL
                    <input
                      key="logo-url-field"
                      type="url"
                      value={organizationDraft.logoUrl}
                      onChange={(event) => {
                        const value = event.target.value;
                        setOrganizationDraft((current) => ({ ...current, logoUrl: value }));
                      }}
                      placeholder="https://cdn.example.com/logo.png"
                      className="mt-2 h-10 w-full rounded-xl border border-[var(--color-border)] bg-white px-3 text-sm text-[var(--color-ink)] outline-none focus:border-[var(--color-brand-strong)] focus:ring-4 focus:ring-[var(--color-focus-ring)]"
                    />
                    <p className="mt-1 text-xs text-[var(--color-muted)]">
                      URL logo is validated before save: JPG/PNG/WEBP/GIF, max 5MB,
                      min 48x48px, max 1200x1200px.
                    </p>
                  </label>
                ) : (
                  <label key="logo-input-file" className="text-sm font-medium text-[var(--color-ink)]">
                    Upload logo file
                    <input
                      key="logo-file-field"
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/gif"
                      onChange={(event) => void handleLogoFileUpload(event)}
                      disabled={isUploadingLogo}
                      className="mt-2 block w-full cursor-pointer rounded-xl border border-[var(--color-border)] bg-white px-3 py-2 text-sm text-[var(--color-ink)] file:mr-3 file:cursor-pointer file:rounded-lg file:border-0 file:bg-[var(--color-panel-strong)] file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-[var(--color-ink)] disabled:opacity-70"
                    />
                    <p className="mt-1 text-xs text-[var(--color-muted)]">
                      {isUploadingLogo
                        ? "Uploading logo..."
                        : "Upload instantly saves the logo to storage and applies it to your portal."}
                    </p>
                    {lastUploadedLogoDimensions && (
                      <p className="mt-1 text-xs text-emerald-700">
                        Last uploaded logo: {lastUploadedLogoDimensions.width}x{lastUploadedLogoDimensions.height}px
                      </p>
                    )}
                  </label>
                )}

                {(logoInputMode === "file" ? organization.logoUrl : organizationDraft.logoUrl)?.trim() && (
                  <div className="sm:col-span-2 rounded-2xl border border-[var(--color-border)] bg-[var(--color-panel-strong)] px-4 py-3">
                    <p className="text-xs font-medium text-[var(--color-muted)]">Logo preview</p>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={(logoInputMode === "file" ? organization.logoUrl : organizationDraft.logoUrl) ?? ""}
                      alt="Organization logo preview"
                      className="mt-2 max-h-16 w-auto rounded"
                    />
                  </div>
                )}

                <label className="text-sm font-medium text-[var(--color-ink)]">
                  Website URL
                  <input
                    type="url"
                    value={organizationDraft.websiteUrl}
                    onChange={(event) => {
                      const value = event.target.value;
                      setOrganizationDraft((current) => ({ ...current, websiteUrl: value }));
                    }}
                    placeholder="https://www.example.com"
                    className="mt-2 h-10 w-full rounded-xl border border-[var(--color-border)] bg-white px-3 text-sm text-[var(--color-ink)] outline-none focus:border-[var(--color-brand-strong)] focus:ring-4 focus:ring-[var(--color-focus-ring)]"
                  />
                </label>

                <label className="text-sm font-medium text-[var(--color-ink)]">
                  Contact email
                  <input
                    type="email"
                    value={organizationDraft.contactEmail}
                    onChange={(event) => {
                      const value = event.target.value;
                      setOrganizationDraft((current) => ({ ...current, contactEmail: value }));
                    }}
                    placeholder="hiring@example.com"
                    className="mt-2 h-10 w-full rounded-xl border border-[var(--color-border)] bg-white px-3 text-sm text-[var(--color-ink)] outline-none focus:border-[var(--color-brand-strong)] focus:ring-4 focus:ring-[var(--color-focus-ring)]"
                  />
                </label>

                <label className="text-sm font-medium text-[var(--color-ink)]">
                  Contact phone
                  <input
                    type="text"
                    value={organizationDraft.contactPhone}
                    onChange={(event) => {
                      const value = event.target.value;
                      setOrganizationDraft((current) => ({ ...current, contactPhone: value }));
                    }}
                    placeholder="+1 555 123 4567"
                    className="mt-2 h-10 w-full rounded-xl border border-[var(--color-border)] bg-white px-3 text-sm text-[var(--color-ink)] outline-none focus:border-[var(--color-brand-strong)] focus:ring-4 focus:ring-[var(--color-focus-ring)]"
                  />
                </label>

                <label className="sm:col-span-2 text-sm font-medium text-[var(--color-ink)]">
                  Location
                  <input
                    type="text"
                    value={organizationDraft.location}
                    onChange={(event) => {
                      const value = event.target.value;
                      setOrganizationDraft((current) => ({ ...current, location: value }));
                    }}
                    placeholder="New York, USA"
                    className="mt-2 h-10 w-full rounded-xl border border-[var(--color-border)] bg-white px-3 text-sm text-[var(--color-ink)] outline-none focus:border-[var(--color-brand-strong)] focus:ring-4 focus:ring-[var(--color-focus-ring)]"
                  />
                </label>

                <label className="sm:col-span-2 text-sm font-medium text-[var(--color-ink)]">
                  About organization
                  <textarea
                    value={organizationDraft.description}
                    onChange={(event) => {
                      const value = event.target.value;
                      setOrganizationDraft((current) => ({ ...current, description: value }));
                    }}
                    placeholder="Tell candidates about your company and hiring culture."
                    rows={4}
                    className="mt-2 w-full rounded-xl border border-[var(--color-border)] bg-white px-3 py-2 text-sm text-[var(--color-ink)] outline-none focus:border-[var(--color-brand-strong)] focus:ring-4 focus:ring-[var(--color-focus-ring)]"
                  />
                </label>

                <div className="sm:col-span-2 flex items-center justify-between gap-3">
                  <p className="text-xs text-[var(--color-muted)]">
                    Created {new Date(organization.createdAt).toLocaleDateString()} · Status {organization.status}
                  </p>
                  <button
                    type="submit"
                    disabled={isSavingOrganization}
                    className="theme-btn-primary inline-flex h-10 items-center rounded-xl px-5 text-sm font-medium disabled:opacity-70"
                  >
                    {isSavingOrganization ? "Saving..." : "Save organization details"}
                  </button>
                </div>
              </form>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-panel-strong)] px-4 py-3">
                  <p className="text-xs font-medium text-[var(--color-muted)]">Name</p>
                  <p className="mt-0.5 text-sm font-semibold text-[var(--color-ink)]">{organization.name}</p>
                </div>
                <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-panel-strong)] px-4 py-3">
                  <p className="text-xs font-medium text-[var(--color-muted)]">Status</p>
                  <p className="mt-0.5 text-sm font-semibold capitalize text-[var(--color-ink)]">{organization.status}</p>
                </div>
                <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-panel-strong)] px-4 py-3">
                  <p className="text-xs font-medium text-[var(--color-muted)]">Created</p>
                  <p className="mt-0.5 text-sm text-[var(--color-ink)]">{new Date(organization.createdAt).toLocaleDateString()}</p>
                </div>
                {organization.websiteUrl && (
                  <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-panel-strong)] px-4 py-3">
                    <p className="text-xs font-medium text-[var(--color-muted)]">Website</p>
                    <a
                      href={organization.websiteUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-0.5 inline-block text-sm text-[var(--color-link)] underline underline-offset-2"
                    >
                      {organization.websiteUrl}
                    </a>
                  </div>
                )}
                {organization.contactEmail && (
                  <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-panel-strong)] px-4 py-3">
                    <p className="text-xs font-medium text-[var(--color-muted)]">Contact email</p>
                    <p className="mt-0.5 text-sm text-[var(--color-ink)]">{organization.contactEmail}</p>
                  </div>
                )}
                {organization.contactPhone && (
                  <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-panel-strong)] px-4 py-3">
                    <p className="text-xs font-medium text-[var(--color-muted)]">Contact phone</p>
                    <p className="mt-0.5 text-sm text-[var(--color-ink)]">{organization.contactPhone}</p>
                  </div>
                )}
                {organization.location && (
                  <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-panel-strong)] px-4 py-3">
                    <p className="text-xs font-medium text-[var(--color-muted)]">Location</p>
                    <p className="mt-0.5 text-sm text-[var(--color-ink)]">{organization.location}</p>
                  </div>
                )}
                {organization.description && (
                  <div className="sm:col-span-2 rounded-2xl border border-[var(--color-border)] bg-[var(--color-panel-strong)] px-4 py-3">
                    <p className="text-xs font-medium text-[var(--color-muted)]">About organization</p>
                    <p className="mt-1 text-sm text-[var(--color-ink)]">{organization.description}</p>
                  </div>
                )}
              </div>
            )}
          </section>

          {/* ── Portal identity ───────────────────────────────────────────── */}
          <section className="rounded-[28px] border border-[var(--color-border-strong)] bg-[var(--color-panel)] p-6 shadow-[var(--shadow-soft)]">
            <h2 className="mb-4 text-base font-semibold text-[var(--color-ink)]">Portal identity</h2>
            <div className="grid gap-4 sm:grid-cols-2">

              {/* Slug */}
              <div>
                <p className="mb-1.5 text-sm font-medium text-[var(--color-ink)]">Organization slug</p>
                {isOwner && domainPhase !== "verified" ? (
                  <>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={organizationDraft.slug}
                        onChange={(event) => {
                          const normalized = normalizeSlugInput(event.target.value);
                          setOrganizationDraft((current) => ({ ...current, slug: normalized }));
                          setSlugCheckState({ status: "idle", slug: normalized, message: "" });
                        }}
                        onBlur={() => {
                          if (normalizedDraftSlug && normalizedDraftSlug !== organization.slug) {
                            void checkSlugAvailability();
                          }
                        }}
                        placeholder="acme-tech"
                        className="h-10 flex-1 rounded-xl border border-[var(--color-border)] bg-white px-3 font-mono text-sm text-[var(--color-ink)] outline-none focus:border-[var(--color-brand-strong)] focus:ring-4 focus:ring-[var(--color-focus-ring)]"
                      />
                      <button
                        type="button"
                        onClick={() => void checkSlugAvailability()}
                        disabled={slugCheckState.status === "checking" || !normalizedDraftSlug}
                        className="inline-flex h-10 items-center rounded-xl border border-[var(--color-border)] px-3 text-xs font-medium text-[var(--color-muted)] transition hover:bg-[var(--color-panel-strong)] disabled:opacity-60"
                      >
                        {slugCheckState.status === "checking" ? "Checking..." : "Check"}
                      </button>
                    </div>
                    <p className="mt-1 text-xs text-[var(--color-muted)]">Lowercase letters, numbers, and hyphens only.</p>
                    {slugCheckState.slug === normalizedDraftSlug && slugCheckState.message && (
                      <p
                        className={`mt-1 text-xs ${
                          slugCheckState.status === "available"
                            ? "text-emerald-700"
                            : slugCheckState.status === "checking"
                              ? "text-[var(--color-muted)]"
                              : "text-red-600"
                        }`}
                      >
                        {slugCheckState.message}
                      </p>
                    )}
                  </>
                ) : isOwner ? (
                  <div className="flex items-center gap-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-panel-strong)] px-3 py-2.5">
                    <Lock className="h-3.5 w-3.5 shrink-0 text-[var(--color-muted)]" />
                    <code className="flex-1 font-mono text-sm text-[var(--color-ink)]">{organization.slug}</code>
                  </div>
                ) : (
                  <code className="block rounded-xl border border-[var(--color-border)] bg-[var(--color-panel-strong)] px-3 py-2.5 font-mono text-sm text-[var(--color-ink)]">{organization.slug}</code>
                )}
                {isOwner && domainPhase === "verified" && (
                  <p className="mt-1.5 text-xs text-[var(--color-muted)]">
                    Slug is locked while a custom domain is active. Remove the custom domain to change the slug.
                  </p>
                )}
              </div>

              {/* Portal URL */}
              <div
                className={`rounded-2xl border px-4 py-3 ${
                  domainPhase === "verified"
                    ? "border-green-200 bg-green-50"
                    : "border-[var(--color-border)] bg-[var(--color-panel-strong)]"
                }`}
              >
                <p className="text-xs font-medium text-[var(--color-muted)]">
                  {domainPhase === "verified" ? "Active URL" : "Portal URL"}
                </p>
                {domainPhase === "verified" ? (
                  <>
                    <a
                      href={`https://${savedDomain}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-0.5 block font-mono text-sm font-medium text-[var(--color-link)] underline underline-offset-2"
                    >
                      {savedDomain}
                    </a>
                    <p className="mt-1 flex items-center gap-1 text-xs text-green-700">
                      <CheckCircle2 className="h-3 w-3" /> Custom domain active
                    </p>
                  </>
                ) : (
                  <p className="mt-0.5 font-mono text-sm text-[var(--color-ink)]">
                    {isOwner ? portalHostnamePreview : `${organization.slug}.${platformHost}`}
                  </p>
                )}
              </div>

              {/* Save slug — shown only when draft differs from saved slug and no domain lock */}
              {isOwner && domainPhase !== "verified" && normalizedDraftSlug && normalizedDraftSlug !== organization.slug && (
                <div className="sm:col-span-2 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
                  <p className="text-xs text-amber-800">
                    Changing the slug updates your portal URL. Your session will continue — no re-login needed.
                  </p>
                  <button
                    type="button"
                    onClick={() => void handleSaveSlug()}
                    disabled={isSavingOrganization}
                    className="theme-btn-primary inline-flex h-9 items-center rounded-xl px-4 text-sm font-medium disabled:opacity-70"
                  >
                    {isSavingOrganization ? "Saving..." : "Save new slug"}
                  </button>
                </div>
              )}
            </div>
          </section>

          <section className="rounded-[28px] border border-[var(--color-border-strong)] bg-[var(--color-panel)] p-6 shadow-[var(--shadow-soft)]">
            <div className="mb-1 flex items-center gap-2">
              <Globe className="h-4 w-4 text-[var(--color-brand-strong)]" />
              <h2 className="text-base font-semibold text-[var(--color-ink)]">
                Custom domain
              </h2>
            </div>

            {/* ── Phase: IDLE — enter domain ─────────────────────────────── */}
            {isOwner && domainPhase === "idle" && (
              <>
                <p className="mb-4 text-sm text-[var(--color-muted)]">
                  Connect your own domain (e.g.{" "}
                  <code className="rounded bg-[var(--color-panel-strong)] px-1 py-0.5 font-mono text-xs">
                    careers.example.com
                  </code>
                  ). After saving we&apos;ll show you the exact DNS record to add.
                </p>
                <div className="flex flex-wrap gap-3">
                  <input
                    type="text"
                    value={domainInput}
                    onChange={(e) => setDomainInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") void handleSaveDomain(); }}
                    placeholder="careers.example.com"
                    className="h-10 flex-1 rounded-xl border border-[var(--color-border)] bg-white px-3 font-mono text-sm text-[var(--color-ink)] outline-none focus:border-[var(--color-brand-strong)] focus:ring-4 focus:ring-[var(--color-focus-ring)]"
                  />
                  <button
                    type="button"
                    onClick={() => void handleSaveDomain()}
                    disabled={isSavingDomain || !domainInput.trim()}
                    className="theme-btn-primary inline-flex h-10 items-center gap-2 rounded-xl px-5 text-sm font-medium disabled:opacity-70"
                  >
                    {isSavingDomain ? "Saving…" : "Save & Get DNS Instructions"}
                  </button>
                </div>
              </>
            )}

            {/* ── Phase: PENDING — DNS instructions + verify ─────────────── */}
            {isOwner && domainPhase === "pending" && (
              <>
                {/* Domain chip + change */}
                <div className="mb-5 flex flex-wrap items-center gap-3">
                  <div className="flex items-center gap-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-panel-strong)] px-3 py-1.5">
                    <Clock className="h-3.5 w-3.5 text-amber-500" />
                    <code className="font-mono text-sm text-[var(--color-ink)]">
                      {savedDomain}
                    </code>
                    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
                      Pending
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => { setDomainPhase("idle"); setDomainInput(savedDomain); setVerifyResult(null); }}
                    className="text-xs text-[var(--color-muted)] underline underline-offset-2 hover:text-[var(--color-ink)]"
                  >
                    Change domain
                  </button>
                </div>

                {/* DNS record card */}
                <div className="mb-5 rounded-2xl border border-[var(--color-border)] bg-[var(--color-panel-strong)] p-4">
                  <p className="mb-1 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-muted)]">
                    Step 1 — Add this DNS record at your registrar
                  </p>
                  <p className="mb-4 text-xs text-[var(--color-muted)]">
                    Log in to your DNS provider (Cloudflare, Namecheap, GoDaddy,
                    Route 53, etc.) and create the following record:
                  </p>

                  {(platformHost === "localhost" || /^\d+\.\d+\.\d+\.\d+$/.test(platformHost)) ? (
                    <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800">
                      <strong>Local development:</strong> DNS configuration is only needed in production.
                      Set <code className="font-mono">APP_BASE_URL</code> to your production hostname
                      (e.g. <code className="font-mono">https://recruitment.yourcompany.com</code>) and
                      the correct CNAME target will appear here.
                    </div>
                  ) : (
                    <div className="overflow-hidden rounded-xl border border-[var(--color-border)] bg-white text-sm">
                      {/* header row */}
                      <div className="grid grid-cols-[80px_1fr_1fr_60px] gap-3 border-b border-[var(--color-border)] bg-[var(--color-panel-strong)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--color-muted)]">
                        <span>Type</span>
                        <span>Name / Host</span>
                        <span>Value / Points to</span>
                        <span>TTL</span>
                      </div>
                      {/* data row */}
                      <div className="grid grid-cols-[80px_1fr_1fr_60px] items-center gap-3 px-4 py-3">
                        <span className="inline-flex w-fit items-center rounded-md bg-blue-100 px-2 py-0.5 font-mono text-xs font-semibold text-blue-800">
                          CNAME
                        </span>
                        <div className="flex items-center gap-2">
                          <code className="font-mono text-xs text-[var(--color-ink)]">
                            {domainSubdomain}
                          </code>
                          <button
                            type="button"
                            onClick={() => copyToClipboard(domainSubdomain, "Name")}
                            className="text-[var(--color-muted)] hover:text-[var(--color-ink)]"
                            title="Copy"
                          >
                            <Copy className="h-3 w-3" />
                          </button>
                        </div>
                        <div className="flex items-center gap-2">
                          <code className="truncate font-mono text-xs text-[var(--color-ink)]">
                            {platformHost}
                          </code>
                          <button
                            type="button"
                            onClick={() => copyToClipboard(platformHost, "Value")}
                            className="shrink-0 text-[var(--color-muted)] hover:text-[var(--color-ink)]"
                            title="Copy"
                          >
                            <Copy className="h-3 w-3" />
                          </button>
                        </div>
                        <code className="font-mono text-xs text-[var(--color-ink)]">3600</code>
                      </div>
                    </div>
                  )}

                  <p className="mt-3 text-xs text-[var(--color-muted)]">
                    <strong>Using an apex domain?</strong> (e.g.{" "}
                    <code className="font-mono">example.com</code> without a
                    subdomain) Some providers call this record type{" "}
                    <strong>ALIAS</strong> or <strong>ANAME</strong>. If your
                    provider doesn&apos;t support CNAME at the root, use a subdomain
                    like{" "}
                    <code className="font-mono">careers.example.com</code>{" "}
                    instead.
                  </p>
                </div>

                {/* Step 2 — verify */}
                <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-muted)]">
                  Step 2 — Verify your DNS record
                </p>
                <p className="mb-4 text-xs text-[var(--color-muted)]">
                  After adding the record, click below. DNS changes usually
                  propagate within minutes but can take up to 48 hours.
                </p>

                {/* Verify result feedback */}
                {verifyResult && !verifyResult.verified && (
                  <div className="mb-4 flex gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3">
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
                    <div>
                      <p className="text-sm font-medium text-red-700">
                        {verifyResult.message}
                      </p>
                      {verifyResult.details && (
                        <p className="mt-1 text-xs text-red-500">
                          {verifyResult.details}
                        </p>
                      )}
                    </div>
                  </div>
                )}

                <div className="flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => void handleVerifyDomain()}
                    disabled={isVerifyingDomain}
                    className="theme-btn-primary inline-flex h-10 items-center gap-2 rounded-xl px-5 text-sm font-medium disabled:opacity-70"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    {isVerifyingDomain ? "Checking DNS…" : "Verify & Activate Domain"}
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleClearDomain()}
                    disabled={isSavingDomain}
                    className="inline-flex h-10 items-center rounded-xl border border-[var(--color-border)] px-4 text-sm text-[var(--color-muted)] transition hover:bg-[var(--color-panel-strong)] disabled:opacity-70"
                  >
                    Remove domain
                  </button>
                </div>
              </>
            )}

            {/* ── Phase: VERIFIED — active domain ───────────────────────── */}
            {isOwner && domainPhase === "verified" && (
              <>
                <div className="mb-4 flex flex-wrap items-center gap-3">
                  <div className="flex items-center gap-2 rounded-xl border border-green-200 bg-green-50 px-3 py-1.5">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    <code className="font-mono text-sm font-medium text-green-800">
                      {savedDomain}
                    </code>
                    <span className="rounded-full bg-green-200 px-2 py-0.5 text-xs font-semibold text-green-800">
                      Verified & Active
                    </span>
                  </div>
                </div>
                <p className="mb-1 text-sm text-[var(--color-muted)]">
                  Your portal is now accessible at{" "}
                  <a
                    href={`https://${savedDomain}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-mono text-[var(--color-link)] underline underline-offset-2 hover:text-[var(--color-link-hover)]"
                  >
                    https://{savedDomain}
                  </a>
                  .
                </p>
                {initialSettings?.domainVerifiedAt && (
                  <p className="mb-4 text-xs text-[var(--color-muted)]">
                    Verified on{" "}
                    {new Date(initialSettings.domainVerifiedAt).toLocaleString()}
                  </p>
                )}
                <div className="flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => { setDomainPhase("pending"); setVerifyResult(null); }}
                    className="inline-flex h-9 items-center rounded-xl border border-[var(--color-border)] px-4 text-sm text-[var(--color-muted)] transition hover:bg-[var(--color-panel-strong)]"
                  >
                    View DNS instructions
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleClearDomain()}
                    disabled={isSavingDomain}
                    className="inline-flex h-9 items-center rounded-xl border border-red-200 px-4 text-sm text-red-600 transition hover:bg-red-50 disabled:opacity-70"
                  >
                    Remove domain
                  </button>
                </div>
              </>
            )}

            {/* ── Non-owner read-only view ───────────────────────────────── */}
            {!isOwner && (
              domainPhase === "verified" ? (
                <div className="mt-3 flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <code className="font-mono text-sm text-[var(--color-ink)]">{savedDomain}</code>
                  <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                    Active
                  </span>
                </div>
              ) : domainPhase === "pending" ? (
                <div className="mt-3 flex items-center gap-2">
                  <Clock className="h-4 w-4 text-amber-500" />
                  <code className="font-mono text-sm text-[var(--color-ink)]">{savedDomain}</code>
                  <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
                    Pending verification
                  </span>
                </div>
              ) : (
                <p className="mt-3 text-sm text-[var(--color-muted)]">
                  No custom domain configured. Contact an owner to set one up.
                </p>
              )
            )}
          </section>

          {/* ── Email domain ────────────────────────────────────────────── */}
          <section className="rounded-[28px] border border-[var(--color-border-strong)] bg-[var(--color-panel)] p-6 shadow-[var(--shadow-soft)]">
            <div className="mb-1 flex items-center gap-2">
              <Mail className="h-4 w-4 text-[var(--color-brand-strong)]" />
              <h2 className="text-base font-semibold text-[var(--color-ink)]">
                Email domain
              </h2>
            </div>
            <p className="mb-5 text-sm text-[var(--color-muted)]">
              Send notification emails from your own domain (e.g.{" "}
              <code className="rounded bg-[var(--color-panel-strong)] px-1 py-0.5 font-mono text-xs">
                noreply@your-company.com
              </code>
              ) instead of the platform default. Add the required DNS records,
              then verify to activate.
            </p>

            {/* ── Phase: IDLE — no domain saved ─────────────────────────── */}
            {isOwner && emailDomainPhase === "idle" && (
              <div className="space-y-3">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-[var(--color-ink)]">
                      Email domain
                    </label>
                    <input
                      type="text"
                      placeholder="mail.your-company.com"
                      value={emailDomainInput}
                      onChange={(e) => setEmailDomainInput(e.target.value)}
                      className="h-10 w-full rounded-xl border border-[var(--color-border)] bg-white px-3 font-mono text-sm outline-none focus:border-[var(--color-brand-strong)] focus:ring-4 focus:ring-[var(--color-focus-ring)]"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-[var(--color-ink)]">
                      Sender display name <span className="font-normal text-[var(--color-muted)]">(optional)</span>
                    </label>
                    <input
                      type="text"
                      placeholder="Acme Careers"
                      value={emailSenderNameInput}
                      onChange={(e) => setEmailSenderNameInput(e.target.value)}
                      className="h-10 w-full rounded-xl border border-[var(--color-border)] bg-white px-3 text-sm outline-none focus:border-[var(--color-brand-strong)] focus:ring-4 focus:ring-[var(--color-focus-ring)]"
                    />
                  </div>
                </div>
                <button
                  type="button"
                  disabled={isSavingEmailDomain || !emailDomainInput.trim()}
                  onClick={() => void handleSaveEmailDomain()}
                  className="theme-btn-primary inline-flex h-10 items-center gap-2 rounded-xl px-5 text-sm font-medium disabled:opacity-70"
                >
                  {isSavingEmailDomain ? "Saving…" : "Save & show DNS records"}
                </button>
              </div>
            )}

            {/* ── Phase: PENDING — DNS records to configure ─────────────── */}
            {isOwner && emailDomainPhase === "pending" && (
              <>
                <div className="mb-4 flex flex-wrap items-center gap-3">
                  <div className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-1.5">
                    <Clock className="h-4 w-4 text-amber-600" />
                    <code className="font-mono text-sm font-medium text-amber-800">
                      {emailDomainInput}
                    </code>
                    <span className="rounded-full bg-amber-200 px-2 py-0.5 text-xs font-semibold text-amber-800">
                      Pending verification
                    </span>
                  </div>
                </div>

                <p className="mb-3 text-sm font-medium text-[var(--color-ink)]">
                  Add these records to your DNS provider for{" "}
                  <code className="font-mono text-xs">{emailDomainInput}</code>:
                </p>

                {/* DNS records table */}
                <div className="mb-4 overflow-x-auto rounded-2xl border border-[var(--color-border)]">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-[var(--color-border)] bg-[var(--color-panel-strong)]">
                        <th className="px-3 py-2.5 text-left font-semibold text-[var(--color-ink)]">Type</th>
                        <th className="px-3 py-2.5 text-left font-semibold text-[var(--color-ink)]">Name / Host</th>
                        <th className="px-3 py-2.5 text-left font-semibold text-[var(--color-ink)]">Value</th>
                        <th className="px-3 py-2.5 text-left font-semibold text-[var(--color-ink)]">Purpose</th>
                        <th className="w-8 px-3 py-2.5" />
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--color-border)]">
                      {(getEmailDomainDnsRecords(emailDomainInput) as EmailDomainDnsRecord[]).map((rec, i) => {
                        const label = i === 0 ? "SPF" : i === 1 ? "DKIM" : "DKIM2";
                        const statusKey = i === 0 ? "spf" : i === 1 ? "dkim1" : "dkim2";
                        const ok = emailVerifyResult?.[statusKey as keyof typeof emailVerifyResult];
                        return (
                          <tr key={rec.name} className="bg-[var(--color-panel)]">
                            <td className="whitespace-nowrap px-3 py-2.5">
                              <span className="inline-flex items-center gap-1 font-mono font-semibold text-[var(--color-ink)]">
                                {emailVerifyResult && (
                                  ok
                                    ? <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
                                    : <AlertCircle className="h-3.5 w-3.5 text-red-500" />
                                )}
                                <span className="rounded bg-[var(--color-panel-strong)] px-1.5 py-0.5 text-[10px]">{rec.type}</span>
                                <span className="text-[var(--color-muted)]">{label}</span>
                              </span>
                            </td>
                            <td className="break-all px-3 py-2.5 font-mono text-[var(--color-muted)]">{rec.name}</td>
                            <td className="max-w-[220px] break-all px-3 py-2.5 font-mono text-[var(--color-ink)]">{rec.value}</td>
                            <td className="px-3 py-2.5 text-[var(--color-muted)]">{rec.description}</td>
                            <td className="px-3 py-2.5">
                              <button
                                type="button"
                                title={`Copy ${label} value`}
                                onClick={() => copyToClipboard(rec.value, label)}
                                className="rounded-lg p-1 text-[var(--color-muted)] transition hover:bg-[var(--color-panel-strong)] hover:text-[var(--color-ink)]"
                              >
                                <Copy className="h-3.5 w-3.5" />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {emailVerifyResult && !emailVerifyResult.allVerified && (
                  <div className="mb-4 flex items-start gap-2 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                    {emailVerifyResult.message}
                  </div>
                )}

                <div className="flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => void handleVerifyEmailDomain()}
                    disabled={isVerifyingEmailDomain}
                    className="theme-btn-primary inline-flex h-10 items-center gap-2 rounded-xl px-5 text-sm font-medium disabled:opacity-70"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    {isVerifyingEmailDomain ? "Checking DNS…" : "Verify DNS records"}
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleClearEmailDomain()}
                    disabled={isSavingEmailDomain}
                    className="inline-flex h-10 items-center rounded-xl border border-[var(--color-border)] px-4 text-sm text-[var(--color-muted)] transition hover:bg-[var(--color-panel-strong)] disabled:opacity-70"
                  >
                    Remove domain
                  </button>
                </div>
              </>
            )}

            {/* ── Phase: VERIFIED — active email domain ─────────────────── */}
            {isOwner && emailDomainPhase === "verified" && (
              <>
                <div className="mb-4 flex flex-wrap items-center gap-3">
                  <div className="flex items-center gap-2 rounded-xl border border-green-200 bg-green-50 px-3 py-1.5">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    <span className="text-sm font-medium text-green-800">
                      {emailSenderNameInput
                        ? <><span className="font-semibold">{emailSenderNameInput}</span>{" "}<code className="font-mono">&lt;noreply@{emailDomainInput}&gt;</code></>
                        : <code className="font-mono">noreply@{emailDomainInput}</code>}
                    </span>
                    <span className="rounded-full bg-green-200 px-2 py-0.5 text-xs font-semibold text-green-800">
                      Active
                    </span>
                  </div>
                </div>
                <p className="mb-4 text-sm text-[var(--color-muted)]">
                  Outgoing notification emails will be sent from{" "}
                  <code className="font-mono text-xs">noreply@{emailDomainInput}</code>.
                  {initialSettings?.emailDomainVerifiedAt && (
                    <> Verified on {new Date(initialSettings.emailDomainVerifiedAt).toLocaleString()}.</>
                  )}
                </p>
                <div className="flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => { setEmailDomainPhase("pending"); setEmailVerifyResult(null); }}
                    className="inline-flex h-9 items-center rounded-xl border border-[var(--color-border)] px-4 text-sm text-[var(--color-muted)] transition hover:bg-[var(--color-panel-strong)]"
                  >
                    View DNS records
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleClearEmailDomain()}
                    disabled={isSavingEmailDomain}
                    className="inline-flex h-9 items-center rounded-xl border border-red-200 px-4 text-sm text-red-600 transition hover:bg-red-50 disabled:opacity-70"
                  >
                    Remove domain
                  </button>
                </div>
              </>
            )}

            {/* ── Non-owner read-only view ───────────────────────────────── */}
            {!isOwner && (
              emailDomainPhase === "verified" ? (
                <div className="mt-3 flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <code className="font-mono text-sm text-[var(--color-ink)]">noreply@{emailDomainInput}</code>
                  <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">Active</span>
                </div>
              ) : emailDomainPhase === "pending" ? (
                <div className="mt-3 flex items-center gap-2">
                  <Clock className="h-4 w-4 text-amber-500" />
                  <code className="font-mono text-sm text-[var(--color-ink)]">{emailDomainInput}</code>
                  <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">Pending verification</span>
                </div>
              ) : (
                <p className="mt-3 text-sm text-[var(--color-muted)]">
                  No custom email domain configured. Contact an owner to set one up.
                </p>
              )
            )}
          </section>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          THEME TAB
      ══════════════════════════════════════════════════════════════════════ */}
      {tab === "theme" && (
        <section className="rounded-[28px] border border-[var(--color-border-strong)] bg-[var(--color-panel)] p-6 shadow-[var(--shadow-soft)]">
          <div className="mb-1 flex items-center gap-2">
            <Palette className="h-4 w-4 text-[var(--color-brand-strong)]" />
            <h2 className="text-base font-semibold text-[var(--color-ink)]">
              Portal theme
            </h2>
          </div>
          <p className="mb-6 text-sm text-[var(--color-muted)]">
            Customize the color palette for your organization portal. Changes
            apply across{" "}
            <code className="rounded bg-[var(--color-panel-strong)] px-1 py-0.5 font-mono text-xs">
              {organization.slug}.{platformHost}
            </code>{" "}
            immediately after saving.
          </p>

          {!isOwner && (
            <p className="mb-6 rounded-2xl border border-[var(--color-border)] bg-[var(--color-panel-strong)] px-4 py-3 text-sm text-[var(--color-muted)]">
              Only owners can edit the theme.
            </p>
          )}

          {/* Preset picker */}
          <div className="mb-6">
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-muted)]">
              Presets
            </p>
            <div className="flex flex-wrap gap-2">
              {PRESET_THEMES.map((preset) => {
                const isActive = selectedPreset === preset.id;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    disabled={!isOwner}
                    onClick={() => {
                      setSelectedPreset(preset.id);
                      setThemeDraft({ ...preset.colors });
                    }}
                    className={`flex items-center gap-2 rounded-2xl border px-3 py-2 text-xs font-medium transition disabled:cursor-not-allowed disabled:opacity-40 ${
                      isActive
                        ? "border-[var(--color-brand-strong)] bg-[var(--color-panel-strong)] text-[var(--color-ink)]"
                        : "border-[var(--color-border)] bg-[var(--color-panel)] text-[var(--color-muted)] hover:border-[var(--color-brand-strong)] hover:text-[var(--color-ink)]"
                    }`}
                  >
                    {/* mini swatch strip */}
                    <span className="flex gap-0.5 rounded-md overflow-hidden">
                      <span
                        className="h-4 w-3 rounded-l-sm"
                        style={{ backgroundColor: preset.colors.sidebarAccent }}
                      />
                      <span
                        className="h-4 w-3"
                        style={{ backgroundColor: preset.colors.brand }}
                      />
                      <span
                        className="h-4 w-3 rounded-r-sm"
                        style={{ backgroundColor: preset.colors.canvas }}
                      />
                    </span>
                    {preset.name}
                  </button>
                );
              })}
              {/* Custom indicator */}
              <button
                type="button"
                disabled
                className={`flex items-center gap-2 rounded-2xl border px-3 py-2 text-xs font-medium transition disabled:cursor-default ${
                  selectedPreset === "custom"
                    ? "border-[var(--color-brand-strong)] bg-[var(--color-panel-strong)] text-[var(--color-ink)]"
                    : "hidden"
                }`}
              >
                <span className="flex gap-0.5 rounded-md overflow-hidden">
                  <span
                    className="h-4 w-3 rounded-l-sm"
                    style={{ backgroundColor: themeDraft.sidebarAccent }}
                  />
                  <span
                    className="h-4 w-3"
                    style={{ backgroundColor: themeDraft.brand }}
                  />
                  <span
                    className="h-4 w-3 rounded-r-sm"
                    style={{ backgroundColor: themeDraft.canvas }}
                  />
                </span>
                Custom
              </button>
            </div>
          </div>

          <div className="grid gap-8 lg:grid-cols-[1fr_300px]">
            {/* Color pickers */}
            <div className="grid gap-4 sm:grid-cols-2">
              {THEME_FIELDS.map((field) => {
                const value = themeDraft[field.key];
                return (
                  <label
                    key={field.key}
                    className="block text-sm font-semibold text-[var(--color-ink)]"
                  >
                    {field.label}
                    <span className="ml-1.5 text-xs font-normal text-[var(--color-muted)]">
                      {field.hint}
                    </span>
                    <div className="mt-2 grid grid-cols-[44px_minmax(0,1fr)] gap-2">
                      <input
                        type="color"
                        disabled={!isOwner}
                        value={isHexColor(value) ? value : DEFAULT_THEME[field.key]}
                        onChange={(e) =>
                          handleThemeColorChange(field.key, e.target.value)
                        }
                        className="h-11 w-11 cursor-pointer rounded-lg border border-[var(--color-border)] bg-white p-1 disabled:cursor-not-allowed disabled:opacity-40"
                      />
                      <input
                        disabled={!isOwner}
                        value={value}
                        onChange={(e) =>
                          setThemeDraft((cur) => ({
                            ...cur,
                            [field.key]: e.target.value,
                          }))
                        }
                        onBlur={(e) => {
                          const normalized = normalizeHexColor(e.target.value);
                          setSelectedPreset("custom");
                          setThemeDraft((cur) => ({
                            ...cur,
                            [field.key]: normalized ?? DEFAULT_THEME[field.key],
                          }));
                        }}
                        placeholder="#000000"
                        className="h-11 rounded-lg border border-[var(--color-border)] bg-white px-3 font-mono text-sm font-normal outline-none focus:border-[var(--color-brand-strong)] focus:ring-4 focus:ring-[var(--color-focus-ring)] disabled:opacity-40"
                      />
                    </div>
                  </label>
                );
              })}
            </div>

            {/* Live preview + save */}
            <div className="lg:sticky lg:top-4 lg:self-start">
              <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-muted)]">
                Live preview
              </p>
              <div
                className="overflow-hidden rounded-[24px] border"
                style={{
                  backgroundColor: themeDraft.canvas,
                  borderColor: themeDraft.border,
                }}
              >
                {/* Sidebar strip */}
                <div
                  className="flex items-center gap-2.5 px-4 py-3"
                  style={{ backgroundColor: themeDraft.sidebarAccent }}
                >
                  <span
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[12px] text-xs font-bold"
                    style={{
                      backgroundColor: themeDraft.sidebarAccent,
                      color: themeDraft.sidebarAccentInk,
                      border: `1px solid ${themeDraft.borderStrong}`,
                    }}
                  >
                    {organization.name.slice(0, 1).toUpperCase()}
                  </span>
                  <span
                    className="truncate text-xs font-semibold"
                    style={{ color: themeDraft.sidebarAccentInk }}
                  >
                    {organization.name}
                  </span>
                </div>

                {/* Content */}
                <div className="p-4">
                  <p
                    className="text-[10px] font-semibold uppercase tracking-[0.22em]"
                    style={{ color: themeDraft.brandStrong }}
                  >
                    Organization portal
                  </p>
                  <p
                    className="mt-1 text-lg font-semibold"
                    style={{ color: themeDraft.ink }}
                  >
                    Dashboard
                  </p>
                  <p className="mt-0.5 text-xs" style={{ color: themeDraft.muted }}>
                    Welcome — here&apos;s your overview.
                  </p>

                  <div className="mt-3 flex flex-wrap gap-2">
                    <span
                      className="inline-flex h-8 items-center rounded-xl px-3 text-xs font-medium"
                      style={{
                        backgroundColor: themeDraft.brand,
                        color: themeDraft.brandStrong,
                      }}
                    >
                      New job
                    </span>
                    <span
                      className="inline-flex h-8 items-center rounded-xl border px-3 text-xs"
                      style={{
                        borderColor: themeDraft.border,
                        color: themeDraft.ink,
                        backgroundColor: themeDraft.panel,
                      }}
                    >
                      View all
                    </span>
                  </div>

                  <div
                    className="mt-3 rounded-2xl border p-3"
                    style={{
                      backgroundColor: themeDraft.panel,
                      borderColor: themeDraft.borderStrong,
                    }}
                  >
                    <p className="text-[10px]" style={{ color: themeDraft.muted }}>
                      JOBS
                    </p>
                    <p
                      className="mt-0.5 text-sm font-semibold"
                      style={{ color: themeDraft.ink }}
                    >
                      3 open positions
                    </p>
                  </div>
                </div>
              </div>

              {isOwner && (
                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setIsResetConfirmOpen(true)}
                    className="inline-flex h-9 items-center rounded-xl border border-[var(--color-border)] px-3 text-xs text-[var(--color-muted)] transition hover:bg-[var(--color-panel-strong)]"
                  >
                    Reset to default
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleSaveTheme()}
                    disabled={isSavingTheme}
                    className="theme-btn-primary inline-flex h-9 flex-1 items-center justify-center rounded-xl px-4 text-sm font-medium disabled:opacity-70"
                  >
                    {isSavingTheme ? "Saving…" : "Save theme"}
                  </button>
                </div>
              )}

              {initialSettings?.updatedAt && (
                <p className="mt-3 text-xs text-[var(--color-muted)]">
                  Last saved{" "}
                  {new Date(initialSettings.updatedAt).toLocaleString()}
                </p>
              )}
            </div>
          </div>
        </section>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          ADMINISTRATORS TAB
      ══════════════════════════════════════════════════════════════════════ */}
      {tab === "members" && (
        <section className="rounded-[28px] border border-[var(--color-border-strong)] bg-[var(--color-panel)] p-6 shadow-[var(--shadow-soft)]">
          <div className="mb-5 flex items-center justify-between">
            <h2 className="text-base font-semibold text-[var(--color-ink)]">
              Administrators
            </h2>
            <span className="text-sm text-[var(--color-muted)]">
              {members.length} administrator{members.length !== 1 ? "s" : ""}
            </span>
          </div>

          <div className="divide-y divide-[var(--color-border)]">
            {members.map((member) => (
              <div
                key={member.email}
                className="flex items-center gap-3 py-3 first:pt-0 last:pb-0"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-medium text-[var(--color-ink)]">
                      {member.email}
                    </p>
                    {member.email === normalizedSessionEmail && (
                      <span className="rounded-full bg-[var(--color-panel-strong)] px-2 py-0.5 text-xs text-[var(--color-muted)]">
                        You
                      </span>
                    )}
                    {member.isRootOwner && (
                      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700">
                        Root owner
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-[var(--color-muted)]">
                    Added {new Date(member.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <RoleBadge role={member.role} />
                {isOwner && isCurrentUserRootOwner && member.role === "owner" && !member.isRootOwner && (
                  <button
                    type="button"
                    onClick={() => setPendingTransferEmail(member.email)}
                    className="inline-flex h-8 items-center rounded-xl border border-amber-200 px-2.5 text-xs font-medium text-amber-700 transition hover:bg-amber-50"
                  >
                    Make root
                  </button>
                )}
                {isOwner && member.email !== normalizedSessionEmail && !member.isRootOwner && (
                  <button
                    type="button"
                    onClick={() => setPendingRemoveEmail(member.email)}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-[var(--color-border)] text-[var(--color-muted)] transition hover:border-red-300 hover:bg-red-50 hover:text-red-600"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            ))}

            {members.length === 0 && (
              <p className="py-8 text-center text-sm text-[var(--color-muted)]">
                No administrators yet.
              </p>
            )}
          </div>

          {isOwner && (
            <p className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800">
              Root owner cannot be removed. Only the current root owner can transfer root ownership to another owner.
            </p>
          )}

          {isOwner && (
            <form
              onSubmit={handleInvite}
              className="mt-6 rounded-2xl border border-[var(--color-border)] bg-[var(--color-panel-strong)] p-4"
            >
              <p className="mb-3 text-sm font-semibold text-[var(--color-ink)]">
                <UserPlus className="mr-1.5 inline h-4 w-4" />
                Add administrator
              </p>
              <div className="flex flex-wrap gap-3">
                <input
                  type="email"
                  required
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="colleague@example.com"
                  className="h-10 min-w-0 flex-1 rounded-xl border border-[var(--color-border)] bg-white px-3 text-sm text-[var(--color-ink)] outline-none focus:border-[var(--color-brand-strong)] focus:ring-4 focus:ring-[var(--color-focus-ring)]"
                />
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value as OrganizationRole)}
                  className="h-10 rounded-xl border border-[var(--color-border)] bg-white px-3 text-sm text-[var(--color-ink)] outline-none focus:border-[var(--color-brand-strong)] focus:ring-4 focus:ring-[var(--color-focus-ring)]"
                >
                  {ROLE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                <button
                  type="submit"
                  disabled={isInviting}
                  className="theme-btn-primary inline-flex h-10 items-center rounded-xl px-4 text-sm font-medium disabled:opacity-70"
                >
                  {isInviting ? "Inviting…" : "Invite"}
                </button>
              </div>
              <div className="mt-3 grid gap-1">
                {ROLE_OPTIONS.map((opt) => (
                  <p key={opt.value} className="text-xs text-[var(--color-muted)]">
                    <span className="font-medium capitalize">{opt.value}:</span>{" "}
                    {opt.description}
                  </p>
                ))}
              </div>
            </form>
          )}
        </section>
      )}
    </PortalShell>
  );
}
