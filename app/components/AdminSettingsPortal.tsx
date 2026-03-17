"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { Pencil, Trash2 } from "lucide-react";
import { FormEvent, useCallback, useMemo, useState } from "react";
import type { AdminAccount } from "../../lib/admin-access";
import type { PageInfo } from "../../lib/pagination";
import { AdminAccountsCardView } from "./AdminAccountsCardView";
import { AdminDataTable } from "./AdminDataTable";
import { AdminViewModeToggle } from "./AdminViewModeToggle";
import { ConfirmDialog } from "./ConfirmDialog";
import { LoadingOverlay } from "./LoadingOverlay";
import { PortalShell } from "./PortalShell";
import { usePersistedViewMode } from "./usePersistedViewMode";
import { useServerInfiniteList } from "./useServerInfiniteList";
import { useServerPagination } from "./useServerPagination";
import { useToast } from "./ToastProvider";

type AdminSettingsPortalProps = {
  sessionEmail: string;
  initialAdmins: AdminAccount[];
  initialPageInfo: PageInfo;
};

const createQueryString = ({
  limit,
  cursor,
  searchQuery,
}: {
  limit: number;
  cursor?: string;
  searchQuery: string;
}) => {
  const params = new URLSearchParams({
    limit: String(limit),
  });

  if (cursor) {
    params.set("cursor", cursor);
  }

  if (searchQuery.trim()) {
    params.set("q", searchQuery.trim());
  }

  return params.toString();
};

