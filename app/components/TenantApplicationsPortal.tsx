"use client";

import Link from "next/link";
import { LayoutGrid } from "lucide-react";
import { useMemo, useState } from "react";
import type { CvSubmissionRecord } from "../../lib/cv-storage";
import { CandidateCvPreviewModal } from "./CandidateCvPreviewModal";
import { ConfirmDialog } from "./ConfirmDialog";
import { PortalShell } from "./PortalShell";
import { useToast } from "./ToastProvider";

type Props = {
  sessionEmail: string;
  organizationSlug: string;
  tenantFeatureKeys?: string[];
  submissions: CvSubmissionRecord[];
};

const STATUS_LABELS: Record<string, string> = {
  pending: "Pending",
  reviewing: "Reviewing",
  shortlisted: "Shortlisted",
  rejected: "Rejected",
  hired: "Hired",
};

const ReviewBadge = ({ status }: { status: string }) => {
  const colorMap: Record<string, string> = {
    pending: "bg-slate-100 text-slate-700",
    reviewing: "bg-blue-100 text-blue-800",
    shortlisted: "bg-violet-100 text-violet-800",
    rejected: "bg-red-100 text-red-700",
    hired: "bg-emerald-100 text-emerald-800",
  };
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
        colorMap[status] ?? "bg-slate-100 text-slate-700"
      }`}
    >
      {STATUS_LABELS[status] ?? status}
    </span>
  );
};

export function TenantApplicationsPortal({
  sessionEmail,
  organizationSlug,
  tenantFeatureKeys,
  submissions: initialSubmissions,
}: Props) {
  const { showToast } = useToast();
  const [submissions, setSubmissions] = useState(initialSubmissions);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [activePreview, setActivePreview] = useState<CvSubmissionRecord | null>(null);
  const [pendingWithdrawId, setPendingWithdrawId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return submissions.filter((sub) => {
      if (statusFilter !== "all" && sub.reviewStatus !== statusFilter) return false;
      if (!q) return true;
      return [sub.jobCode, sub.jobTitle, sub.resumeOriginalName]
        .join(" ")
        .toLowerCase()
        .includes(q);
    });
  }, [submissions, searchQuery, statusFilter]);

  const handleWithdraw = async (id: string) => {
    const response = await fetch(`/api/cv/${id}`, { method: "DELETE" });
    if (!response.ok) {
      showToast("Failed to withdraw application.", "error");
      return;
    }
    setSubmissions((prev) => prev.filter((s) => s.id !== id));
    showToast("Application withdrawn.");
    setPendingWithdrawId(null);
  };

  return (
    <PortalShell
      portal="tenant"
      organizationSlug={organizationSlug}
      tenantFeatureKeys={tenantFeatureKeys}
      sessionEmail={sessionEmail}
      eyebrow="Applications"
      title="My applications"
      subtitle="Track the status of your submitted CVs."
      primaryActionHref={`/o/${organizationSlug}/apply`}
      primaryActionLabel="Browse jobs"
    >
      <ConfirmDialog
        isOpen={!!pendingWithdrawId}
        title="Withdraw application?"
        message="Your CV submission will be removed. This cannot be undone."
        confirmLabel="Withdraw"
        onConfirm={() => {
          if (pendingWithdrawId) {
            return handleWithdraw(pendingWithdrawId);
          }
        }}
        onCancel={() => setPendingWithdrawId(null)}
      />

      {activePreview && (
        <CandidateCvPreviewModal
          title={`${activePreview.jobCode} - ${activePreview.jobTitle}`}
          resumeName={activePreview.resumeOriginalName}
          cvUrl={`/api/cv/${activePreview.id}/resume`}
          isOpen
          downloadUrl={`/api/cv/${activePreview.id}/resume`}
          onClose={() => setActivePreview(null)}
        />
      )}

      <section className="rounded-[28px] border border-[var(--color-border-strong)] bg-[var(--color-panel)] p-6 shadow-[var(--shadow-soft)]">
        <div className="mb-5 grid gap-3 md:grid-cols-[1fr_200px]">
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by job code, title, or CV name"
            className="h-11 rounded-2xl border border-[var(--color-border)] bg-white px-4 text-sm text-[var(--color-ink)] outline-none focus:border-[var(--color-brand-strong)] focus:ring-4 focus:ring-[var(--color-focus-ring)]"
          />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-11 rounded-2xl border border-[var(--color-border)] bg-white px-4 text-sm text-[var(--color-ink)] outline-none focus:border-[var(--color-brand-strong)] focus:ring-4 focus:ring-[var(--color-focus-ring)]"
          >
            <option value="all">All statuses</option>
            {Object.entries(STATUS_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>

        {filtered.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-16 text-center">
            <LayoutGrid className="h-10 w-10 text-[var(--color-muted)]" />
            <p className="text-base font-medium text-[var(--color-ink)]">
              {submissions.length === 0
                ? "No applications yet"
                : "No applications match your filters"}
            </p>
            {submissions.length === 0 && (
              <Link
                href={`/o/${organizationSlug}/apply`}
                className="theme-btn-primary mt-2 inline-flex h-10 items-center rounded-xl px-4 text-sm font-medium"
              >
                Browse open jobs →
              </Link>
            )}
          </div>
        ) : (
          <div className="divide-y divide-[var(--color-border)]">
            {filtered.map((sub) => (
              <div
                key={sub.id}
                className="flex flex-wrap items-center gap-3 py-4 first:pt-0 last:pb-0"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs text-[var(--color-muted)]">
                      {sub.jobCode}
                    </span>
                    <ReviewBadge status={sub.reviewStatus} />
                  </div>
                  <p className="mt-0.5 truncate text-sm font-semibold text-[var(--color-ink)]">
                    {sub.jobTitle}
                  </p>
                  <p className="text-xs text-[var(--color-muted)]">
                    {sub.resumeOriginalName} ·{" "}
                    {new Date(sub.submittedAt).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setActivePreview(sub)}
                    className="inline-flex h-8 items-center rounded-xl border border-[var(--color-border)] px-3 text-xs font-medium text-[var(--color-ink)] transition hover:bg-[var(--color-panel-strong)]"
                  >
                    View CV
                  </button>
                  {sub.reviewStatus === "pending" && (
                    <button
                      type="button"
                      onClick={() => setPendingWithdrawId(sub.id)}
                      className="inline-flex h-8 items-center rounded-xl border border-[var(--color-border)] px-3 text-xs font-medium text-red-600 transition hover:border-red-300 hover:bg-red-50"
                    >
                      Withdraw
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </PortalShell>
  );
}
