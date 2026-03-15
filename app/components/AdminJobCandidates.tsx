"use client";

import type { ColumnDef } from "@tanstack/react-table";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  FileArchive,
  FileText,
  RefreshCcw,
  Trash2,
  UserRoundCheck,
  UserRoundX,
  Users,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { canSubmissionAtsBeRecalculated, type CvSubmissionRecord } from "../../lib/cv-storage";
import type { JobRecord } from "../../lib/jobs";
import { AdminDataTable } from "./AdminDataTable";
import { AdminRowActionMenu } from "./AdminRowActionMenu";
import { AdminViewModeToggle } from "./AdminViewModeToggle";
import { AtsDetailsModal } from "./AtsDetailsModal";
import { CandidateCvPreviewModal } from "./CandidateCvPreviewModal";
import { ConfirmDialog } from "./ConfirmDialog";
import { PortalShell } from "./PortalShell";
import { useToast } from "./ToastProvider";
import { usePersistedViewMode } from "./usePersistedViewMode";

const renderAtsBadge = (submission: Pick<CvSubmissionRecord, "atsStatus" | "atsScore">) => {
  if (submission.atsStatus === "queued") {
    return <span className="rounded-full bg-sky-100 px-2.5 py-1 text-xs font-semibold text-sky-800">ATS queued</span>;
  }

  if (submission.atsStatus === "processing") {
    return <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-800">ATS processing</span>;
  }

  if (submission.atsStatus === "failed") {
    return <span className="rounded-full bg-rose-100 px-2.5 py-1 text-xs font-semibold text-rose-800">ATS failed</span>;
  }

  if (submission.atsScore !== null) {
    return (
      <span className="rounded-full bg-[var(--color-panel-strong)] px-2.5 py-1 text-xs font-semibold text-[var(--color-brand-strong)]">
        ATS {submission.atsScore}%
      </span>
    );
  }

  return <span className="text-xs text-[var(--color-muted)]">Not scored</span>;
};

type AdminJobCandidatesProps = {
  sessionEmail: string;
  job: JobRecord;
  submissions: CvSubmissionRecord[];
};