export function AdminSettingsPortal({
  sessionEmail,
  initialAdmins,
  initialPageInfo,
}: AdminSettingsPortalProps) {
  const [adminEmail, setAdminEmail] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [tablePageSize, setTablePageSize] = useState(initialPageInfo.limit);
  const [isCreatingAdmin, setIsCreatingAdmin] = useState(false);
  const [editingEmail, setEditingEmail] = useState<string | null>(null);
  const [editedEmail, setEditedEmail] = useState("");
  const [busyAdminEmail, setBusyAdminEmail] = useState<string | null>(null);
  const [pendingDeleteAdminEmail, setPendingDeleteAdminEmail] = useState<string | null>(null);
  const { viewMode, setViewMode } = usePersistedViewMode("admin-settings-view-mode", "table");
  const { showToast } = useToast();
  const resetKey = `${searchQuery}|${tablePageSize}`;

  const fetchPage = useCallback(async (cursor?: string) => {
    const response = await fetch(`/api/admin/admins?${createQueryString({
      limit: tablePageSize,
      cursor,
      searchQuery,
    })}`);
    const payload = await response.json().catch(() => ({
      items: [],
      pageInfo: { limit: tablePageSize, nextCursor: null, hasMore: false },
    }));

    if (!response.ok) {
      throw new Error(payload.message || "Failed to load admins.");
    }

    return payload;
  }, [searchQuery, tablePageSize]);

  const {
    items,
    setItems,
    isLoading,
    pageIndex,
    canPreviousPage,
    canNextPage,
    goToNextPage,
    goToPreviousPage,
  } = useServerPagination<AdminAccount>({
    initialItems: initialAdmins,
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
  } = useServerInfiniteList<AdminAccount>({
    initialItems: initialAdmins,
    initialPageInfo,
    resetKey,
    loadPage: fetchPage,
  });

  const handleCreateAdmin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsCreatingAdmin(true);

    try {
      const response = await fetch("/api/admin/admins", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: adminEmail }),
      });

      const payload = await response.json().catch(() => ({ message: "Failed to create admin." }));

      if (!response.ok) {
        showToast(payload.message || "Failed to create admin.", "error");
        return;
      }

      setItems((current) => [payload.item as AdminAccount, ...current]);
      setCardItems((current) => [payload.item as AdminAccount, ...current]);
      setAdminEmail("");
      showToast(payload.message || "Admin account created successfully.");
    } catch {
      showToast("Something went wrong while creating the admin.", "error");
    } finally {
      setIsCreatingAdmin(false);
    }
  };

  const startEditingAdmin = (email: string) => {
    setEditingEmail(email);
    setEditedEmail(email);
  };

  const cancelEditingAdmin = useCallback(() => {
    setEditingEmail(null);
    setEditedEmail("");
  }, []);

  const handleUpdateAdmin = useCallback(async (currentEmail: string) => {
    setBusyAdminEmail(currentEmail);

    try {
      const response = await fetch(`/api/admin/admins/${encodeURIComponent(currentEmail)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: editedEmail }),
      });

      const payload = await response.json().catch(() => ({ message: "Failed to update admin." }));

      if (!response.ok) {
        showToast(payload.message || "Failed to update admin.", "error");
        return;
      }

      setItems((current) => current.map((item) => (
        item.email === currentEmail ? payload.item as AdminAccount : item
      )));
      setCardItems((current) => current.map((item) => (
        item.email === currentEmail ? payload.item as AdminAccount : item
      )));
      cancelEditingAdmin();
      showToast(payload.message || "Admin account updated successfully.");
    } catch {
      showToast("Something went wrong while updating the admin.", "error");
    } finally {
      setBusyAdminEmail(null);
    }
  }, [cancelEditingAdmin, editedEmail, setCardItems, setItems, showToast]);

  const handleDeleteAdmin = async (email: string) => {
    if (email === sessionEmail) {
      showToast("You cannot delete your own admin account.", "warning");
      return;
    }

    setBusyAdminEmail(email);

    try {
      const response = await fetch(`/api/admin/admins/${encodeURIComponent(email)}`, {
        method: "DELETE",
      });

      const payload = await response.json().catch(() => ({ message: "Failed to delete admin." }));

      if (!response.ok) {
        showToast(payload.message || "Failed to delete admin.", "error");
        return;
      }

      setItems((current) => current.filter((item) => item.email !== email));
      setCardItems((current) => current.filter((item) => item.email !== email));
      if (editingEmail === email) {
        cancelEditingAdmin();
      }
      showToast(payload.message || "Admin account deleted successfully.");
    } catch {
      showToast("Something went wrong while deleting the admin.", "error");
    } finally {
      setBusyAdminEmail(null);
    }
  };

  const columns = useMemo<ColumnDef<AdminAccount>[]>(() => [
    {
      accessorKey: "email",
      header: "Admin",
      cell: ({ row }) => (
        <div className="space-y-1">
          <div className="font-semibold text-[var(--color-ink)]">{row.original.email}</div>
          <div className="text-xs text-[var(--color-muted)]">Added by {row.original.createdBy}</div>
        </div>
      ),
    },
    {
      accessorKey: "createdAt",
      header: "Created",
      cell: ({ row }) => (
        <div className="text-sm text-[var(--color-muted)]">
          {new Date(row.original.createdAt).toLocaleString()}
        </div>
      ),
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => {
        const admin = row.original;

        return editingEmail === admin.email ? (
          <div className="flex flex-wrap justify-end gap-2">
            <input
              value={editedEmail}
              onChange={(event) => setEditedEmail(event.target.value)}
              placeholder="admin@example.com"
              className="h-10 min-w-64 rounded-xl border border-[var(--color-border)] bg-white px-3 text-sm outline-none focus:border-[var(--color-brand)]"
            />
            <button
              type="button"
              onClick={() => void handleUpdateAdmin(admin.email)}
              disabled={busyAdminEmail === admin.email}
              className="theme-btn-primary rounded-xl px-3 py-2 text-sm font-medium disabled:opacity-70"
            >
              Save
            </button>
            <button
              type="button"
              onClick={cancelEditingAdmin}
              disabled={busyAdminEmail === admin.email}
              className="rounded-xl border border-[var(--color-border)] px-3 py-2 text-sm font-medium text-[var(--color-ink)]"
            >
              Cancel
            </button>
          </div>
        ) : (
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => startEditingAdmin(admin.email)}
              disabled={busyAdminEmail === admin.email}
              aria-label={`Edit ${admin.email}`}
              title="Edit admin"
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--color-border)] bg-white text-[var(--color-ink)] transition hover:border-[var(--color-border-strong)] disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Pencil className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setPendingDeleteAdminEmail(admin.email)}
              disabled={busyAdminEmail === admin.email || admin.email === sessionEmail}
              aria-label={admin.email === sessionEmail ? `Cannot delete ${admin.email}` : `Delete ${admin.email}`}
              title={admin.email === sessionEmail ? "You cannot delete your own admin account" : "Delete admin"}
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-rose-300 bg-white text-rose-700 transition hover:border-rose-400 hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        );
      },
    },
  ], [busyAdminEmail, cancelEditingAdmin, editedEmail, editingEmail, handleUpdateAdmin, sessionEmail]);

  return (
    <PortalShell
      portal="admin"
      sessionEmail={sessionEmail}
      eyebrow="Settings"
      title="Admin access settings"
      subtitle="Manage who can access the admin portal."
      primaryActionHref="/admin/jobs/new"
      primaryActionLabel="Create Job"
    >
      {(isCreatingAdmin || Boolean(busyAdminEmail)) && (
        <LoadingOverlay
          title={isCreatingAdmin ? "Adding admin" : "Updating admin access"}
          message={isCreatingAdmin ? "Saving the new admin account." : "Applying admin access changes."}
        />
      )}
      <div className="space-y-4">
        <section className="rounded-[28px] border border-[var(--color-border-strong)] bg-[var(--color-panel)] p-6 shadow-[var(--shadow-soft)]">
          <h2 className="text-xl font-semibold text-[var(--color-ink)]">Add another admin</h2>
          <p className="mt-2 text-sm text-[var(--color-muted)]">
            Existing admins can grant admin access directly from this page.
          </p>
          <form className="mt-5 grid gap-3 md:grid-cols-[1fr_auto]" onSubmit={handleCreateAdmin}>
            <input
              value={adminEmail}
              onChange={(event) => setAdminEmail(event.target.value)}
              placeholder="admin@example.com"
              className="h-12 rounded-2xl border border-[var(--color-border)] bg-white px-4 text-sm outline-none focus:border-[var(--color-brand)] focus:ring-4 focus:ring-[rgba(212,138,57,0.16)]"
            />
            <button
              type="submit"
              disabled={isCreatingAdmin}
              className="h-12 rounded-2xl bg-[var(--color-sidebar-accent)] px-5 text-sm font-medium text-[var(--color-sidebar-accent-ink)] disabled:opacity-70"
            >
              {isCreatingAdmin ? "Adding..." : "Add Admin"}
            </button>
          </form>
        </section>

        <section className="space-y-4">
          <div className="grid gap-3 rounded-[28px] border border-[var(--color-border-strong)] bg-[var(--color-panel)] p-5 shadow-[var(--shadow-soft)]">
            <input
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search by admin email or creator"
              className="h-12 rounded-2xl border border-[var(--color-border)] bg-white px-4 text-sm text-[var(--color-ink)] outline-none focus:border-[var(--color-brand)]"
            />
          </div>

          <div className="flex justify-end">
            <AdminViewModeToggle value={viewMode} onChange={setViewMode} />
          </div>

          {viewMode === "table" ? (
            <AdminDataTable
              data={items}
              columns={columns}
              isLoading={isLoading}
              emptyMessage="No admins match the current search."
              pageIndex={pageIndex}
              pageSize={tablePageSize}
              canPreviousPage={canPreviousPage}
              canNextPage={canNextPage}
              onPreviousPage={goToPreviousPage}
              onNextPage={goToNextPage}
              onPageSizeChange={setTablePageSize}
            />
          ) : (
            <>
              <AdminAccountsCardView
                items={cardItems}
                sessionEmail={sessionEmail}
                editingEmail={editingEmail}
                editedEmail={editedEmail}
                busyAdminEmail={busyAdminEmail}
                onEditedEmailChange={setEditedEmail}
                onStartEdit={startEditingAdmin}
                onCancelEdit={cancelEditingAdmin}
                onSave={(email) => void handleUpdateAdmin(email)}
                onDelete={setPendingDeleteAdminEmail}
              />
              {isCardLoading && cardItems.length === 0 ? (
                <div className="rounded-[24px] border border-[var(--color-border-strong)] bg-[var(--color-panel)] p-4 text-center text-sm text-[var(--color-muted)] shadow-[var(--shadow-soft)]">
                  Loading admins...
                </div>
              ) : null}
              <div ref={cardSentinelRef} />
              {isCardLoadingMore ? (
                <div className="rounded-[24px] border border-[var(--color-border-strong)] bg-[var(--color-panel)] p-4 text-center text-sm text-[var(--color-muted)] shadow-[var(--shadow-soft)]">
                  Loading more admins...
                </div>
              ) : null}
            </>
          )}
        </section>
      </div>

      <ConfirmDialog
        isOpen={Boolean(pendingDeleteAdminEmail)}
        title="Delete admin account?"
        message="This removes admin access for the selected account."
        confirmLabel="Delete"
        onConfirm={async () => {
          if (!pendingDeleteAdminEmail) {
            return;
          }
          await handleDeleteAdmin(pendingDeleteAdminEmail);
          setPendingDeleteAdminEmail(null);
        }}
        onCancel={() => setPendingDeleteAdminEmail(null)}
      />
    </PortalShell>
  );
}
