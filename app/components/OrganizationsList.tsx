"use client";

import type { ColumnDef } from "@tanstack/react-table";
import Link from "next/link";
import { Building2, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useMemo, useState, type FormEvent } from "react";
import type { OrganizationRecord } from "../../lib/organizations";
import type { PageInfo } from "../../lib/pagination";
import { AdminDataTable } from "./AdminDataTable";
import { AdminViewModeToggle } from "./AdminViewModeToggle";
import { ConfirmDialog } from "./ConfirmDialog";
import { PortalShell } from "./PortalShell";
import { usePersistedViewMode } from "./usePersistedViewMode";
import { useServerInfiniteList } from "./useServerInfiniteList";
import { useServerPagination } from "./useServerPagination";
import { useToast } from "./ToastProvider";

type OrganizationsListProps = {
  sessionEmail: string;
  initialOrganizations: OrganizationRecord[];
  initialPageInfo: PageInfo;
};

type PendingAction = {
  slug: string;
  name: string;
  currentStatus: OrganizationRecord["status"];
};

type PendingDeleteAction = {
  slug: string;
  name: string;
};

const normalizeOrganizationSlug = (value: string) => {
  return value
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
};

const createQueryString = ({
  limit,
  cursor,
}: {
  limit: number;
  cursor?: string;
}) => {
  const params = new URLSearchParams({
    limit: String(limit),
  });

  if (cursor) {
    params.set("cursor", cursor);
  }

  return params.toString();
};

