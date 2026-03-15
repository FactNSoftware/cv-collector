"use client";

import Link from "next/link";
import { FileArchive } from "lucide-react";
import { useRef, useState } from "react";
import type { CvSubmissionRecord } from "../../lib/cv-storage";
import type { JobRecord } from "../../lib/jobs";
import { CandidateCvPreviewModal } from "./CandidateCvPreviewModal";
import { ConfirmDialog } from "./ConfirmDialog";
import { PortalShell } from "./PortalShell";
import { useToast } from "./ToastProvider";

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
  const [items, setItems] = useState(submissions);
  const [isDownloadingZip, setIsDownloadingZip] = useState(false);
  const [activePreview, setActivePreview] = useState<CvSubmissionRecord | null>(null);
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

  const updateReviewStatus = async (
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
    showToast(payload.message || "Application updated successfully.");
  };

  const deleteApplication = async (id: string) => {
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
    showToast(payload.message || "Application deleted successfully.");
  };

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
            <button
              type="button"
              onClick={downloadAllCvs}
              disabled={items.length === 0 || isDownloadingZip}
              className="inline-flex items-center rounded-2xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <FileArchive className="mr-2 h-4 w-4" />
              {isDownloadingZip ? "Preparing ZIP..." : "Download All CVs"}
            </button>
          </div>

          <div className="mt-5 space-y-3">
            {items.map((submission) => (
              <article key={submission.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900">
                      {[submission.firstName, submission.lastName].filter(Boolean).join(" ") || submission.email}
                    </h3>
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
                          className="rounded-xl border border-emerald-300 px-3 py-2 text-sm font-medium text-emerald-700"
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
                          className="rounded-xl border border-amber-300 px-3 py-2 text-sm font-medium text-amber-700"
                        >
                          Reject
                        </button>
                      </>
                    ) : null}
                    <Link href={`/admin/candidates/${encodeURIComponent(submission.email)}`} className="rounded-xl border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700">
                      View Candidate
                    </Link>
                    <button
                      type="button"
                      onClick={() => setActivePreview(submission)}
                      className="rounded-xl border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700"
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
                      className="rounded-xl border border-rose-300 px-3 py-2 text-sm font-medium text-rose-700"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
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
    </PortalShell>
  );
}
