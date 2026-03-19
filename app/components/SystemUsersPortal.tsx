"use client";

import { FormEvent, useEffect, useState } from "react";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Search,
  ShieldCheck,
  Trash2,
  UserRound,
  Users,
} from "lucide-react";
import type { SuperAdminAccount } from "../../lib/super-admin-access";
import { AdminViewModeToggle } from "./AdminViewModeToggle";
import { ConfirmDialog } from "./ConfirmDialog";
import { PortalShell } from "./PortalShell";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./ui/table";
import { usePersistedViewMode } from "./usePersistedViewMode";
import { useToast } from "./ToastProvider";

type SystemUsersPortalProps = {
  sessionEmail: string;
  initialAccounts: SuperAdminAccount[];
};

type OwnershipFilter = "all" | "mine" | "others";
type SortOrder = "newest" | "oldest";

const PAGE_SIZE_OPTIONS = [6, 12, 24];

const formatDate = (value: string) =>
  new Date(value).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

const formatDateTime = (value: string) =>
  new Date(value).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

export function SystemUsersPortal({
  sessionEmail,
  initialAccounts,
}: SystemUsersPortalProps) {
  const { showToast } = useToast();
  const { viewMode, setViewMode } = usePersistedViewMode("system-super-admins-view", "table");
  const [accounts, setAccounts] = useState(initialAccounts);
  const [newEmail, setNewEmail] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [pendingDeleteEmail, setPendingDeleteEmail] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [ownershipFilter, setOwnershipFilter] = useState<OwnershipFilter>("all");
  const [sortOrder, setSortOrder] = useState<SortOrder>("newest");
  const [pageSize, setPageSize] = useState(PAGE_SIZE_OPTIONS[1]);
  const [pageIndex, setPageIndex] = useState(0);

  const filteredAccounts = [...accounts]
    .filter((account) => {
      const query = searchQuery.trim().toLowerCase();
      const matchesQuery = !query
        || account.email.toLowerCase().includes(query)
        || account.createdBy.toLowerCase().includes(query);
      const isMine = account.email === sessionEmail;
      const matchesOwnership = ownershipFilter === "all"
        || (ownershipFilter === "mine" && isMine)
        || (ownershipFilter === "others" && !isMine);

      return matchesQuery && matchesOwnership;
    })
    .sort((left, right) => {
      const leftTime = new Date(left.createdAt).getTime();
      const rightTime = new Date(right.createdAt).getTime();
      return sortOrder === "newest" ? rightTime - leftTime : leftTime - rightTime;
    });

  const totalAccounts = accounts.length;
  const yourAccountsCount = accounts.filter((account) => account.email === sessionEmail).length;
  const delegatedAccountsCount = Math.max(0, totalAccounts - yourAccountsCount);
  const totalPages = Math.max(1, Math.ceil(filteredAccounts.length / pageSize));

  useEffect(() => {
    if (pageIndex > totalPages - 1) {
      setPageIndex(Math.max(0, totalPages - 1));
    }
  }, [pageIndex, totalPages]);

  const paginatedAccounts = filteredAccounts.slice(
    pageIndex * pageSize,
    pageIndex * pageSize + pageSize,
  );
  const pageStart = filteredAccounts.length === 0 ? 0 : pageIndex * pageSize + 1;
  const pageEnd = Math.min(filteredAccounts.length, (pageIndex + 1) * pageSize);

  const resetToFirstPage = () => setPageIndex(0);

  const handleAdd = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const email = newEmail.trim().toLowerCase();
    if (!email) return;

    setIsAdding(true);
    try {
      const response = await fetch("/api/super-admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const payload = await response.json().catch(() => ({ message: "Request failed." }));

      if (!response.ok) {
        showToast(payload.message || "Failed to add super admin.", "error");
        return;
      }

      setAccounts((prev) => [payload.item, ...prev]);
      setNewEmail("");
      resetToFirstPage();
      showToast(`Super admin access granted to ${email}.`);
    } catch {
      showToast("Something went wrong.", "error");
    } finally {
      setIsAdding(false);
    }
  };

  const handleDelete = async () => {
    if (!pendingDeleteEmail) return;
    const email = pendingDeleteEmail;

    setIsDeleting(true);
    try {
      const response = await fetch("/api/super-admin/users", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const payload = await response.json().catch(() => ({ message: "Request failed." }));

      if (!response.ok) {
        showToast(payload.message || "Failed to remove super admin.", "error");
        return;
      }

      setAccounts((prev) => prev.filter((account) => account.email !== email));
      showToast(`Super admin access removed for ${email}.`);
    } catch {
      showToast("Something went wrong.", "error");
    } finally {
      setIsDeleting(false);
      setPendingDeleteEmail(null);
    }
  };

  const renderPagination = () => (
    <div className="flex flex-col gap-3 border-t border-[var(--color-border)] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="text-sm text-[var(--color-muted)]">
        Showing {pageStart}-{pageEnd} of {filteredAccounts.length}
      </div>
      <div className="flex flex-wrap items-center gap-2 sm:justify-end">
        <label className="flex items-center gap-2 text-sm text-[var(--color-muted)]">
          <span>Rows</span>
          <select
            value={pageSize}
            onChange={(event) => {
              setPageSize(Number(event.target.value));
              resetToFirstPage();
            }}
            className="h-10 rounded-xl border border-[var(--color-border)] bg-white px-3 text-sm text-[var(--color-ink)] outline-none focus:border-[var(--color-brand-strong)]"
          >
            {PAGE_SIZE_OPTIONS.map((option) => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
        </label>
        <div className="text-sm text-[var(--color-muted)]">
          Page {totalPages === 0 ? 0 : pageIndex + 1} of {totalPages}
        </div>
        <button
          type="button"
          onClick={() => setPageIndex((current) => Math.max(0, current - 1))}
          disabled={pageIndex === 0}
          className="theme-action-button theme-action-button-secondary inline-flex h-10 items-center rounded-xl px-3 disabled:opacity-50"
        >
          <ChevronLeft className="mr-1 h-4 w-4" />
          Previous
        </button>
        <button
          type="button"
          onClick={() => setPageIndex((current) => Math.min(totalPages - 1, current + 1))}
          disabled={pageIndex >= totalPages - 1 || filteredAccounts.length === 0}
          className="theme-action-button theme-action-button-secondary inline-flex h-10 items-center rounded-xl px-3 disabled:opacity-50"
        >
          Next
          <ChevronRight className="ml-1 h-4 w-4" />
        </button>
      </div>
    </div>
  );

  return (
    <PortalShell
      portal="system"
      sessionEmail={sessionEmail}
      eyebrow="System"
      title="Super Admins"
      subtitle="Manage accounts with system-level access."
    >
      {pendingDeleteEmail && (
        <ConfirmDialog
          isOpen={!!pendingDeleteEmail}
          title="Remove super admin access"
          message={`Are you sure you want to remove super admin access for ${pendingDeleteEmail}? This cannot be undone.`}
          confirmLabel="Remove"
          tone="danger"
          onConfirm={handleDelete}
          onCancel={() => setPendingDeleteEmail(null)}
          isLoading={isDeleting}
        />
      )}

      <div className="space-y-6">
        <section className="grid gap-4 xl:grid-cols-[minmax(0,1.6fr)_minmax(340px,0.9fr)]">
          <article className="rounded-[28px] border border-[var(--color-border-strong)] bg-[var(--color-panel)] p-6 shadow-[var(--shadow-soft)]">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="max-w-2xl">
                <div className="inline-flex items-center gap-2 rounded-full border border-[var(--color-border-strong)] bg-white/85 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-brand-strong)]">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  Access Control
                </div>
                <h2 className="mt-4 text-2xl font-semibold tracking-tight text-[var(--color-ink)]">
                  System-level access management
                </h2>
                <p className="mt-2 max-w-xl text-sm leading-6 text-[var(--color-muted)]">
                  Review every super admin account, switch between card and table layouts, and filter the list before making access changes.
                </p>
              </div>
              <div className="rounded-[24px] border border-[var(--color-border)] bg-white px-4 py-3 text-right">
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-muted)]">
                  Visible Results
                </div>
                <div className="mt-2 text-3xl font-semibold text-[var(--color-ink)]">
                  {filteredAccounts.length}
                </div>
              </div>
            </div>

            <div className="mt-6 grid gap-3 md:grid-cols-3">
              <article className="rounded-[22px] border border-[var(--color-border)] bg-white p-4">
                <div className="flex items-center gap-3">
                  <div className="rounded-2xl bg-[var(--color-panel-strong)] p-3 text-[var(--color-brand-strong)]">
                    <Users className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-muted)]">
                      Total Accounts
                    </p>
                    <p className="mt-1 text-2xl font-semibold text-[var(--color-ink)]">{totalAccounts}</p>
                  </div>
                </div>
              </article>

              <article className="rounded-[22px] border border-[var(--color-border)] bg-white p-4">
                <div className="flex items-center gap-3">
                  <div className="rounded-2xl bg-[var(--color-panel-strong)] p-3 text-[var(--color-brand-strong)]">
                    <UserRound className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-muted)]">
                      Your Access
                    </p>
                    <p className="mt-1 text-2xl font-semibold text-[var(--color-ink)]">{yourAccountsCount}</p>
                  </div>
                </div>
              </article>

              <article className="rounded-[22px] border border-[var(--color-border)] bg-white p-4">
                <div className="flex items-center gap-3">
                  <div className="rounded-2xl bg-[var(--color-panel-strong)] p-3 text-[var(--color-brand-strong)]">
                    <CalendarDays className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-muted)]">
                      Delegated Access
                    </p>
                    <p className="mt-1 text-2xl font-semibold text-[var(--color-ink)]">
                      {delegatedAccountsCount}
                    </p>
                  </div>
                </div>
              </article>
            </div>
          </article>

          <article className="rounded-[28px] border border-[var(--color-border-strong)] bg-[var(--color-panel)] p-6 shadow-[var(--shadow-soft)]">
            <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-[var(--color-brand-strong)]">
              Grant Super Admin Access
            </h2>
            <p className="mt-2 text-sm leading-6 text-[var(--color-muted)]">
              Add a trusted operator with full system administration privileges.
            </p>
            <form className="mt-5 space-y-4" onSubmit={handleAdd}>
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-[var(--color-ink)]">Work email</span>
                <input
                  type="email"
                  required
                  value={newEmail}
                  onChange={(event) => setNewEmail(event.target.value)}
                  placeholder="admin@example.com"
                  className="h-12 w-full rounded-2xl border border-[var(--color-border)] bg-white px-4 text-sm text-[var(--color-ink)] outline-none transition focus:border-[var(--color-brand-strong)] focus:ring-4 focus:ring-[var(--color-focus-ring)]"
                />
              </label>
              <button
                type="submit"
                disabled={isAdding}
                className="theme-btn-primary flex h-12 w-full items-center justify-center rounded-2xl text-sm font-medium disabled:opacity-70"
              >
                {isAdding ? "Adding..." : "Add Super Admin"}
              </button>
            </form>
          </article>
        </section>

        <section className="rounded-[28px] border border-[var(--color-border-strong)] bg-[var(--color-panel)] shadow-[var(--shadow-soft)]">
          <div className="border-b border-[var(--color-border)] px-5 py-5 sm:px-6">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-[var(--color-ink)]">Accounts Directory</h2>
                <p className="mt-1 text-sm text-[var(--color-muted)]">
                  Search, filter, and switch layouts for super admin accounts.
                </p>
              </div>
              <AdminViewModeToggle value={viewMode} onChange={setViewMode} />
            </div>

            <div className="mt-5 grid gap-3 lg:grid-cols-[minmax(0,1.3fr)_220px_220px]">
              <label className="relative block">
                <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-muted)]" />
                <input
                  type="search"
                  value={searchQuery}
                  onChange={(event) => {
                    setSearchQuery(event.target.value);
                    resetToFirstPage();
                  }}
                  placeholder="Search by email or invited by"
                  className="h-12 w-full rounded-2xl border border-[var(--color-border)] bg-white pl-11 pr-4 text-sm text-[var(--color-ink)] outline-none transition focus:border-[var(--color-brand-strong)] focus:ring-4 focus:ring-[var(--color-focus-ring)]"
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-muted)]">
                  Filter
                </span>
                <select
                  value={ownershipFilter}
                  onChange={(event) => {
                    setOwnershipFilter(event.target.value as OwnershipFilter);
                    resetToFirstPage();
                  }}
                  className="h-12 w-full rounded-2xl border border-[var(--color-border)] bg-white px-4 text-sm text-[var(--color-ink)] outline-none transition focus:border-[var(--color-brand-strong)]"
                >
                  <option value="all">All accounts</option>
                  <option value="mine">My account</option>
                  <option value="others">Other accounts</option>
                </select>
              </label>

              <label className="block">
                <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-muted)]">
                  Sort
                </span>
                <select
                  value={sortOrder}
                  onChange={(event) => {
                    setSortOrder(event.target.value as SortOrder);
                    resetToFirstPage();
                  }}
                  className="h-12 w-full rounded-2xl border border-[var(--color-border)] bg-white px-4 text-sm text-[var(--color-ink)] outline-none transition focus:border-[var(--color-brand-strong)]"
                >
                  <option value="newest">Newest first</option>
                  <option value="oldest">Oldest first</option>
                </select>
              </label>
            </div>
          </div>

          {paginatedAccounts.length === 0 ? (
            <div className="px-6 py-16 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-[20px] bg-[var(--color-panel-strong)] text-[var(--color-brand-strong)]">
                <ShieldCheck className="h-6 w-6" />
              </div>
              <h3 className="mt-4 text-lg font-semibold text-[var(--color-ink)]">No matching accounts</h3>
              <p className="mt-2 text-sm text-[var(--color-muted)]">
                Try a different search or filter to find a super admin account.
              </p>
            </div>
          ) : viewMode === "card" ? (
            <>
              <div className="grid gap-4 p-5 sm:p-6 lg:grid-cols-2">
                {paginatedAccounts.map((account) => {
                  const isCurrentUser = account.email === sessionEmail;

                  return (
                    <article
                      key={account.email}
                      className="rounded-[24px] border border-[var(--color-border-strong)] bg-white p-5 shadow-sm"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="truncate text-base font-semibold text-[var(--color-ink)]">
                              {account.email}
                            </h3>
                            <span
                              className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                                isCurrentUser
                                  ? "theme-badge-brand"
                                  : "bg-[var(--color-panel-strong)] text-[var(--color-brand-strong)]"
                              }`}
                            >
                              {isCurrentUser ? "You" : "Super admin"}
                            </span>
                          </div>
                          <p className="mt-3 text-sm text-[var(--color-muted)]">
                            Added by <span className="font-medium text-[var(--color-ink)]">{account.createdBy}</span>
                          </p>
                          <p className="mt-1 text-sm text-[var(--color-muted)]">
                            Created {formatDateTime(account.createdAt)}
                          </p>
                        </div>

                        {!isCurrentUser ? (
                          <button
                            type="button"
                            onClick={() => setPendingDeleteEmail(account.email)}
                            className="theme-action-button theme-action-button-danger inline-flex h-10 items-center rounded-xl px-3"
                            aria-label={`Remove ${account.email}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        ) : null}
                      </div>
                    </article>
                  );
                })}
              </div>
              {renderPagination()}
            </>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table className="min-w-[760px]">
                  <TableHeader className="bg-white/70">
                    <TableRow className="hover:bg-transparent">
                      <TableHead>Account</TableHead>
                      <TableHead>Added By</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedAccounts.map((account) => {
                      const isCurrentUser = account.email === sessionEmail;

                      return (
                        <TableRow key={account.email}>
                          <TableCell>
                            <div className="min-w-0">
                              <div className="truncate font-medium text-[var(--color-ink)]">{account.email}</div>
                              <div className="mt-1 text-xs text-[var(--color-muted)]">
                                {isCurrentUser ? "Current signed-in account" : "System super admin"}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm text-[var(--color-ink)]">{account.createdBy}</div>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm text-[var(--color-ink)]">{formatDate(account.createdAt)}</div>
                            <div className="mt-1 text-xs text-[var(--color-muted)]">{formatDateTime(account.createdAt)}</div>
                          </TableCell>
                          <TableCell>
                            <span
                              className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${
                                isCurrentUser
                                  ? "theme-badge-brand"
                                  : "bg-[var(--color-panel-strong)] text-[var(--color-brand-strong)]"
                              }`}
                            >
                              {isCurrentUser ? "You" : "Active"}
                            </span>
                          </TableCell>
                          <TableCell className="text-right">
                            {isCurrentUser ? (
                              <span className="text-sm text-[var(--color-muted)]">Protected</span>
                            ) : (
                              <button
                                type="button"
                                onClick={() => setPendingDeleteEmail(account.email)}
                                className="theme-action-button theme-action-button-danger inline-flex h-10 items-center rounded-xl px-3"
                                aria-label={`Remove ${account.email}`}
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Remove
                              </button>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
              {renderPagination()}
            </>
          )}
        </section>
      </div>
    </PortalShell>
  );
}
