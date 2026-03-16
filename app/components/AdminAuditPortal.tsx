"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { useCallback, useMemo, useState } from "react";
import type { AdminAccount } from "../../lib/admin-access";
import type { AdminAuditLogRecord } from "../../lib/audit-log";
import type { PageInfo } from "../../lib/pagination";
import { AdminAuditCardView } from "./AdminAuditCardView";
import { AdminDataTable } from "./AdminDataTable";
import { AdminViewModeToggle } from "./AdminViewModeToggle";
import { PortalShell } from "./PortalShell";
import { usePersistedViewMode } from "./usePersistedViewMode";
import { useServerInfiniteList } from "./useServerInfiniteList";
import { useServerPagination } from "./useServerPagination";

type AdminAuditPortalProps = {
  sessionEmail: string;
  admins: AdminAccount[];
  initialLogs: AdminAuditLogRecord[];
  initialPageInfo: PageInfo;
};

const formatAction = (value: string) => {
  return value.replace(/[._-]+/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
};

const formatJson = (value: Record<string, unknown> | null) => {
  if (!value) {
    return "";
  }

  return JSON.stringify(value, null, 2);
};

const createQueryString = ({
  limit,
  cursor,
  actorFilter,
  searchQuery,
}: {
  limit: number;
  cursor?: string;
  actorFilter: string;
  searchQuery: string;
}) => {
  const params = new URLSearchParams({
    limit: String(limit),
  });

  if (cursor) {
    params.set("cursor", cursor);
  }

  if (actorFilter !== "all") {
    params.set("actorEmail", actorFilter);
  }

  if (searchQuery.trim()) {
    params.set("q", searchQuery.trim());
  }

  return params.toString();
};

export function AdminAuditPortal({
  sessionEmail,
  admins,
  initialLogs,
  initialPageInfo,
}: AdminAuditPortalProps) {
  const [actorFilter, setActorFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [tablePageSize, setTablePageSize] = useState(initialPageInfo.limit);
  const [selectedRecord, setSelectedRecord] = useState<AdminAuditLogRecord | null>(null);
  const { viewMode, setViewMode } = usePersistedViewMode("admin-audit-view-mode", "table");
  const resetKey = `${actorFilter}|${searchQuery}|${tablePageSize}`;

  const fetchPage = useCallback(async (cursor?: string) => {
    const response = await fetch(`/api/admin/audit?${createQueryString({
      limit: tablePageSize,
      cursor,
      actorFilter,
      searchQuery,
    })}`);
    const payload = await response.json().catch(() => ({
      items: [],
      pageInfo: { limit: tablePageSize, nextCursor: null, hasMore: false },
    }));

    if (!response.ok) {
      throw new Error(payload.message || "Failed to load audit logs.");
    }

    return payload;
  }, [actorFilter, searchQuery, tablePageSize]);

  const {
    items,
    isLoading,
    pageIndex,
    canPreviousPage,
    canNextPage,
    goToNextPage,
    goToPreviousPage,
  } = useServerPagination<AdminAuditLogRecord>({
    initialItems: initialLogs,
    initialPageInfo,
    resetKey,
    loadPage: fetchPage,
  });

  const {
    items: cardItems,
    isLoading: isCardLoading,
    isLoadingMore: isCardLoadingMore,
    sentinelRef: cardSentinelRef,
  } = useServerInfiniteList<AdminAuditLogRecord>({
    initialItems: initialLogs,
    initialPageInfo,
    resetKey,
    loadPage: fetchPage,
  });

  const columns = useMemo<ColumnDef<AdminAuditLogRecord>[]>(() => [
    {
      accessorKey: "action",
      header: "Action",
      cell: ({ row }) => (
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-[var(--color-panel-strong)] px-2.5 py-1 text-xs font-semibold text-[var(--color-ink)]">
              {formatAction(row.original.action)}
            </span>
            {row.original.targetType && (
              <span className="rounded-full border border-[var(--color-border)] px-2.5 py-1 text-xs font-semibold text-[var(--color-muted)]">
                {row.original.targetType}
              </span>
            )}
          </div>
          <div className="max-w-xl text-sm font-medium text-[var(--color-ink)]">
            {row.original.summary}
          </div>
        </div>
      ),
    },
    {
      accessorKey: "actorEmail",
      header: "Actor",
      cell: ({ row }) => (
        <div className="space-y-1 text-sm text-[var(--color-ink)]">
          <div>{row.original.actorEmail}</div>
          <div className="text-xs text-[var(--color-muted)]">
            {new Date(row.original.createdAt).toLocaleString()}
          </div>
        </div>
      ),
    },
    {
      id: "request",
      header: "Request",
      cell: ({ row }) => (
        <div className="space-y-1 text-xs text-[var(--color-muted)]">
          <div>{[row.original.requestMethod, row.original.requestPath].filter(Boolean).join(" ") || "No request metadata"}</div>
          <div className="break-all">{row.original.targetId || "No target id"}</div>
        </div>
      ),
    },
  ], []);

  return (
    <PortalShell
      portal="admin"
      sessionEmail={sessionEmail}
      eyebrow="Audit"
      title="Admin audit trail"
      subtitle="Immutable activity history for admin actions and sensitive CV access."
      primaryActionHref="/admin/settings"
      primaryActionLabel="Admin Settings"
    >
      <div className="space-y-4">
        <div className="grid gap-3 rounded-[28px] border border-[var(--color-border-strong)] bg-[var(--color-panel)] p-5 shadow-[var(--shadow-soft)] md:grid-cols-[240px_1fr]">
          <select
            value={actorFilter}
            onChange={(event) => setActorFilter(event.target.value)}
            className="h-12 rounded-2xl border border-[var(--color-border)] bg-white px-4 text-sm text-[var(--color-ink)] outline-none focus:border-[var(--color-brand)]"
          >
            <option value="all">All admins</option>
            {admins.map((admin) => (
              <option key={admin.email} value={admin.email}>{admin.email}</option>
            ))}
          </select>
          <input
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Search action, path, target, JSON"
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
            emptyMessage="No audit events found for the selected filter."
            pageIndex={pageIndex}
            pageSize={tablePageSize}
            canPreviousPage={canPreviousPage}
            canNextPage={canNextPage}
            onPreviousPage={goToPreviousPage}
            onNextPage={goToNextPage}
            onPageSizeChange={setTablePageSize}
            onRowClick={setSelectedRecord}
          />
        ) : (
          <>
            <AdminAuditCardView items={cardItems} />
            {isCardLoading && cardItems.length === 0 ? (
              <div className="rounded-[24px] border border-[var(--color-border-strong)] bg-[var(--color-panel)] p-4 text-center text-sm text-[var(--color-muted)] shadow-[var(--shadow-soft)]">
                Loading audit logs...
              </div>
            ) : null}
            <div ref={cardSentinelRef} />
            {isCardLoadingMore ? (
              <div className="rounded-[24px] border border-[var(--color-border-strong)] bg-[var(--color-panel)] p-4 text-center text-sm text-[var(--color-muted)] shadow-[var(--shadow-soft)]">
                Loading more audit logs...
              </div>
            ) : null}
          </>
        )}
      </div>

      {selectedRecord ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(5,20,10,0.48)] px-4 py-6">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="admin-audit-details-title"
            className="flex h-[min(92vh,920px)] w-full max-w-5xl flex-col overflow-hidden rounded-[28px] border border-[var(--color-border-strong)] bg-[var(--color-panel)] shadow-[var(--shadow-soft)]"
          >
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--color-border)] px-6 py-5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--color-brand-strong)]">
                  Audit Event
                </p>
                <h3 id="admin-audit-details-title" className="mt-2 text-2xl font-semibold text-[var(--color-ink)]">
                  {formatAction(selectedRecord.action)}
                </h3>
                <p className="mt-1 text-sm text-[var(--color-muted)]">{selectedRecord.summary}</p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedRecord(null)}
                className="rounded-2xl border border-[var(--color-border)] px-4 py-2 text-sm font-medium text-[var(--color-ink)]"
              >
                Close
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-[24px] border border-[var(--color-border)] bg-white p-5">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-muted)]">Actor</p>
                  <p className="mt-3 text-sm font-medium text-[var(--color-ink)]">{selectedRecord.actorEmail}</p>
                </div>
                <div className="rounded-[24px] border border-[var(--color-border)] bg-white p-5">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-muted)]">Timestamp</p>
                  <p className="mt-3 text-sm font-medium text-[var(--color-ink)]">
                    {new Date(selectedRecord.createdAt).toLocaleString()}
                  </p>
                </div>
                <div className="rounded-[24px] border border-[var(--color-border)] bg-white p-5">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-muted)]">Request</p>
                  <p className="mt-3 text-sm font-medium text-[var(--color-ink)]">
                    {[selectedRecord.requestMethod, selectedRecord.requestPath].filter(Boolean).join(" ") || "No request metadata"}
                  </p>
                </div>
                <div className="rounded-[24px] border border-[var(--color-border)] bg-white p-5">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-muted)]">Target</p>
                  <p className="mt-3 text-sm font-medium text-[var(--color-ink)]">
                    {selectedRecord.targetId || "No target id"}
                  </p>
                  <p className="mt-1 text-xs text-[var(--color-muted)]">
                    {selectedRecord.targetType || "No target type"}
                  </p>
                </div>
                <div className="rounded-[24px] border border-[var(--color-border)] bg-white p-5 md:col-span-2">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-muted)]">User Agent</p>
                  <p className="mt-3 break-all text-sm font-medium text-[var(--color-ink)]">
                    {selectedRecord.userAgent || "No user agent"}
                  </p>
                </div>
              </div>

              <div className="mt-6 rounded-[24px] border border-[var(--color-border)] bg-white p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-muted)]">JSON Details</p>
                {selectedRecord.details ? (
                  <pre className="mt-4 overflow-x-auto whitespace-pre-wrap break-all rounded-2xl bg-[var(--color-panel)] p-4 text-xs leading-6 text-[var(--color-ink)]">
                    {formatJson(selectedRecord.details)}
                  </pre>
                ) : (
                  <p className="mt-4 text-sm text-[var(--color-muted)]">No JSON details</p>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </PortalShell>
  );
}
