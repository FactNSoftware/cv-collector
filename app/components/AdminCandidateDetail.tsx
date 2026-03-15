"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { BriefcaseBusiness, Mail, Phone, ShieldCheck } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { CandidateProfile } from "../../lib/candidate-profile";
import { canSubmissionAtsBeRecalculated, type CvSubmissionRecord } from "../../lib/cv-storage";
import type { JobRecord } from "../../lib/jobs";
import { AtsDetailsModal } from "./AtsDetailsModal";
import { CandidateCvPreviewModal } from "./CandidateCvPreviewModal";
import { ConfirmDialog } from "./ConfirmDialog";
import { PortalShell } from "./PortalShell";
import { useToast } from "./ToastProvider";

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

  return <span className="text-xs text-slate-500">ATS not configured</span>;
};

type AdminCandidateDetailProps = {
  sessionEmail: string;
  candidate: CandidateProfile;
  submissions: CvSubmissionRecord[];
  jobsById: Record<string, JobRecord>;
  isAdmin: boolean;
};

export function AdminCandidateDetail({
  sessionEmail,
  candidate,
  submissions,
  jobsById,
  isAdmin,
}: AdminCandidateDetailProps) {
  const router = useRouter();
  const [items, setItems] = useState(submissions);
  const [recalculatingAtsId, setRecalculatingAtsId] = useState<string | null>(null);
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
  const fullName = [candidate.firstName, candidate.lastName].filter(Boolean).join(" ") || "Unnamed Candidate";

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

  const recalculateAts = async (id: string) => {
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
  };

  return (
    <PortalShell
      portal="admin"
      sessionEmail={sessionEmail}
      eyebrow="Candidate Detail"
      title={fullName}
      subtitle="Full profile information, account context, and submission history."
      primaryActionHref="/admin/candidates"
      primaryActionLabel="Back to Candidates"
    >
      <div className="grid gap-6 lg:grid-cols-[0.92fr_1.08fr]">
          <section className="rounded-[28px] border border-[#eadfcb] bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-slate-900">Profile</h2>
            <div className="mt-5 grid gap-4">
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Full name</p>
                <p className="mt-2 text-lg font-semibold text-slate-900">{fullName}</p>
              </div>
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Email</p>
                <p className="mt-2 inline-flex items-center gap-2 text-slate-900"><Mail className="h-4 w-4" />{candidate.email}</p>
              </div>
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Phone</p>
                <p className="mt-2 inline-flex items-center gap-2 text-slate-900"><Phone className="h-4 w-4" />{candidate.phone || "Not provided"}</p>
              </div>
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">ID / Passport</p>
                <p className="mt-2 inline-flex items-center gap-2 text-slate-900"><ShieldCheck className="h-4 w-4" />{candidate.idOrPassportNumber || "Not provided"}</p>
              </div>
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Profile updated</p>
                <p className="mt-2 text-slate-900">{candidate.updatedAt ? new Date(candidate.updatedAt).toLocaleString() : "No profile updates yet"}</p>
              </div>
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Admin access</p>
                <p className="mt-2 text-slate-900">{isAdmin ? "Candidate also has admin access" : "Candidate account only"}</p>
              </div>
            </div>
          </section>

          <section className="rounded-[28px] border border-[#eadfcb] bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-semibold text-slate-900">Application History</h2>
                <p className="text-sm text-slate-600">All submitted CVs and jobs for this candidate.</p>
              </div>
              <div className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700">
                {items.length} submission{items.length === 1 ? "" : "s"}
              </div>
            </div>

            <div className="mt-5 space-y-3">
              {items.map((submission) => (
                <article key={submission.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        {submission.jobCode && (
                          <span className="theme-badge-brand rounded-full px-2.5 py-1 text-xs font-semibold">
                            {submission.jobCode}
                          </span>
                        )}
                        <span className="text-base font-semibold text-slate-900">{submission.jobTitle || submission.jobOpening}</span>
                      </div>
                      <p className="mt-2 text-sm text-slate-600">
                        Applied on {new Date(submission.submittedAt).toLocaleString()}
                      </p>
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
                        {submission.reviewedAt && (
                          <span className="text-xs text-slate-500">
                            Reviewed on {new Date(submission.reviewedAt).toLocaleString()}
                          </span>
                        )}
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
                      {submission.jobId && (
                        <Link href={`/admin/jobs/${submission.jobId}/candidates`} className="rounded-xl border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700">
                          <BriefcaseBusiness className="mr-2 inline h-4 w-4" />
                          View Job
                        </Link>
                      )}
                      {canSubmissionAtsBeRecalculated(submission, jobsById[submission.jobId] ?? null) ? (
                        <button
                          type="button"
                          onClick={() => void recalculateAts(submission.id)}
                          className="rounded-xl border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700"
                        >
                          {recalculatingAtsId === submission.id ? "Recalculating ATS..." : "Recalculate ATS"}
                        </button>
                      ) : null}
                      <button
                        type="button"
                        onClick={() => setActiveAtsDetails(submission)}
                        className="rounded-xl border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700"
                      >
                        View ATS
                      </button>
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
                          message: "This permanently removes the application and CV from the candidate history.",
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
                  <div className="mt-3 rounded-xl bg-white p-3 text-sm text-slate-600">
                    <p>{submission.resumeOriginalName}</p>
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
            <label className="block text-sm font-medium text-[var(--color-ink)]" htmlFor="reject-reason-candidate">
              Rejection reason
              <span className="ml-1 text-xs font-normal text-[var(--color-muted)]">(Optional)</span>
            </label>
            <textarea
              id="reject-reason-candidate"
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