export function AdminJobCandidates({
  sessionEmail,
  job,
  submissions,
}: AdminJobCandidatesProps) {
  type AtsFilterValue = "all" | "80_plus" | "60_79" | "40_59" | "below_40" | "not_scored";
  type ReviewFilterValue = "all" | "pending" | "accepted" | "rejected";

  const router = useRouter();
  const [items, setItems] = useState(submissions);
  const [tablePageIndex, setTablePageIndex] = useState(0);
  const [tablePageSize, setTablePageSize] = useState(10);
  const [atsFilter, setAtsFilter] = useState<AtsFilterValue>("all");
  const [reviewFilter, setReviewFilter] = useState<ReviewFilterValue>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [recalculatingAtsId, setRecalculatingAtsId] = useState<string | null>(null);
  const [isDownloadingZip, setIsDownloadingZip] = useState(false);
  const [activePreview, setActivePreview] = useState<CvSubmissionRecord | null>(null);
  const [activeAtsDetails, setActiveAtsDetails] = useState<CvSubmissionRecord | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const rejectionReasonRef = useRef("");
  const [isConfirmingAction, setIsConfirmingAction] = useState(false);
  const [confirmAction, setConfirmAction] = useState<null | {
    title: string;
    message: string;
    confirmLabel: string;
    loadingLabel?: string;
    tone?: "danger" | "warning" | "neutral";
    requiresReason?: boolean;
    onConfirm: () => Promise<void>;
  }>(null);
  const { showToast } = useToast();
  const { viewMode, setViewMode } = usePersistedViewMode(`admin-job-candidates-view-mode:${job.id}`, "card");

  useEffect(() => {
    setItems(submissions);
  }, [submissions]);

  const hasAtsInFlight = useMemo(
    () => items.some((item) => item.atsStatus === "queued" || item.atsStatus === "processing"),
    [items],
  );

  useEffect(() => {
    if (!hasAtsInFlight) {
      return;
    }

    const intervalId = window.setInterval(() => {
      router.refresh();
    }, 4000);

    return () => window.clearInterval(intervalId);
  }, [hasAtsInFlight, router]);

  const visibleItems = useMemo(() => {
    const filteredItems = items.filter((item) => {
      const normalizedSearchQuery = searchQuery.trim().toLowerCase();
      if (normalizedSearchQuery) {
        const searchableText = [
          item.firstName,
          item.lastName,
          item.email,
          item.phone,
          item.resumeOriginalName,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        if (!searchableText.includes(normalizedSearchQuery)) {
          return false;
        }
      }

      if (reviewFilter !== "all" && item.reviewStatus !== reviewFilter) {
        return false;
      }

      if (!job.atsEnabled || atsFilter === "all") {
        return true;
      }

      if (atsFilter === "not_scored") {
        return item.atsScore === null;
      }

      if (item.atsScore === null) {
        return false;
      }

      if (atsFilter === "80_plus") {
        return item.atsScore >= 80;
      }

      if (atsFilter === "60_79") {
        return item.atsScore >= 60 && item.atsScore <= 79;
      }

      if (atsFilter === "40_59") {
        return item.atsScore >= 40 && item.atsScore <= 59;
      }

      return item.atsScore < 40;
    });

    return [...filteredItems].sort((left, right) => {
      if (job.atsEnabled) {
        const atsScoreDifference = (right.atsScore ?? -1) - (left.atsScore ?? -1);

        if (atsScoreDifference !== 0) {
          return atsScoreDifference;
        }
      }

      return new Date(right.submittedAt).getTime() - new Date(left.submittedAt).getTime();
    });
  }, [atsFilter, items, job.atsEnabled, reviewFilter, searchQuery]);

  const rankedItems = useMemo(() => {
    return visibleItems.map((item, index) => ({
      ...item,
      ranking: index + 1,
      rankingLabel: !job.atsEnabled || item.atsScore === null
        ? null
        : index === 0
          ? "Best match"
          : item.atsScore >= 80
            ? "Strong match"
            : item.atsScore >= 60
              ? "Qualified"
              : "Needs review",
    }));
  }, [job.atsEnabled, visibleItems]);

  const paginatedTableItems = useMemo(() => {
    const startIndex = tablePageIndex * tablePageSize;
    return rankedItems.slice(startIndex, startIndex + tablePageSize);
  }, [rankedItems, tablePageIndex, tablePageSize]);

  const updateReviewStatus = useCallback(async (
    id: string,
    reviewStatus: "accepted" | "rejected" | "pending",
    rejectionReasonValue?: string,
  ) => {
    const response = await fetch(`/api/admin/applications/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reviewStatus, rejectionReason: rejectionReasonValue }),
    });
    const payload = await response
      .json()
      .catch(() => ({ message: "Failed to update application." }));

    if (!response.ok) {
      showToast(payload.message || "Failed to update application.", "error");
      return;
    }

    setItems((current) => current.map((item) => (item.id === id ? payload.item : item)));
    setActiveAtsDetails((current) => (current?.id === id ? payload.item : current));
    showToast(payload.message || "Application updated successfully.");
  }, [showToast]);

  const deleteApplication = useCallback(async (id: string) => {
    const response = await fetch(`/api/admin/applications/${id}`, {
      method: "DELETE",
    });
    const payload = await response
      .json()
      .catch(() => ({ message: "Failed to delete application." }));

    if (!response.ok) {
      showToast(payload.message || "Failed to delete application.", "error");
      return;
    }

    setItems((current) => current.filter((item) => item.id !== id));
    setActiveAtsDetails((current) => (current?.id === id ? null : current));
    showToast(payload.message || "Application deleted successfully.");
  }, [showToast]);

  const recalculateAts = useCallback(async (id: string) => {
    if (recalculatingAtsId === id) {
      return;
    }

    setRecalculatingAtsId(id);

    try {
      const response = await fetch(`/api/admin/applications/${id}`, {
        method: "POST",
      });
      const payload = await response
        .json()
        .catch(() => ({ message: "Failed to recalculate ATS." }));

      if (!response.ok) {
        showToast(payload.message || "Failed to recalculate ATS.", "error");
        return;
      }

      setItems((current) => current.map((item) => (item.id === id ? payload.item : item)));
      setActiveAtsDetails((current) => (current?.id === id ? payload.item : current));
      showToast(payload.message || "ATS recalculated successfully.");
      router.refresh();
    } finally {
      setRecalculatingAtsId(null);
    }
  }, [recalculatingAtsId, router, showToast]);

  const downloadAllCvs = async () => {
    if (items.length === 0 || isDownloadingZip) {
      return;
    }

    setIsDownloadingZip(true);

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
      setIsDownloadingZip(false);
    }
  };

  const columns = useMemo<ColumnDef<(CvSubmissionRecord & { ranking: number; rankingLabel: string | null })>[]>(() => [
    {
      id: "ranking",
      header: "#",
      cell: ({ row }) => (
        <div className="space-y-1">
          <div className="text-sm font-semibold text-[var(--color-ink)]">#{row.original.ranking}</div>
          {row.original.rankingLabel ? (
            <span className={`inline-flex rounded-full px-2 py-1 text-[11px] font-semibold ${
              row.original.ranking === 1
                ? "bg-emerald-100 text-emerald-800"
                : row.original.atsScore !== null && row.original.atsScore >= 80
                  ? "bg-sky-100 text-sky-800"
                  : row.original.atsScore !== null && row.original.atsScore >= 60
                    ? "bg-amber-100 text-amber-800"
                    : "bg-slate-200 text-slate-700"
            }`}>
              {row.original.rankingLabel}
            </span>
          ) : null}
        </div>
      ),
    },
    {
      accessorKey: "candidate",
      header: "Candidate",
      cell: ({ row }) => (
        <div className="space-y-1">
          <div className="font-semibold text-[var(--color-ink)]">
            {[row.original.firstName, row.original.lastName].filter(Boolean).join(" ") || row.original.email}
          </div>
          <div className="text-xs text-[var(--color-muted)]">{row.original.email}</div>
          <div className="text-xs text-[var(--color-muted)]">{row.original.phone}</div>
        </div>
      ),
    },
    {
      accessorKey: "submittedAt",
      header: "Applied",
      cell: ({ row }) => (
        <div className="text-sm text-[var(--color-muted)]">
          {new Date(row.original.submittedAt).toLocaleString()}
        </div>
      ),
    },
    {
      accessorKey: "reviewStatus",
      header: "Status",
      cell: ({ row }) => (
        <div className="space-y-2">
          <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
            row.original.reviewStatus === "accepted"
              ? "bg-emerald-100 text-emerald-800"
              : row.original.reviewStatus === "rejected"
                ? "bg-rose-100 text-rose-800"
                : "bg-amber-100 text-amber-800"
          }`}>
            {row.original.reviewStatus.charAt(0).toUpperCase() + row.original.reviewStatus.slice(1)}
          </span>
          {row.original.reviewStatus === "rejected" && row.original.rejectionReason ? (
            <div className="text-xs text-[var(--color-muted)]">Reason: {row.original.rejectionReason}</div>
          ) : null}
        </div>
      ),
    },
    {
      accessorKey: "atsScore",
      header: "ATS",
      cell: ({ row }) => renderAtsBadge(row.original),
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => {
        const submission = row.original;
        const items = [
          ...(submission.reviewStatus === "pending"
            ? [
                {
                  label: "Accept",
                  icon: <UserRoundCheck className="h-4 w-4" />,
                  onSelect: () => setConfirmAction({
                    title: "Accept application?",
                    message: "The candidate will be marked as accepted for this application.",
                    confirmLabel: "Accept",
                    loadingLabel: "Accepting...",
                    tone: "neutral",
                    onConfirm: async () => {
                      await updateReviewStatus(submission.id, "accepted");
                    },
                  }),
                },
                {
                  label: "Reject",
                  icon: <UserRoundX className="h-4 w-4" />,
                  onSelect: () => setConfirmAction({
                    title: "Reject application?",
                    message: "The candidate will be marked as rejected for this application. You can optionally include a reason.",
                    confirmLabel: "Reject",
                    loadingLabel: "Rejecting...",
                    tone: "warning",
                    requiresReason: true,
                    onConfirm: async () => {
                      await updateReviewStatus(submission.id, "rejected", rejectionReasonRef.current);
                    },
                  }),
                },
              ]
            : []),
          {
            label: "View Candidate",
            icon: <Users className="h-4 w-4" />,
            href: `/admin/candidates/${encodeURIComponent(submission.email)}`,
          },
          ...(canSubmissionAtsBeRecalculated(submission, job)
            ? [{
                label: recalculatingAtsId === submission.id ? "Recalculating ATS..." : "Recalculate ATS",
                icon: <RefreshCcw className="h-4 w-4" />,
                onSelect: () => void recalculateAts(submission.id),
              }]
            : []),
          {
            label: "View ATS",
            icon: <FileText className="h-4 w-4" />,
            onSelect: () => setActiveAtsDetails(submission),
          },
          {
            label: "View CV",
            icon: <FileArchive className="h-4 w-4" />,
            onSelect: () => setActivePreview(submission),
          },
          {
            label: "Delete",
            icon: <Trash2 className="h-4 w-4" />,
            tone: "danger" as const,
            onSelect: () => setConfirmAction({
              title: "Delete application?",
              message: "This permanently removes the application and CV from the candidate record.",
              confirmLabel: "Delete",
              loadingLabel: "Deleting...",
              tone: "danger",
              onConfirm: async () => {
                await deleteApplication(submission.id);
              },
            }),
          },
        ];

        return <AdminRowActionMenu items={items} />;
      },
    },
  ], [deleteApplication, job, recalculateAts, recalculatingAtsId, updateReviewStatus]);

  return (
    <PortalShell
      portal="admin"
      sessionEmail={sessionEmail}
      eyebrow={`${job.code} Applicants`}
      title={job.title}
      subtitle="Review every candidate attached to this job and download CVs in bulk."
      primaryActionHref={`/admin/jobs/${job.id}/edit`}
      primaryActionLabel="Edit Job"
    >
      <div className="space-y-4">
        <section className="grid gap-4 md:grid-cols-4">
          <article className="rounded-[24px] border border-[var(--color-border-strong)] bg-[var(--color-panel)] p-5 shadow-[var(--shadow-soft)]">
            <p className="text-sm text-slate-500">Applicants</p>
            <p className="mt-2 text-2xl font-semibold text-slate-900">{items.length}</p>
          </article>
          <article className="rounded-[24px] border border-[var(--color-border-strong)] bg-[var(--color-panel)] p-5 shadow-[var(--shadow-soft)]">
            <p className="text-sm text-slate-500">Employment</p>
            <p className="mt-2 text-lg font-semibold text-slate-900">{job.employmentType}</p>
          </article>
          <article className="rounded-[24px] border border-[var(--color-border-strong)] bg-[var(--color-panel)] p-5 shadow-[var(--shadow-soft)]">
            <p className="text-sm text-slate-500">Workplace</p>
            <p className="mt-2 text-lg font-semibold text-slate-900">{job.workplaceType}</p>
          </article>
          <article className="rounded-[24px] border border-[var(--color-border-strong)] bg-[var(--color-panel)] p-5 shadow-[var(--shadow-soft)]">
            <p className="text-sm text-slate-500">Location</p>
            <p className="mt-2 text-lg font-semibold text-slate-900">{job.location || "Not set"}</p>
          </article>
        </section>

        <section className="rounded-[28px] border border-[var(--color-border-strong)] bg-[var(--color-panel)] p-6 shadow-[var(--shadow-soft)]">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold text-slate-900">Candidate List</h2>
              <p className="text-sm text-slate-600">Open a candidate to inspect their full profile and history.</p>
            </div>
            <div className="flex flex-wrap items-center justify-end gap-2">
              <input
                type="search"
                value={searchQuery}
                onChange={(event) => {
                  setSearchQuery(event.target.value);
                  setTablePageIndex(0);
                }}
                placeholder="Search by name, email, phone, CV"
                className="h-11 min-w-[260px] rounded-2xl border border-[var(--color-border)] bg-white px-4 text-sm text-[var(--color-ink)] outline-none focus:border-[var(--color-brand)]"
              />
              <select
                value={reviewFilter}
                onChange={(event) => {
                  setReviewFilter(event.target.value as ReviewFilterValue);
                  setTablePageIndex(0);
                }}
                className="h-11 rounded-2xl border border-[var(--color-border)] bg-white px-4 text-sm text-[var(--color-ink)] outline-none focus:border-[var(--color-brand)]"
              >
                <option value="all">All statuses</option>
                <option value="pending">Pending</option>
                <option value="accepted">Accepted</option>
                <option value="rejected">Rejected</option>
              </select>
              {job.atsEnabled ? (
                <select
                  value={atsFilter}
                  onChange={(event) => {
                    setAtsFilter(event.target.value as AtsFilterValue);
                    setTablePageIndex(0);
                  }}
                  className="h-11 rounded-2xl border border-[var(--color-border)] bg-white px-4 text-sm text-[var(--color-ink)] outline-none focus:border-[var(--color-brand)]"
                >
                  <option value="all">All ATS scores</option>
                  <option value="80_plus">ATS 80% and above</option>
                  <option value="60_79">ATS 60% to 79%</option>
                  <option value="40_59">ATS 40% to 59%</option>
                  <option value="below_40">ATS below 40%</option>
                  <option value="not_scored">ATS not scored</option>
                </select>
              ) : null}
              <button
                type="button"
                onClick={() => setConfirmAction({
                  title: "Download all CVs?",
                  message: "This will prepare a ZIP file containing the latest CV from each candidate for this job.",
                  confirmLabel: "Download ZIP",
                  loadingLabel: "Preparing ZIP...",
                  tone: "neutral",
                  onConfirm: async () => {
                    await downloadAllCvs();
                  },
                })}
                disabled={items.length === 0 || isDownloadingZip}
                className="theme-action-button theme-action-button-secondary inline-flex items-center rounded-2xl px-4 py-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <FileArchive className="mr-2 h-4 w-4" />
                Download All CVs
              </button>
              <AdminViewModeToggle value={viewMode} onChange={setViewMode} />
            </div>
          </div>

          {viewMode === "table" ? (
            <div className="mt-5">
              <AdminDataTable
                data={paginatedTableItems}
                columns={columns}
                emptyMessage="No candidates are available for this job."
                pageIndex={tablePageIndex}
                pageSize={tablePageSize}
                canPreviousPage={tablePageIndex > 0}
                canNextPage={(tablePageIndex + 1) * tablePageSize < rankedItems.length}
                onPreviousPage={() => setTablePageIndex((current) => Math.max(0, current - 1))}
                onNextPage={() => setTablePageIndex((current) => current + 1)}
                onPageSizeChange={(pageSize) => {
                  setTablePageSize(pageSize);
                  setTablePageIndex(0);
                }}
                onRowClick={(submission) => {
                  router.push(`/admin/candidates/${encodeURIComponent(submission.email)}`);
                }}
              />
            </div>
          ) : (
            <div className="mt-5 space-y-3">
              {rankedItems.length > 0 ? rankedItems.map((submission) => (
                <article key={submission.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-lg font-semibold text-slate-900">
                          {[submission.firstName, submission.lastName].filter(Boolean).join(" ") || submission.email}
                        </h3>
                        <span className="rounded-full bg-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-700">
                          Rank #{submission.ranking}
                        </span>
                        {submission.rankingLabel ? (
                          <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                            submission.ranking === 1
                              ? "bg-emerald-100 text-emerald-800"
                              : submission.atsScore !== null && submission.atsScore >= 80
                                ? "bg-sky-100 text-sky-800"
                                : submission.atsScore !== null && submission.atsScore >= 60
                                  ? "bg-amber-100 text-amber-800"
                                  : "bg-slate-200 text-slate-700"
                          }`}>
                            {submission.rankingLabel}
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-1 text-sm text-slate-600">{submission.email}</p>
                      <p className="mt-1 text-sm text-slate-600">{submission.phone}</p>
                      <p className="mt-1 text-sm text-slate-600">Applied {new Date(submission.submittedAt).toLocaleString()}</p>
                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                          submission.reviewStatus === "accepted"
                            ? "bg-emerald-100 text-emerald-800"
                            : submission.reviewStatus === "rejected"
                              ? "bg-rose-100 text-rose-800"
                              : "bg-amber-100 text-amber-800"
                        }`}>
                          {submission.reviewStatus.charAt(0).toUpperCase() + submission.reviewStatus.slice(1)}
                        </span>
                        {submission.reviewStatus === "rejected" && submission.rejectionReason ? (
                          <span className="text-xs text-slate-500">
                            Reason: {submission.rejectionReason}
                          </span>
                        ) : null}
                        {renderAtsBadge(submission)}
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {submission.reviewStatus === "pending" ? (
                        <>
                          <button
                            type="button"
                            onClick={() => setConfirmAction({
                              title: "Accept application?",
                              message: "The candidate will be marked as accepted for this application.",
                              confirmLabel: "Accept",
                              loadingLabel: "Accepting...",
                              tone: "neutral",
                              onConfirm: async () => {
                                await updateReviewStatus(submission.id, "accepted");
                              },
                            })}
                            className="theme-action-button rounded-xl border border-emerald-300 px-3 py-2 text-sm text-emerald-700"
                          >
                            Accept
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmAction({
                              title: "Reject application?",
                              message: "The candidate will be marked as rejected for this application. You can optionally include a reason.",
                              confirmLabel: "Reject",
                              loadingLabel: "Rejecting...",
                              tone: "warning",
                              requiresReason: true,
                              onConfirm: async () => {
                                await updateReviewStatus(submission.id, "rejected", rejectionReasonRef.current);
                              },
                            })}
                            className="theme-action-button rounded-xl border border-amber-300 px-3 py-2 text-sm text-amber-700"
                          >
                            Reject
                          </button>
                        </>
                      ) : null}
                      <Link
                        href={`/admin/candidates/${encodeURIComponent(submission.email)}`}
                        className="theme-action-button theme-action-button-secondary rounded-xl px-3 py-2 text-sm"
                      >
                        View Candidate
                      </Link>
                      {canSubmissionAtsBeRecalculated(submission, job) ? (
                        <button
                          type="button"
                          onClick={() => void recalculateAts(submission.id)}
                          className="theme-action-button theme-action-button-secondary rounded-xl px-3 py-2 text-sm"
                        >
                          {recalculatingAtsId === submission.id ? "Recalculating ATS..." : "Recalculate ATS"}
                        </button>
                      ) : null}
                      <button
                        type="button"
                        onClick={() => setActiveAtsDetails(submission)}
                        className="theme-action-button theme-action-button-secondary rounded-xl px-3 py-2 text-sm"
                      >
                        View ATS
                      </button>
                      <button
                        type="button"
                        onClick={() => setActivePreview(submission)}
                        className="theme-action-button theme-action-button-secondary rounded-xl px-3 py-2 text-sm"
                      >
                        View CV
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmAction({
                          title: "Delete application?",
                          message: "This permanently removes the application and CV from the candidate record.",
                          confirmLabel: "Delete",
                          loadingLabel: "Deleting...",
                          tone: "danger",
                          onConfirm: async () => {
                            await deleteApplication(submission.id);
                          },
                        })}
                        className="theme-action-button theme-action-button-danger rounded-xl px-3 py-2 text-sm"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </article>
              )) : (
                <div className="rounded-2xl border border-dashed border-[var(--color-border)] bg-slate-50 p-8 text-center text-sm text-[var(--color-muted)]">
                  No candidates match the current ATS filter.
                </div>
              )}
            </div>
          )}
        </section>
      </div>
      <ConfirmDialog
        isOpen={Boolean(confirmAction)}
        title={confirmAction?.title || ""}
        message={confirmAction?.message || ""}
        confirmLabel={confirmAction?.confirmLabel || "Confirm"}
        loadingLabel={confirmAction?.loadingLabel}
        tone={confirmAction?.tone}
        isLoading={isConfirmingAction}
        onConfirm={async () => {
          const action = confirmAction;
          if (!action || isConfirmingAction) {
            return;
          }
          setIsConfirmingAction(true);
          try {
            await action.onConfirm();
            setRejectionReason("");
            rejectionReasonRef.current = "";
            setConfirmAction(null);
          } finally {
            setIsConfirmingAction(false);
          }
        }}
        onCancel={() => {
          if (isConfirmingAction) {
            return;
          }
          setRejectionReason("");
          rejectionReasonRef.current = "";
          setConfirmAction(null);
        }}
      >
        {confirmAction?.requiresReason ? (
          <div className="space-y-2">
            <label className="block text-sm font-medium text-[var(--color-ink)]" htmlFor="reject-reason-job">
              Rejection reason
              <span className="ml-1 text-xs font-normal text-[var(--color-muted)]">(Optional)</span>
            </label>
            <textarea
              id="reject-reason-job"
              value={rejectionReason}
              onChange={(event) => {
                setRejectionReason(event.target.value);
                rejectionReasonRef.current = event.target.value;
              }}
              rows={4}
              placeholder="Provide context for the rejection."
              className="w-full rounded-2xl border border-[var(--color-border)] bg-white px-4 py-3 text-sm text-[var(--color-ink)] outline-none focus:border-[var(--color-brand)]"
            />
          </div>
        ) : null}
      </ConfirmDialog>
      <CandidateCvPreviewModal
        title={activePreview ? [activePreview.firstName, activePreview.lastName].filter(Boolean).join(" ") || activePreview.email : "CV Preview"}
        resumeName={activePreview?.resumeOriginalName || ""}
        cvUrl={activePreview ? `/api/admin/cv/${activePreview.id}/resume?disposition=inline` : ""}
        downloadUrl={activePreview ? `/api/admin/cv/${activePreview.id}/resume` : null}
        isOpen={Boolean(activePreview)}
        onClose={() => setActivePreview(null)}
      />
      <AtsDetailsModal
        submission={activeAtsDetails}
        isOpen={Boolean(activeAtsDetails)}
        onClose={() => setActiveAtsDetails(null)}
      />
    </PortalShell>
  );
}
