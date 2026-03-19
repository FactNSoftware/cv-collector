"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { ChevronLeft } from "lucide-react";
import type {
  OrganizationMembership,
  OrganizationRecord,
  OrganizationRole,
  OrganizationStatus,
} from "../../lib/organizations";
import type {
  OrganizationBrandingSettings,
  TenantTheme,
} from "../../lib/organization-branding";
import { PortalShell } from "./PortalShell";
import { useToast } from "./ToastProvider";

type SuperAdminPortalProps = {
  sessionEmail: string;
  initialOrganizations: OrganizationRecord[];
  selectedSlug?: string;
  backHref?: string;
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

const THEME_FIELDS: Array<{ key: keyof TenantTheme; label: string }> = [
  { key: "canvas", label: "Canvas" },
  { key: "panel", label: "Panel" },
  { key: "panelStrong", label: "Panel Strong" },
  { key: "sidebarAccent", label: "Sidebar Accent" },
  { key: "sidebarAccentInk", label: "Sidebar Accent Ink" },
  { key: "ink", label: "Ink" },
  { key: "muted", label: "Muted" },
  { key: "brand", label: "Brand" },
  { key: "brandStrong", label: "Brand Strong" },
  { key: "border", label: "Border" },
  { key: "borderStrong", label: "Border Strong" },
];

const isHexColor = (value: string) => /^#[0-9a-f]{6}$/i.test(value.trim());

const normalizeHexColor = (value: string) => {
  const normalized = value.trim().toLowerCase();

  if (/^#[0-9a-f]{6}$/i.test(normalized)) {
    return normalized;
  }

  if (/^#[0-9a-f]{3}$/i.test(normalized)) {
    const [r, g, b] = normalized.slice(1).split("");
    return `#${r}${r}${g}${g}${b}${b}`;
  }

  return null;
};

const sortOrganizations = (items: OrganizationRecord[]) => {
  return [...items].sort((left, right) => left.name.localeCompare(right.name));
};

export function SuperAdminPortal({
  sessionEmail,
  initialOrganizations,
  selectedSlug: initialSelectedSlug,
  backHref,
}: SuperAdminPortalProps) {
  const { showToast } = useToast();
  const isDetailView = !!backHref;

  const [organizations, setOrganizations] = useState(() => sortOrganizations(initialOrganizations));
  const [selectedSlug, setSelectedSlug] = useState<string | null>(
    initialSelectedSlug ?? initialOrganizations[0]?.slug ?? null,
  );

  const [isCreatingOrganization, setIsCreatingOrganization] = useState(false);
  const [newOrganizationSlug, setNewOrganizationSlug] = useState("");
  const [newOrganizationName, setNewOrganizationName] = useState("");
  const [newOrganizationOwnerEmail, setNewOrganizationOwnerEmail] = useState("");

  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [isSavingMembership, setIsSavingMembership] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [removingMembershipEmail, setRemovingMembershipEmail] = useState<string | null>(null);

  const [settings, setSettings] = useState<OrganizationBrandingSettings | null>(null);
  const [memberships, setMemberships] = useState<OrganizationMembership[]>([]);
  const [customDomain, setCustomDomain] = useState("");
  const [themeDraft, setThemeDraft] = useState<TenantTheme>({ ...DEFAULT_THEME });
  const [memberEmail, setMemberEmail] = useState("");
  const [memberRole, setMemberRole] = useState<OrganizationRole>("admin");

  const selectedOrganization = useMemo(
    () => organizations.find((item) => item.slug === selectedSlug) ?? null,
    [organizations, selectedSlug],
  );

  const loadOrganizationDetails = useCallback(async (slug: string) => {
    setIsLoadingDetails(true);

    try {
      const [settingsResponse, membershipsResponse] = await Promise.all([
        fetch(`/api/super-admin/organizations/${encodeURIComponent(slug)}/settings`, {
          cache: "no-store",
        }),
        fetch(`/api/super-admin/organizations/${encodeURIComponent(slug)}/members`, {
          cache: "no-store",
        }),
      ]);

      const settingsPayload = await settingsResponse
        .json()
        .catch(() => ({ settings: null, message: "Failed to load organization settings." }));
      const membershipsPayload = await membershipsResponse
        .json()
        .catch(() => ({ items: [], message: "Failed to load organization members." }));

      if (!settingsResponse.ok) {
        showToast(settingsPayload.message || "Failed to load organization settings.", "error");
      }

      if (!membershipsResponse.ok) {
        showToast(membershipsPayload.message || "Failed to load organization members.", "error");
      }

      const loadedSettings = settingsResponse.ok
        ? (settingsPayload.settings as OrganizationBrandingSettings | null)
        : null;
      const loadedMembers = membershipsResponse.ok
        ? (membershipsPayload.items as OrganizationMembership[])
        : [];

      setSettings(loadedSettings);
      setMemberships(loadedMembers);
      setCustomDomain(loadedSettings?.customDomain ?? "");
      setThemeDraft(loadedSettings?.theme ?? { ...DEFAULT_THEME });
    } catch {
      showToast("Something went wrong while loading organization details.", "error");
      setSettings(null);
      setMemberships([]);
      setCustomDomain("");
      setThemeDraft({ ...DEFAULT_THEME });
    } finally {
      setIsLoadingDetails(false);
    }
  }, [showToast]);

  useEffect(() => {
    if (!selectedSlug) {
      setSettings(null);
      setMemberships([]);
      setCustomDomain("");
      setThemeDraft({ ...DEFAULT_THEME });
      return;
    }

    void loadOrganizationDetails(selectedSlug);
  }, [loadOrganizationDetails, selectedSlug]);

  const handleCreateOrganization = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsCreatingOrganization(true);

    try {
      const response = await fetch("/api/super-admin/organizations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          slug: newOrganizationSlug,
          name: newOrganizationName,
          ownerEmail: newOrganizationOwnerEmail,
        }),
      });

      const payload = await response
        .json()
        .catch(() => ({ message: "Failed to create organization." }));

      if (!response.ok) {
        showToast(payload.message || "Failed to create organization.", "error");
        return;
      }

      const item = payload.item as OrganizationRecord;

      setOrganizations((current) => sortOrganizations([item, ...current]));
      setSelectedSlug(item.slug);
      setNewOrganizationSlug("");
      setNewOrganizationName("");
      setNewOrganizationOwnerEmail("");
      showToast(payload.message || "Organization created successfully.");
    } catch {
      showToast("Something went wrong while creating the organization.", "error");
    } finally {
      setIsCreatingOrganization(false);
    }
  };

  const handleThemeColorChange = (key: keyof TenantTheme, next: string) => {
    const normalized = normalizeHexColor(next);

    if (!normalized) {
      return;
    }

    setThemeDraft((current) => ({
      ...current,
      [key]: normalized,
    }));
  };

  const handleSaveSettings = async () => {
    if (!selectedSlug) {
      return;
    }

    setIsSavingSettings(true);

    try {
      const response = await fetch(`/api/super-admin/organizations/${encodeURIComponent(selectedSlug)}/settings`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          customDomain,
          theme: themeDraft,
        }),
      });

      const payload = await response
        .json()
        .catch(() => ({ message: "Failed to save organization settings." }));

      if (!response.ok) {
        showToast(payload.message || "Failed to save organization settings.", "error");
        return;
      }

      const savedSettings = payload.settings as OrganizationBrandingSettings;
      setSettings(savedSettings);
      setCustomDomain(savedSettings.customDomain ?? "");
      setThemeDraft(savedSettings.theme);
      showToast(payload.message || "Organization settings updated successfully.");
    } catch {
      showToast("Something went wrong while saving settings.", "error");
    } finally {
      setIsSavingSettings(false);
    }
  };

  const handleAddMembership = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!selectedSlug) {
      return;
    }

    setIsSavingMembership(true);

    try {
      const response = await fetch(`/api/super-admin/organizations/${encodeURIComponent(selectedSlug)}/members`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: memberEmail,
          role: memberRole,
        }),
      });

      const payload = await response
        .json()
        .catch(() => ({ message: "Failed to save membership." }));

      if (!response.ok) {
        showToast(payload.message || "Failed to save membership.", "error");
        return;
      }

      setMemberEmail("");
      showToast(payload.message || "Organization membership saved successfully.");
      await loadOrganizationDetails(selectedSlug);
    } catch {
      showToast("Something went wrong while saving membership.", "error");
    } finally {
      setIsSavingMembership(false);
    }
  };

  const handleRemoveMembership = async (email: string) => {
    if (!selectedSlug) {
      return;
    }

    setRemovingMembershipEmail(email);

    try {
      const response = await fetch(`/api/super-admin/organizations/${encodeURIComponent(selectedSlug)}/members`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
        }),
      });

      const payload = await response
        .json()
        .catch(() => ({ message: "Failed to remove membership." }));

      if (!response.ok) {
        showToast(payload.message || "Failed to remove membership.", "error");
        return;
      }

      showToast(payload.message || "Organization membership removed successfully.");
      await loadOrganizationDetails(selectedSlug);
    } catch {
      showToast("Something went wrong while removing membership.", "error");
    } finally {
      setRemovingMembershipEmail(null);
    }
  };

  const handleUpdateOrganizationStatus = async (nextStatus: OrganizationStatus) => {
    if (!selectedOrganization || selectedOrganization.status === nextStatus) {
      return;
    }

    setIsUpdatingStatus(true);

    try {
      const response = await fetch(`/api/super-admin/organizations/${encodeURIComponent(selectedOrganization.slug)}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          status: nextStatus,
        }),
      });

      const payload = await response
        .json()
        .catch(() => ({ message: "Failed to update organization status." }));

      if (!response.ok) {
        showToast(payload.message || "Failed to update organization status.", "error");
        return;
      }

      const updatedOrganization = payload.item as OrganizationRecord;

      setOrganizations((current) => sortOrganizations(current.map((item) => (
        item.id === updatedOrganization.id ? updatedOrganization : item
      ))));
      showToast(payload.message || "Organization status updated successfully.");
    } catch {
      showToast("Something went wrong while updating organization status.", "error");
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  return (
    <PortalShell
      portal="system"
      sessionEmail={sessionEmail}
      eyebrow="System"
      title={isDetailView ? selectedOrganization?.name : "Organizations"}
      subtitle={isDetailView ? "Manage organization settings and members" : "Create organizations, assign members, and configure custom domain + full theme tokens per tenant."}
    >
      {isDetailView && backHref && (
        <div className="mb-6">
          <Link
            href={backHref}
            className="inline-flex items-center gap-2 text-sm text-[var(--color-brand)] hover:underline"
          >
            <ChevronLeft className="h-4 w-4" />
            Back to organizations
          </Link>
        </div>
      )}
      <div className={isDetailView ? "space-y-4" : "grid gap-4 xl:grid-cols-[340px_1fr]"}>
        {!isDetailView && (
          <section className="space-y-4">
          <article className="rounded-[28px] border border-[var(--color-border-strong)] bg-[var(--color-panel)] p-5 shadow-[var(--shadow-soft)]">
            <h2 className="text-lg font-semibold text-[var(--color-ink)]">Create organization</h2>
            <p className="mt-2 text-sm text-[var(--color-muted)]">
              New tenant setup with an initial owner.
            </p>

            <form className="mt-4 space-y-3" onSubmit={handleCreateOrganization}>
              <input
                value={newOrganizationSlug}
                onChange={(event) => setNewOrganizationSlug(event.target.value)}
                placeholder="slug example acme-careers"
                className="h-11 w-full rounded-xl border border-[var(--color-border)] bg-white px-3 text-sm outline-none focus:border-[var(--color-brand)]"
              />
              <input
                value={newOrganizationName}
                onChange={(event) => setNewOrganizationName(event.target.value)}
                placeholder="Organization name"
                className="h-11 w-full rounded-xl border border-[var(--color-border)] bg-white px-3 text-sm outline-none focus:border-[var(--color-brand)]"
              />
              <input
                value={newOrganizationOwnerEmail}
                onChange={(event) => setNewOrganizationOwnerEmail(event.target.value)}
                placeholder="Owner email"
                className="h-11 w-full rounded-xl border border-[var(--color-border)] bg-white px-3 text-sm outline-none focus:border-[var(--color-brand)]"
              />
              <button
                type="submit"
                disabled={isCreatingOrganization}
                className="theme-btn-primary theme-action-button h-11 w-full rounded-xl px-4 disabled:opacity-70"
              >
                {isCreatingOrganization ? "Creating..." : "Create organization"}
              </button>
            </form>
          </article>

          <article className="rounded-[28px] border border-[var(--color-border-strong)] bg-[var(--color-panel)] p-5 shadow-[var(--shadow-soft)]">
            <h2 className="text-lg font-semibold text-[var(--color-ink)]">Organizations</h2>
            <p className="mt-2 text-sm text-[var(--color-muted)]">
              Select a tenant to manage domain, theme, and memberships.
            </p>

            <div className="mt-4 space-y-2">
              {organizations.map((organization) => {
                const isSelected = selectedSlug === organization.slug;

                return (
                  <button
                    key={organization.id}
                    type="button"
                    onClick={() => setSelectedSlug(organization.slug)}
                    className={`w-full rounded-xl border px-3 py-3 text-left transition ${isSelected
                      ? "theme-surface-active"
                      : "border-[var(--color-border)] bg-white text-[var(--color-ink)] hover:border-[var(--color-border-strong)]"
                    }`}
                  >
                    <p className="text-sm font-semibold">{organization.name}</p>
                    <p className="mt-1 text-xs opacity-80">{organization.slug}</p>
                    <p className="mt-2 text-[11px] font-semibold uppercase tracking-[0.16em] opacity-70">
                      {organization.status}
                    </p>
                  </button>
                );
              })}
              {organizations.length === 0 ? (
                <p className="rounded-xl border border-dashed border-[var(--color-border)] bg-white/70 p-4 text-sm text-[var(--color-muted)]">
                  No organizations yet.
                </p>
              ) : null}
            </div>
          </article>
        </section>
        )}

        <section className={isDetailView ? "space-y-4 max-w-4xl" : "space-y-4"}>
          {selectedOrganization ? (
            <>
              <article className="rounded-[28px] border border-[var(--color-border-strong)] bg-[var(--color-panel)] p-6 shadow-[var(--shadow-soft)]">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--color-brand-strong)]">
                      Tenant settings
                    </p>
                    <h2 className="mt-2 text-2xl font-semibold text-[var(--color-ink)]">{selectedOrganization.name}</h2>
                    <p className="mt-1 text-sm text-[var(--color-muted)]">Slug: {selectedOrganization.slug}</p>
                  </div>
                  <span className="rounded-full bg-[var(--color-panel-strong)] px-3 py-1.5 text-xs font-semibold text-[var(--color-brand-strong)]">
                    {selectedOrganization.status}
                  </span>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  <a
                    href={`/o/${encodeURIComponent(selectedOrganization.slug)}`}
                    target="_blank"
                    rel="noreferrer"
                    className="theme-action-button theme-action-button-secondary rounded-xl px-4 py-2"
                  >
                    Open tenant route
                  </a>
                  {selectedOrganization.status === "active" ? (
                    <button
                      type="button"
                      onClick={() => void handleUpdateOrganizationStatus("suspended")}
                      disabled={isUpdatingStatus}
                      className="theme-action-button theme-action-button-danger rounded-xl px-4 py-2 disabled:opacity-70"
                    >
                      {isUpdatingStatus ? "Updating..." : "Suspend organization"}
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => void handleUpdateOrganizationStatus("active")}
                      disabled={isUpdatingStatus}
                      className="theme-btn-primary theme-action-button rounded-xl px-4 py-2 disabled:opacity-70"
                    >
                      {isUpdatingStatus ? "Updating..." : "Reactivate organization"}
                    </button>
                  )}
                </div>

                <div className="mt-6 grid gap-4 lg:grid-cols-[1fr_1fr]">
                  <div className="space-y-3">
                    <label className="block text-sm font-semibold text-[var(--color-ink)]">
                      Custom domain
                      <input
                        value={customDomain}
                        onChange={(event) => setCustomDomain(event.target.value)}
                        placeholder="careers.example.com"
                        className="mt-2 h-11 w-full rounded-xl border border-[var(--color-border)] bg-white px-3 text-sm font-normal outline-none focus:border-[var(--color-brand)]"
                      />
                    </label>
                    <p className="text-xs leading-5 text-[var(--color-muted)]">
                      Leave empty to use default platform domain resolution.
                    </p>

                    <div className="rounded-2xl border border-[var(--color-border)] bg-white p-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-muted)]">Theme preview</p>
                      <div
                        className="mt-3 rounded-2xl border p-4"
                        style={{
                          backgroundColor: themeDraft.canvas,
                          borderColor: themeDraft.border,
                          color: themeDraft.ink,
                        }}
                      >
                        <p
                          className="inline-flex rounded-full px-2.5 py-1 text-xs font-semibold"
                          style={{
                            backgroundColor: themeDraft.sidebarAccent,
                            color: themeDraft.sidebarAccentInk,
                          }}
                        >
                          Accent
                        </p>
                        <p className="mt-2 text-sm" style={{ color: themeDraft.muted }}>
                          This preview reflects your selected tenant palette.
                        </p>
                        <button
                          type="button"
                          className="mt-3 rounded-lg px-3 py-2 text-sm font-medium"
                          style={{
                            backgroundColor: themeDraft.brand,
                            color: themeDraft.brandStrong,
                          }}
                        >
                          Brand action
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    {THEME_FIELDS.map((field) => {
                      const value = themeDraft[field.key];

                      return (
                        <label key={field.key} className="block text-sm font-semibold text-[var(--color-ink)]">
                          {field.label}
                          <div className="mt-2 grid grid-cols-[44px_minmax(0,1fr)] gap-2">
                            <input
                              type="color"
                              value={isHexColor(value) ? value : DEFAULT_THEME[field.key]}
                              onChange={(event) => handleThemeColorChange(field.key, event.target.value)}
                              className="h-11 w-11 rounded-lg border border-[var(--color-border)] bg-white p-1"
                            />
                            <input
                              value={value}
                              onChange={(event) => {
                                setThemeDraft((current) => ({
                                  ...current,
                                  [field.key]: event.target.value,
                                }));
                              }}
                              onBlur={(event) => {
                                const normalized = normalizeHexColor(event.target.value);

                                if (!normalized) {
                                  setThemeDraft((current) => ({
                                    ...current,
                                    [field.key]: DEFAULT_THEME[field.key],
                                  }));
                                  return;
                                }

                                setThemeDraft((current) => ({
                                  ...current,
                                  [field.key]: normalized,
                                }));
                              }}
                              className="h-11 rounded-lg border border-[var(--color-border)] bg-white px-3 text-sm font-normal outline-none focus:border-[var(--color-brand)]"
                              placeholder="#000000"
                            />
                          </div>
                        </label>
                      );
                    })}
                  </div>
                </div>

                <div className="mt-5 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setThemeDraft({ ...DEFAULT_THEME });
                    }}
                    className="theme-action-button theme-action-button-secondary rounded-xl px-4 py-2"
                  >
                    Reset theme draft
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setCustomDomain("");
                    }}
                    className="theme-action-button theme-action-button-secondary rounded-xl px-4 py-2"
                  >
                    Clear domain draft
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleSaveSettings()}
                    disabled={isSavingSettings || isLoadingDetails}
                    className="theme-btn-primary theme-action-button rounded-xl px-5 py-2.5 disabled:opacity-70"
                  >
                    {isSavingSettings ? "Saving..." : "Save settings"}
                  </button>
                </div>

                {settings?.updatedAt ? (
                  <p className="mt-3 text-xs text-[var(--color-muted)]">
                    Last updated {new Date(settings.updatedAt).toLocaleString()} by {settings.updatedBy || "unknown"}
                  </p>
                ) : null}
              </article>

              <article className="rounded-[28px] border border-[var(--color-border-strong)] bg-[var(--color-panel)] p-6 shadow-[var(--shadow-soft)]">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="text-xl font-semibold text-[var(--color-ink)]">Organization memberships</h3>
                    <p className="mt-1 text-sm text-[var(--color-muted)]">
                      Add or remove owner and admin users for this tenant.
                    </p>
                  </div>
                  <span className="rounded-full bg-[var(--color-panel-strong)] px-3 py-1 text-xs font-semibold text-[var(--color-brand-strong)]">
                    {memberships.length} member{memberships.length === 1 ? "" : "s"}
                  </span>
                </div>

                <form className="mt-4 grid gap-3 md:grid-cols-[1fr_140px_auto]" onSubmit={handleAddMembership}>
                  <input
                    value={memberEmail}
                    onChange={(event) => setMemberEmail(event.target.value)}
                    placeholder="member@example.com"
                    className="h-11 rounded-xl border border-[var(--color-border)] bg-white px-3 text-sm outline-none focus:border-[var(--color-brand)]"
                  />
                  <select
                    value={memberRole}
                    onChange={(event) => setMemberRole(event.target.value === "owner" ? "owner" : "admin")}
                    className="h-11 rounded-xl border border-[var(--color-border)] bg-white px-3 text-sm outline-none focus:border-[var(--color-brand)]"
                  >
                    <option value="admin">Admin</option>
                    <option value="owner">Owner</option>
                  </select>
                  <button
                    type="submit"
                    disabled={isSavingMembership}
                    className="theme-btn-primary theme-action-button h-11 rounded-xl px-4 disabled:opacity-70"
                  >
                    {isSavingMembership ? "Saving..." : "Add member"}
                  </button>
                </form>

                <div className="mt-4 space-y-2">
                  {memberships.map((member) => (
                    <div
                      key={member.email}
                      className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[var(--color-border)] bg-white px-4 py-3"
                    >
                      <div>
                        <p className="text-sm font-semibold text-[var(--color-ink)]">{member.email}</p>
                        <p className="mt-1 text-xs text-[var(--color-muted)]">Role: {member.role}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => void handleRemoveMembership(member.email)}
                        disabled={removingMembershipEmail === member.email}
                        className="theme-action-button theme-action-button-danger rounded-lg px-3 py-2 text-sm disabled:opacity-70"
                      >
                        {removingMembershipEmail === member.email ? "Removing..." : "Remove"}
                      </button>
                    </div>
                  ))}
                  {memberships.length === 0 ? (
                    <p className="rounded-xl border border-dashed border-[var(--color-border)] bg-white/70 p-4 text-sm text-[var(--color-muted)]">
                      No memberships yet.
                    </p>
                  ) : null}
                </div>
              </article>
            </>
          ) : (
            <article className="rounded-[28px] border border-dashed border-[var(--color-border)] bg-[var(--color-panel)] p-8 text-sm text-[var(--color-muted)] shadow-[var(--shadow-soft)]">
              Select an organization to configure its tenant settings.
            </article>
          )}
        </section>
      </div>
    </PortalShell>
  );
}