export function OrganizationsList({
  sessionEmail,
  initialOrganizations,
  initialPageInfo,
}: OrganizationsListProps) {
  const { showToast } = useToast();
  const router = useRouter();
  const { viewMode, setViewMode } = usePersistedViewMode("system-organizations-view", "table");
  const [tablePageSize, setTablePageSize] = useState(initialPageInfo.limit);
  const [reloadSeed, setReloadSeed] = useState(0);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState<string | null>(null);
  const [isDeletingOrganization, setIsDeletingOrganization] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);
  const [pendingDeleteAction, setPendingDeleteAction] = useState<PendingDeleteAction | null>(null);
  const [isCreateFormVisible, setIsCreateFormVisible] = useState(false);
  const [newOrganizationSlug, setNewOrganizationSlug] = useState("");
  const [newOrganizationName, setNewOrganizationName] = useState("");
  const [newOrganizationOwnerEmail, setNewOrganizationOwnerEmail] = useState("");
  const [isSlugManuallyEdited, setIsSlugManuallyEdited] = useState(false);
  const [isCreatingOrganization, setIsCreatingOrganization] = useState(false);

  const resetKey = `${tablePageSize}|${reloadSeed}`;
  const fetchPage = useCallback(async (cursor?: string) => {
    const response = await fetch(`/api/super-admin/organizations?${createQueryString({
      limit: tablePageSize,
      cursor,
    })}`);
    const payload = await response.json().catch(() => ({
      items: [] as OrganizationRecord[],
      pageInfo: { limit: tablePageSize, nextCursor: null, hasMore: false },
      message: "Failed to load organizations.",
    }));

    if (!response.ok) {
      throw new Error(payload.message || "Failed to load organizations.");
    }

    return payload as { items: OrganizationRecord[]; pageInfo: PageInfo };
  }, [tablePageSize]);

  const {
    items: tableItems,
    setItems: setTableItems,
    isLoading: isTableLoading,
    pageIndex,
    canPreviousPage,
    canNextPage,
    goToPreviousPage,
    goToNextPage,
  } = useServerPagination<OrganizationRecord>({
    initialItems: initialOrganizations,
    initialPageInfo,
    resetKey,
    loadPage: fetchPage,
  });

  const {
    items: cardItems,
    setItems: setCardItems,
    isLoading: isCardLoading,
    isLoadingMore: isCardLoadingMore,
    sentinelRef: cardSentinelRef,
  } = useServerInfiniteList<OrganizationRecord>({
    initialItems: initialOrganizations,
    initialPageInfo,
    resetKey,
    loadPage: fetchPage,
  });

  const loadedCount = viewMode === "card" ? cardItems.length : tableItems.length;

  const patchOrganizationInViews = (
    slug: string,
    patch: (organization: OrganizationRecord) => OrganizationRecord,
  ) => {
    setTableItems((current) => current.map((organization) => {
      if (organization.slug !== slug) {
        return organization;
      }

      return patch(organization);
    }));
    setCardItems((current) => current.map((organization) => {
      if (organization.slug !== slug) {
        return organization;
      }

      return patch(organization);
    }));
  };

  const confirmToggleStatus = async () => {
    if (!pendingAction) return;
    const { slug, currentStatus } = pendingAction;
    setIsUpdatingStatus(slug);

    try {
      const newStatus = currentStatus === "active" ? "suspended" : "active";
      const response = await fetch(
        `/api/super-admin/organizations/${encodeURIComponent(slug)}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: newStatus }),
        }
      );

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        showToast(payload.message || "Failed to update organization status.", "error");
        return;
      }

      const payload = await response.json().catch(() => ({}));
      const updated = payload.item as OrganizationRecord | undefined;

      patchOrganizationInViews(slug, (organization) => ({
        ...organization,
        status: updated?.status ?? newStatus,
      }));
      showToast(payload.message || `Organization ${newStatus === "active" ? "activated" : "suspended"}.`);
    } catch {
      showToast("Something went wrong.", "error");
    } finally {
      setIsUpdatingStatus(null);
      setPendingAction(null);
    }
  };

  const confirmDeleteOrganization = async () => {
    if (!pendingDeleteAction) {
      return;
    }

    const { slug } = pendingDeleteAction;
    setIsDeletingOrganization(slug);

    try {
      const response = await fetch(`/api/super-admin/organizations/${encodeURIComponent(slug)}`, {
        method: "DELETE",
      });

      const payload = await response
        .json()
        .catch(() => ({ message: "Failed to delete organization." }));

      if (!response.ok) {
        showToast(payload.message || "Failed to delete organization.", "error");
        return;
      }

      setTableItems((current) => current.filter((organization) => organization.slug !== slug));
      setCardItems((current) => current.filter((organization) => organization.slug !== slug));
      showToast(payload.message || "Organization deleted successfully.");
    } catch {
      showToast("Something went wrong while deleting organization.", "error");
    } finally {
      setIsDeletingOrganization(null);
      setPendingDeleteAction(null);
    }
  };

  const handleCreateOrganization = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsCreatingOrganization(true);

    try {
      const resolvedName = newOrganizationName.trim();
      const autoSlug = normalizeOrganizationSlug(resolvedName);
      const resolvedSlug = (newOrganizationSlug || autoSlug).trim();
      const resolvedOwnerEmail = newOrganizationOwnerEmail.trim().toLowerCase();

      if (!resolvedName) {
        showToast("Organization name is required.", "error");
        return;
      }

      if (!resolvedSlug) {
        showToast("Please provide a valid organization slug.", "error");
        return;
      }

      if (!resolvedOwnerEmail) {
        showToast("Owner email is required.", "error");
        return;
      }

      const response = await fetch("/api/super-admin/organizations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          slug: resolvedSlug,
          name: resolvedName,
          ownerEmail: resolvedOwnerEmail,
        }),
      });

      const payload = await response
        .json()
        .catch(() => ({ message: "Failed to create organization." }));

      if (!response.ok) {
        showToast(payload.message || "Failed to create organization.", "error");
        return;
      }

      setNewOrganizationSlug("");
      setNewOrganizationName("");
      setNewOrganizationOwnerEmail("");
      setIsSlugManuallyEdited(false);
      setIsCreateFormVisible(false);
      setReloadSeed((current) => current + 1);
      showToast(payload.message || "Organization created successfully.");
    } catch {
      showToast("Something went wrong while creating the organization.", "error");
    } finally {
      setIsCreatingOrganization(false);
    }
  };

  const handleOrganizationNameChange = (value: string) => {
    setNewOrganizationName(value);

    if (!isSlugManuallyEdited) {
      setNewOrganizationSlug(normalizeOrganizationSlug(value));
    }
  };

  const handleOrganizationSlugChange = (value: string) => {
    const normalized = normalizeOrganizationSlug(value);
    setNewOrganizationSlug(normalized);
    setIsSlugManuallyEdited(normalized !== normalizeOrganizationSlug(newOrganizationName));
  };

  const StatusBadge = ({ status }: { status: OrganizationRecord["status"] }) => (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
        status === "active"
          ? "bg-green-100 text-green-700"
          : "bg-amber-100 text-amber-700"
      }`}
    >
      {status}
    </span>
  );

  const ActionButton = ({ org }: { org: OrganizationRecord }) => (
    <button
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        setPendingAction({ slug: org.slug, name: org.name, currentStatus: org.status });
      }}
      onMouseDown={(event) => {
        event.preventDefault();
        event.stopPropagation();
      }}
      disabled={isUpdatingStatus === org.slug}
      className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-50 ${
        org.status === "active"
          ? "border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100"
          : "border-green-200 bg-green-50 text-green-700 hover:bg-green-100"
      }`}
    >
      {isUpdatingStatus === org.slug
        ? "Updating..."
        : org.status === "active"
          ? "Suspend"
          : "Activate"}
    </button>
  );

  const DeleteButton = ({ org }: { org: OrganizationRecord }) => (
    <button
      type="button"
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        setPendingDeleteAction({
          slug: org.slug,
          name: org.name,
        });
      }}
      onMouseDown={(event) => {
        event.preventDefault();
        event.stopPropagation();
      }}
      disabled={isDeletingOrganization === org.slug}
      className="rounded-lg border border-rose-300 bg-rose-50 px-3 py-1.5 text-xs font-medium text-rose-700 transition-colors hover:bg-rose-100 disabled:opacity-50"
    >
      {isDeletingOrganization === org.slug ? "Deleting..." : "Delete"}
    </button>
  );

  const empty = (
    <div className="rounded-[28px] border border-dashed border-[var(--color-border)] bg-white/70 p-6 text-center">
      <Building2 className="mx-auto h-12 w-12 text-[var(--color-muted)]" />
      <h3 className="mt-4 text-lg font-semibold text-[var(--color-ink)]">No organizations</h3>
      <p className="mt-1 text-sm text-[var(--color-muted)]">Add your first organization to start managing tenants.</p>
      <button
        type="button"
        onClick={() => setIsCreateFormVisible(true)}
        className="theme-btn-primary mt-5 inline-flex h-10 items-center gap-2 rounded-xl px-4 text-sm font-medium"
      >
        <Plus className="h-4 w-4" />
        Add organization
      </button>
    </div>
  );

  const columns = useMemo<ColumnDef<OrganizationRecord>[]>(() => [
    {
      accessorKey: "name",
      header: "Organization",
      cell: ({ row }) => (
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-[var(--color-canvas)]">
            <Building2 className="h-4 w-4 text-[var(--color-brand-strong)]" />
          </div>
          <div className="min-w-0 space-y-0.5">
            <p className="truncate font-semibold text-[var(--color-ink)]">{row.original.name}</p>
            <p className="truncate text-xs text-[var(--color-muted)]">{row.original.slug}</p>
          </div>
        </div>
      ),
    },
    {
      accessorKey: "rootOwnerEmail",
      header: "Owner",
      cell: ({ row }) => (
        <p className="max-w-[220px] truncate text-sm text-[var(--color-muted)]">{row.original.rootOwnerEmail || "-"}</p>
      ),
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => <StatusBadge status={row.original.status} />,
    },
    {
      accessorKey: "createdAt",
      header: "Created",
      cell: ({ row }) => (
        <p className="text-sm text-[var(--color-muted)]">{new Date(row.original.createdAt).toLocaleDateString()}</p>
      ),
    },
    {
      id: "orgActions",
      header: "Actions",
      cell: ({ row }) => {
        const organization = row.original;

        return (
          <div className="flex justify-end gap-2">
            <ActionButton org={organization} />
            <DeleteButton org={organization} />
          </div>
        );
      },
    },
  ], [isDeletingOrganization, isUpdatingStatus]);

  return (
    <PortalShell
      portal="system"
      sessionEmail={sessionEmail}
      eyebrow="System"
      title="Organizations"
      subtitle="Manage all organizations and their settings"
    >
      <ConfirmDialog
        isOpen={!!pendingAction}
        title={pendingAction?.currentStatus === "active" ? "Suspend organization?" : "Activate organization?"}
        message={
          pendingAction?.currentStatus === "active"
            ? `"${pendingAction?.name}" will be suspended. Users won't be able to access it until reactivated.`
            : `"${pendingAction?.name}" will be reactivated and accessible to its users.`
        }
        confirmLabel={pendingAction?.currentStatus === "active" ? "Suspend" : "Activate"}
        loadingLabel="Updating..."
        tone={pendingAction?.currentStatus === "active" ? "danger" : "warning"}
        isLoading={isUpdatingStatus === pendingAction?.slug}
        onConfirm={confirmToggleStatus}
        onCancel={() => setPendingAction(null)}
      />
      <ConfirmDialog
        isOpen={!!pendingDeleteAction}
        title="Delete organization?"
        message={`"${pendingDeleteAction?.name}" will be permanently deleted with all organization memberships and branding settings.`}
        confirmLabel="Delete organization"
        loadingLabel="Deleting..."
        tone="danger"
        isLoading={isDeletingOrganization === pendingDeleteAction?.slug}
        onConfirm={confirmDeleteOrganization}
        onCancel={() => setPendingDeleteAction(null)}
      />

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-sm text-[var(--color-muted)]">
            Showing {loadedCount} organization{loadedCount !== 1 ? "s" : ""}
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsCreateFormVisible((current) => !current)}
              className="theme-btn-primary inline-flex h-10 items-center gap-2 rounded-xl px-4 text-sm font-medium"
            >
              <Plus className="h-4 w-4" />
              {isCreateFormVisible ? "Close" : "Add organization"}
            </button>
            <AdminViewModeToggle value={viewMode} onChange={setViewMode} />
          </div>
        </div>

        {isCreateFormVisible ? (
          <article className="rounded-[28px] border border-[var(--color-border-strong)] bg-[var(--color-panel)] p-5 shadow-[var(--shadow-soft)]">
            <h2 className="text-lg font-semibold text-[var(--color-ink)]">Create organization</h2>
            <p className="mt-2 text-sm text-[var(--color-muted)]">New tenant setup with an initial owner.</p>

            <form className="mt-4 space-y-3" onSubmit={handleCreateOrganization}>
              <input
                value={newOrganizationName}
                onChange={(event) => handleOrganizationNameChange(event.target.value)}
                placeholder="Organization name"
                required
                className="h-11 w-full rounded-xl border border-[var(--color-border)] bg-white px-3 text-sm outline-none focus:border-[var(--color-brand)]"
              />
              <input
                value={newOrganizationSlug}
                onChange={(event) => handleOrganizationSlugChange(event.target.value)}
                placeholder="Slug (auto-generated from name)"
                className="h-11 w-full rounded-xl border border-[var(--color-border)] bg-white px-3 text-sm outline-none focus:border-[var(--color-brand)]"
              />
              <input
                type="email"
                value={newOrganizationOwnerEmail}
                onChange={(event) => setNewOrganizationOwnerEmail(event.target.value)}
                placeholder="Owner email"
                required
                className="h-11 w-full rounded-xl border border-[var(--color-border)] bg-white px-3 text-sm outline-none focus:border-[var(--color-brand)]"
              />
              <p className="text-xs text-[var(--color-muted)]">
                Slug is generated from the name and can be edited manually.
              </p>
              <div className="flex flex-wrap gap-2">
                <button
                  type="submit"
                  disabled={isCreatingOrganization}
                  className="theme-btn-primary theme-action-button h-11 rounded-xl px-4 disabled:opacity-70"
                >
                  {isCreatingOrganization ? "Creating..." : "Create organization"}
                </button>
                <button
                  type="button"
                  disabled={isCreatingOrganization}
                  onClick={() => setIsCreateFormVisible(false)}
                  className="theme-action-button theme-action-button-secondary h-11 rounded-xl px-4 disabled:opacity-70"
                >
                  Cancel
                </button>
              </div>
            </form>
          </article>
        ) : null}

        {viewMode === "card" ? (
          /* ── Card view ── */
          <>
            {!isCardLoading && cardItems.length === 0 ? empty : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {cardItems.map((org) => (
                  <Link
                    key={org.slug}
                    href={`/system/organizations/${encodeURIComponent(org.slug)}`}
                    className="block rounded-[28px] border border-[var(--color-border-strong)] bg-[var(--color-panel)] p-5 shadow-[var(--shadow-soft)] transition hover:border-[var(--color-border)]"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-[var(--color-canvas)]">
                        <Building2 className="h-5 w-5 text-[var(--color-brand-strong)]" />
                      </div>
                      <StatusBadge status={org.status} />
                    </div>
                    <h3 className="mt-3 truncate font-semibold text-[var(--color-ink)]">{org.name}</h3>
                    <p className="mt-0.5 truncate text-xs text-[var(--color-muted)]">{org.slug}</p>
                    <p className="mt-1 truncate text-xs text-[var(--color-muted)]">{org.rootOwnerEmail || "-"}</p>
                    <p className="mt-2 text-xs text-[var(--color-muted)]">
                      Created {new Date(org.createdAt).toLocaleDateString()}
                    </p>
                    <div className="mt-4 flex flex-wrap gap-2 border-t border-[var(--color-border)] pt-3">
                      <ActionButton org={org} />
                      <DeleteButton org={org} />
                    </div>
                  </Link>
                ))}
              </div>
            )}

            {isCardLoading && cardItems.length === 0 ? (
              <div className="rounded-[24px] border border-[var(--color-border-strong)] bg-[var(--color-panel)] p-4 text-center text-sm text-[var(--color-muted)] shadow-[var(--shadow-soft)]">
                Loading organizations...
              </div>
            ) : null}

            <div ref={cardSentinelRef} />

            {isCardLoadingMore ? (
              <div className="rounded-[24px] border border-[var(--color-border-strong)] bg-[var(--color-panel)] p-4 text-center text-sm text-[var(--color-muted)] shadow-[var(--shadow-soft)]">
                Loading more organizations...
              </div>
            ) : null}
          </>
        ) : (
          <AdminDataTable
            data={tableItems}
            columns={columns}
            isLoading={isTableLoading}
            emptyMessage="No organizations found."
            pageIndex={pageIndex}
            pageSize={tablePageSize}
            pageSizeOptions={[10, 20, 50, 100]}
            canPreviousPage={canPreviousPage}
            canNextPage={canNextPage}
            onPreviousPage={goToPreviousPage}
            onNextPage={goToNextPage}
            onPageSizeChange={setTablePageSize}
            onRowClick={(organization) => {
              router.push(`/system/organizations/${encodeURIComponent(organization.slug)}`);
            }}
          />
        )}
      </div>
    </PortalShell>
  );
}
