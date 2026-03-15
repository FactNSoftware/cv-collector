"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { useRouter } from "next/navigation";
import { ExternalLink, FileArchive, Link2, Pencil, Trash2, Upload, Users } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import type { AdminJobListItem } from "../../lib/admin-list-types";
import type { PageInfo } from "../../lib/pagination";
import { AdminDataTable } from "./AdminDataTable";
import { AdminJobsCardView } from "./AdminJobsCardView";
import { AdminRowActionMenu } from "./AdminRowActionMenu";
import { AdminViewModeToggle } from "./AdminViewModeToggle";
import { ConfirmDialog } from "./ConfirmDialog";
import { PortalShell } from "./PortalShell";
import { usePersistedViewMode } from "./usePersistedViewMode";
import { useServerInfiniteList } from "./useServerInfiniteList";
import { useServerPagination } from "./useServerPagination";
import { useToast } from "./ToastProvider";

type AdminJobsIndexProps = {
  sessionEmail: string;
  initialJobs: AdminJobListItem[];
  initialPageInfo: PageInfo;
};

const JobStatusBadge = ({ isPublished }: { isPublished: boolean }) => (
  <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${isPublished ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"}`}>
    {isPublished ? "Published" : "Draft"}
  </span>
);

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

export function AdminJobsIndex({
  sessionEmail,
  initialJobs,
  initialPageInfo,
}: AdminJobsIndexProps) {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [tablePageSize, setTablePageSize] = useState(initialPageInfo.limit);
  const [pendingDeleteJobId, setPendingDeleteJobId] = useState<string | null>(null);
  const [pendingPublishJob, setPendingPublishJob] = useState<AdminJobListItem | null>(null);
  const [downloadingJobId, setDownloadingJobId] = useState<string | null>(null);
  const { viewMode, setViewMode } = usePersistedViewMode("admin-jobs-view-mode", "card");
  const { showToast } = useToast();
  const resetKey = `${searchQuery}|${statusFilter}|${tablePageSize}`;

  const fetchPage = useCallback(async (cursor?: string) => {
    const response = await fetch(`/api/admin/jobs?${createQueryString({
      limit: tablePageSize,
      cursor,
      searchQuery,
      statusFilter,
    })}`);
    const payload = await response.json().catch(() => ({
      items: [],
      pageInfo: { limit: tablePageSize, nextCursor: null, hasMore: false },
    }));

    if (!response.ok) {
      throw new Error(payload.message || "Failed to load jobs.");
    }

    return payload;
  }, [searchQuery, statusFilter, tablePageSize]);

  const {
    items,
    setItems,
    isLoading,
    pageIndex,
    canPreviousPage,
    canNextPage,
    goToNextPage,
    goToPreviousPage,
  } = useServerPagination<AdminJobListItem>({
    initialItems: initialJobs,
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
  } = useServerInfiniteList<AdminJobListItem>({
    initialItems: initialJobs,
    initialPageInfo,
    resetKey,
    loadPage: fetchPage,
  });

  const togglePublish = async (job: AdminJobListItem) => {
    const response = await fetch(`/api/admin/jobs/${job.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...job,
        descriptionHtml: job.descriptionHtml,
        isPublished: !job.isPublished,
      }),
    });
    const payload = await response.json().catch(() => ({ message: "Failed to update job." }));

    if (!response.ok) {
      showToast(payload.message || "Failed to update job.", "error");
      return;
    }

    setItems((current) => current.map((item) => (
      item.id === job.id ? { ...(payload.item as AdminJobListItem), applicantCount: item.applicantCount } : item
    )));
    setCardItems((current) => current.map((item) => (
      item.id === job.id ? { ...(payload.item as AdminJobListItem), applicantCount: item.applicantCount } : item
    )));
    showToast(payload.message || "Job updated successfully.");
  };

  const deleteJob = async (jobId: string) => {
    const response = await fetch(`/api/admin/jobs/${jobId}`, { method: "DELETE" });
    const payload = await response.json().catch(() => ({ message: "Failed to delete job." }));

    if (!response.ok) {
      showToast(payload.message || "Failed to delete job.", "error");
      return;
    }

    setItems((current) => current.filter((item) => item.id !== jobId));
    setCardItems((current) => current.filter((item) => item.id !== jobId));
    showToast(payload.message || "Job deleted successfully.");
  };

  const downloadAllCvs = useCallback(async (job: AdminJobListItem) => {
    if (job.applicantCount === 0 || downloadingJobId) {
      return;
    }

    setDownloadingJobId(job.id);

    try {
      const response = await fetch(`/api/admin/jobs/${job.id}/cvs`);
      const contentType = response.headers.get("content-type") || "";

      if (!response.ok) {
        const payload = contentType.includes("application/json")
          ? await response.json().catch(() => ({ message: "Failed to download CV zip." }))
          : { message: "Failed to download CV zip." };
        showToast(payload.message || "Failed to download CV zip.", "error");
        return;
      }

      const blob = await response.blob();
      const objectUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = objectUrl;
      link.download = `${job.code}-cvs.zip`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(objectUrl);
    } catch {
      showToast("Failed to download CV zip.", "error");
    } finally {
      setDownloadingJobId(null);
    }
  }, [downloadingJobId, showToast]);

  const columns = useMemo<ColumnDef<AdminJobListItem>[]>(() => [
    {
      accessorKey: "code",
      header: "Job",
      cell: ({ row }) => (
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="theme-badge-brand rounded-full px-2.5 py-1 text-xs font-semibold">
              {row.original.code}
            </span>
            <JobStatusBadge isPublished={row.original.isPublished} />
          </div>
          <div className="font-semibold text-[var(--color-ink)]">{row.original.title}</div>
        </div>
      ),
    },
    {
      id: "details",
      header: "Details",
      cell: ({ row }) => (
        <div className="space-y-1 text-xs text-[var(--color-muted)]">
          <div>{row.original.department || "No department"}</div>
          <div>{row.original.location || "No location"}</div>
          <div>{row.original.employmentType} / {row.original.workplaceType}</div>
          <div>{row.original.experienceLevel}</div>
        </div>
      ),
    },
    {
      accessorKey: "applicantCount",
      header: "Applicants",
      cell: ({ row }) => (
        <div className="space-y-1">
          <div className="font-semibold text-[var(--color-ink)]">{row.original.applicantCount}</div>
          <div className="text-xs text-[var(--color-muted)]">
            Updated {new Date(row.original.updatedAt).toLocaleDateString()}
          </div>
        </div>
      ),
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => {
        const job = row.original;

        return (
          <div
            className="flex justify-end"
            onClick={(event) => {
              event.stopPropagation();
            }}
          >
            <AdminRowActionMenu
              items={[
                ...(job.isPublished
                  ? [
                      {
                        label: "Public View",
                        href: `/jobs/${job.id}`,
                        target: "_blank",
                        rel: "noreferrer",
                        icon: <ExternalLink className="h-4 w-4" />,
                      },
                      {
                        label: "Copy Public Link",
                        icon: <Link2 className="h-4 w-4" />,
                        onSelect: async () => {
                          try {
                            await navigator.clipboard.writeText(`${window.location.origin}/jobs/${job.id}`);
                            showToast("Public job link copied.");
                          } catch {
                            showToast("Failed to copy public job link.", "error");
                          }
                        },
                      },
                    ]
                  : []),
                {
                  label: "Edit Job",
                  href: `/admin/jobs/${job.id}/edit`,
                  icon: <Pencil className="h-4 w-4" />,
                },
                {
                  label: "View Candidates",
                  href: `/admin/jobs/${job.id}/candidates`,
                  icon: <Users className="h-4 w-4" />,
                },
                {
                  label: downloadingJobId === job.id ? "Preparing ZIP..." : "Download CV ZIP",
                  icon: <FileArchive className="h-4 w-4" />,
                  onSelect: () => void downloadAllCvs(job),
                  disabled: job.applicantCount === 0 || downloadingJobId === job.id,
                },
                {
                  label: job.isPublished ? "Unpublish" : "Publish",
                  icon: <Upload className="h-4 w-4" />,
                  onSelect: () => setPendingPublishJob(job),
                },
                {
                  label: "Delete",
                  icon: <Trash2 className="h-4 w-4" />,
                  onSelect: () => setPendingDeleteJobId(job.id),
                  tone: "danger",
                },
              ]}
            />
          </div>
        );
      },
    },
  ], [downloadAllCvs, downloadingJobId, showToast]);

  return (
    <PortalShell
      portal="admin"
      sessionEmail={sessionEmail}
      eyebrow="Jobs"
      title="Manage jobs and applicants"
      subtitle="Browse every role, open edit pages, and review applicant pipelines."
      primaryActionHref="/admin/jobs/new"
      primaryActionLabel="New Job"
    >
      <div className="space-y-4">
        <div className="grid gap-3 rounded-[24px] border border-[#eadfcb] bg-white p-5 shadow-sm md:grid-cols-[1fr_220px]">
          <input
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Search by code, title, department, location"
            className="h-12 rounded-2xl border border-[var(--color-border)] bg-white px-4 text-sm text-[var(--color-ink)] outline-none focus:border-[var(--color-brand)]"
          />
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            className="h-12 rounded-2xl border border-[var(--color-border)] bg-white px-4 text-sm text-[var(--color-ink)] outline-none focus:border-[var(--color-brand)]"
          >
            <option value="all">All jobs</option>
            <option value="published">Published</option>
            <option value="draft">Draft</option>
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
            emptyMessage="No jobs match the current filters."
            pageIndex={pageIndex}
            pageSize={tablePageSize}
            canPreviousPage={canPreviousPage}
            canNextPage={canNextPage}
            onPreviousPage={goToPreviousPage}
            onNextPage={goToNextPage}
            onPageSizeChange={setTablePageSize}
            onRowClick={(job) => router.push(`/admin/jobs/${job.id}/candidates`)}
          />
        ) : (
          <>
            <AdminJobsCardView
              items={cardItems}
              downloadingJobId={downloadingJobId}
              onDownloadZip={(job) => void downloadAllCvs(job)}
              onTogglePublish={setPendingPublishJob}
              onDelete={setPendingDeleteJobId}
            />
            {isCardLoading && cardItems.length === 0 ? (
              <div className="rounded-[24px] border border-[var(--color-border-strong)] bg-[var(--color-panel)] p-4 text-center text-sm text-[var(--color-muted)] shadow-[var(--shadow-soft)]">
                Loading jobs...
              </div>
            ) : null}
            <div ref={cardSentinelRef} />
            {isCardLoadingMore ? (
              <div className="rounded-[24px] border border-[var(--color-border-strong)] bg-[var(--color-panel)] p-4 text-center text-sm text-[var(--color-muted)] shadow-[var(--shadow-soft)]">
                Loading more jobs...
              </div>
            ) : null}
          </>
        )}
      </div>

      <ConfirmDialog
        isOpen={Boolean(pendingPublishJob)}
        title={pendingPublishJob?.isPublished ? "Unpublish job?" : "Publish job?"}
        message={pendingPublishJob?.isPublished
          ? "This will remove the job from the public listing and prevent new candidates from applying."
          : "This will make the job visible on the public careers page and allow candidates to apply."}
        confirmLabel={pendingPublishJob?.isPublished ? "Unpublish" : "Publish"}
        onConfirm={async () => {
          if (!pendingPublishJob) {
            return;
          }
          await togglePublish(pendingPublishJob);
          setPendingPublishJob(null);
        }}
        onCancel={() => setPendingPublishJob(null)}
      />
      <ConfirmDialog
        isOpen={Boolean(pendingDeleteJobId)}
        title="Delete job?"
        message="This permanently removes the job posting from the admin portal."
        confirmLabel="Delete"
        onConfirm={async () => {
          if (!pendingDeleteJobId) {
            return;
          }
          await deleteJob(pendingDeleteJobId);
          setPendingDeleteJobId(null);
        }}
        onCancel={() => setPendingDeleteJobId(null)}
      />
    </PortalShell>
  );
}
