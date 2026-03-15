"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import type { AdminCandidateListItem } from "../../lib/admin-list-types";
import type { PageInfo } from "../../lib/pagination";
import { AdminCandidatesCardView } from "./AdminCandidatesCardView";
import { AdminDataTable } from "./AdminDataTable";
import { AdminViewModeToggle } from "./AdminViewModeToggle";
import { PortalShell } from "./PortalShell";
import { usePersistedViewMode } from "./usePersistedViewMode";
import { useServerInfiniteList } from "./useServerInfiniteList";
import { useServerPagination } from "./useServerPagination";

type AdminCandidatesIndexProps = {
  sessionEmail: string;
  initialCandidates: AdminCandidateListItem[];
  initialPageInfo: PageInfo;
};

const createQueryString = ({
  limit,
  cursor,
  searchQuery,
  statusFilter,
}: {
  limit: number;
  cursor?: string;
  searchQuery: string;
  statusFilter: string;
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

  if (statusFilter !== "all") {
    params.set("status", statusFilter);
  }

  return params.toString();
};

export function AdminCandidatesIndex({
  sessionEmail,
  initialCandidates,
  initialPageInfo,
}: AdminCandidatesIndexProps) {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const { viewMode, setViewMode } = usePersistedViewMode("admin-candidates-view-mode", "card");
  const resetKey = `${searchQuery}|${statusFilter}`;

  const fetchPage = async (cursor?: string) => {
    const response = await fetch(`/api/admin/users?${createQueryString({
      limit: initialPageInfo.limit,
      cursor,
      searchQuery,
      statusFilter,
    })}`);
    const payload = await response.json().catch(() => ({
      items: [],
      pageInfo: { limit: initialPageInfo.limit, nextCursor: null, hasMore: false },
    }));

    if (!response.ok) {
      throw new Error(payload.message || "Failed to load candidates.");
    }

    return payload;
  };

  const {
    items,
    isLoading,
    pageIndex,
    canPreviousPage,
    canNextPage,
    goToNextPage,
    goToPreviousPage,
  } = useServerPagination<AdminCandidateListItem>({
    initialItems: initialCandidates,
    initialPageInfo,
    resetKey,
    loadPage: fetchPage,
  });

  const {
    items: cardItems,
    isLoading: isCardLoading,
    isLoadingMore: isCardLoadingMore,
    sentinelRef: cardSentinelRef,
  } = useServerInfiniteList<AdminCandidateListItem>({
    initialItems: initialCandidates,
    initialPageInfo,
    resetKey,
    loadPage: fetchPage,
  });

  const columns = useMemo<ColumnDef<AdminCandidateListItem>[]>(() => [
    {
      accessorKey: "email",
      header: "Candidate",
      cell: ({ row }) => (
        <div className="space-y-1">
          <div className="font-semibold text-[var(--color-ink)]">
            {[row.original.firstName, row.original.lastName].filter(Boolean).join(" ") || "Unnamed Candidate"}
          </div>
          <div className="text-xs text-[var(--color-muted)]">{row.original.email}</div>
          {row.original.phone && <div className="text-xs text-[var(--color-muted)]">{row.original.phone}</div>}
        </div>
      ),
    },
    {
      accessorKey: "idOrPassportNumber",
      header: "Identity",
      cell: ({ row }) => (
        <div className="space-y-1 text-xs text-[var(--color-muted)]">
          <div>{row.original.idOrPassportNumber || "Not provided"}</div>
          <div>
            Updated {row.original.updatedAt ? new Date(row.original.updatedAt).toLocaleDateString() : "Never"}
          </div>
        </div>
      ),
    },
    {
      accessorKey: "submissionCount",
      header: "Applications",
      cell: ({ row }) => (
        <div className="space-y-1">
          <div className="font-semibold text-[var(--color-ink)]">{row.original.submissionCount}</div>
          <div className="text-xs text-[var(--color-muted)]">
            {row.original.latestSubmissionAt
              ? `Latest ${new Date(row.original.latestSubmissionAt).toLocaleString()}`
              : "No submissions yet"}
          </div>
        </div>
      ),
    },
    {
      accessorKey: "latestReviewStatus",
      header: "Status",
      cell: ({ row }) => {
        const status = row.original.latestReviewStatus;
        const tone = status === "accepted"
          ? "bg-emerald-100 text-emerald-800"
          : status === "rejected"
            ? "bg-rose-100 text-rose-800"
            : status === "pending"
              ? "bg-amber-100 text-amber-800"
              : "bg-slate-100 text-slate-700";

        return (
          <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${tone}`}>
            {status === "none" ? "No submissions" : status.charAt(0).toUpperCase() + status.slice(1)}
          </span>
        );
      },
    },
  ], []);

  return (
    <PortalShell
      portal="admin"
      sessionEmail={sessionEmail}
      eyebrow="Candidates"
      title="Candidate directory"
      subtitle="Open each candidate to inspect profile data, submission history, and CV files."
      primaryActionHref="/admin/jobs"
      primaryActionLabel="View Jobs"
    >
      <section className="space-y-4">
        <div className="grid gap-3 rounded-[28px] border border-[var(--color-border-strong)] bg-[var(--color-panel)] p-5 shadow-[var(--shadow-soft)] md:grid-cols-[1fr_220px]">
          <input
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Search by name, email, phone, NIC/passport"
            className="h-12 rounded-2xl border border-[var(--color-border)] bg-white px-4 text-sm text-[var(--color-ink)] outline-none focus:border-[var(--color-brand)]"
          />
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            className="h-12 rounded-2xl border border-[var(--color-border)] bg-white px-4 text-sm text-[var(--color-ink)] outline-none focus:border-[var(--color-brand)]"
          >
            <option value="all">All statuses</option>
            <option value="accepted">Accepted</option>
            <option value="rejected">Rejected</option>
            <option value="pending">Pending</option>
            <option value="none">No submissions</option>
          </select>
        </div>

        <div className="flex justify-end">
          <AdminViewModeToggle value={viewMode} onChange={setViewMode} />
        </div>

        {viewMode === "table" ? (
          <AdminDataTable
            data={items}
            columns={columns}
            isLoading={isLoading}
            emptyMessage="No candidates match the current filters."
            pageIndex={pageIndex}
            canPreviousPage={canPreviousPage}
            canNextPage={canNextPage}
            onPreviousPage={goToPreviousPage}
            onNextPage={goToNextPage}
            onRowClick={(candidate) => router.push(`/admin/candidates/${encodeURIComponent(candidate.email)}`)}
          />
        ) : (
          <>
            <AdminCandidatesCardView items={cardItems} />
            {isCardLoading && cardItems.length === 0 ? (
              <div className="rounded-[24px] border border-[var(--color-border-strong)] bg-[var(--color-panel)] p-4 text-center text-sm text-[var(--color-muted)] shadow-[var(--shadow-soft)]">
                Loading candidates...
              </div>
            ) : null}
            <div ref={cardSentinelRef} />
            {isCardLoadingMore ? (
              <div className="rounded-[24px] border border-[var(--color-border-strong)] bg-[var(--color-panel)] p-4 text-center text-sm text-[var(--color-muted)] shadow-[var(--shadow-soft)]">
                Loading more candidates...
              </div>
            ) : null}
          </>
        )}
      </section>
    </PortalShell>
  );
}
