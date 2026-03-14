"use client";

import { useState } from "react";
import { ConfirmDialog } from "./ConfirmDialog";
import { PortalShell } from "./PortalShell";
import { CandidateCvPreviewModal } from "./CandidateCvPreviewModal";
import type { CvSubmissionRecord } from "../../lib/cv-storage";
import { useToast } from "./ToastProvider";

type CandidateApplicationsHistoryProps = {
  sessionEmail: string;
  submissions: CvSubmissionRecord[];
};

export function CandidateApplicationsHistory({
  sessionEmail,
  submissions,
}: CandidateApplicationsHistoryProps) {
  const [items, setItems] = useState(submissions);
  const [activePreview, setActivePreview] = useState<CvSubmissionRecord | null>(null);
  const [pendingWithdrawId, setPendingWithdrawId] = useState<string | null>(null);
  const { showToast } = useToast();

  const withdrawApplication = async (id: string) => {
    const response = await fetch(`/api/cv/${id}`, {
      method: "DELETE",
    });
    const payload = await response
      .json()
      .catch(() => ({ message: "Failed to withdraw application." }));

    if (!response.ok) {
      showToast(payload.message || "Failed to withdraw application.", "error");
      return;
    }

    setItems((current) => current.filter((item) => item.id !== id));
    showToast(payload.message || "Application withdrawn successfully.");
  };

  return (
    <PortalShell
      portal="candidate"
      sessionEmail={sessionEmail}
      eyebrow="Applied Jobs"
      title="Application history"
      subtitle="Every submitted CV and its related job record."
      primaryActionHref="/apply"
      primaryActionLabel="Apply Again"
    >
      <section className="rounded-[28px] border border-[var(--color-border-strong)] bg-[var(--color-panel)] p-6 shadow-[var(--shadow-soft)]">
        {items.length === 0 ? (
          <p className="rounded-[24px] border border-dashed border-[var(--color-border)] bg-white/70 p-6 text-sm text-[var(--color-muted)]">
            No applications yet.
          </p>
        ) : (
          <div className="space-y-3">
            {items.map((submission) => (
              <article key={submission.id} className="rounded-[24px] border border-[var(--color-border)] bg-white p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      {submission.jobCode && (
                        <span className="rounded-full bg-[var(--color-sidebar-accent)] px-2.5 py-1 text-xs font-semibold text-[var(--color-sidebar-accent-ink)]">
                          {submission.jobCode}
                        </span>
                      )}
                      <h2 className="text-lg font-semibold text-[var(--color-ink)]">
                        {submission.jobTitle || submission.jobOpening}
                      </h2>
                    </div>
                    <p className="mt-2 text-sm text-[var(--color-muted)]">
                      Submitted on {new Date(submission.submittedAt).toLocaleString()}
                    </p>
                    <p className="mt-1 text-sm text-[var(--color-muted)]">
                      {submission.resumeOriginalName}
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
                      {submission.reviewedAt && (
                        <span className="text-xs text-[var(--color-muted)]">
                          Reviewed on {new Date(submission.reviewedAt).toLocaleString()}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => setActivePreview(submission)}
                      className="rounded-2xl border border-[var(--color-border)] px-4 py-2 text-sm font-medium text-[var(--color-ink)]"
                    >
                      View CV
                    </button>
                    <button
                      type="button"
                      onClick={() => setPendingWithdrawId(submission.id)}
                      className="rounded-2xl border border-rose-300 px-4 py-2 text-sm font-medium text-rose-700"
                    >
                      Withdraw
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
      <CandidateCvPreviewModal
        title={activePreview?.jobTitle || activePreview?.jobOpening || "CV Preview"}
        resumeName={activePreview?.resumeOriginalName || ""}
        cvUrl={activePreview ? `/api/cv/${activePreview.id}/resume?disposition=inline` : ""}
        downloadUrl={activePreview ? `/api/cv/${activePreview.id}/resume` : null}
        isOpen={Boolean(activePreview)}
        onClose={() => setActivePreview(null)}
      />
      <ConfirmDialog
        isOpen={Boolean(pendingWithdrawId)}
        title="Withdraw application?"
        message="This removes the current application and lets you apply again for the same job."
        confirmLabel="Withdraw"
        onConfirm={async () => {
          if (!pendingWithdrawId) {
            return;
          }
          await withdrawApplication(pendingWithdrawId);
          setPendingWithdrawId(null);
        }}
        onCancel={() => setPendingWithdrawId(null)}
      />
    </PortalShell>
  );
}
