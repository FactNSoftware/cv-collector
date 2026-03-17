"use client";

import { Users } from "lucide-react";
import { useMemo, useState } from "react";
import type { CvSubmissionRecord } from "../../lib/cv-storage";
import { CandidateCvPreviewModal } from "./CandidateCvPreviewModal";
import { PortalShell } from "./PortalShell";

type Props = {
  sessionEmail: string;
  organizationSlug: string;
  submissions: CvSubmissionRecord[];
};

const STATUS_OPTIONS = [
  { value: "all", label: "All statuses" },
  { value: "pending", label: "Pending" },
  { value: "reviewing", label: "Reviewing" },
  { value: "shortlisted", label: "Shortlisted" },
  { value: "rejected", label: "Rejected" },
  { value: "hired", label: "Hired" },
];

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
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${
        colorMap[status] ?? "bg-slate-100 text-slate-700"
      }`}
    >
      {status}
    </span>
  );
};

export function TenantCandidatesPortal({
  sessionEmail,
  organizationSlug,
  submissions,
}: Props) {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [activePreview, setActivePreview] = useState<CvSubmissionRecord | null>(null);

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return submissions.filter((sub) => {
      if (statusFilter !== "all" && sub.reviewStatus !== statusFilter) return false;
      if (!q) return true;
      return [sub.firstName, sub.lastName, sub.email, sub.jobTitle, sub.jobCode]
        .join(" ")
        .toLowerCase()
        .includes(q);
    });
  }, [submissions, searchQuery, statusFilter]);

  return (
    <PortalShell
      portal="tenant"
      organizationSlug={organizationSlug}
      sessionEmail={sessionEmail}
      eyebrow="Candidates"
      title="All candidates"
      subtitle="Review CVs and applications submitted for your job postings."
    >
      {activePreview && (
        <CandidateCvPreviewModal
          title={`${activePreview.firstName} ${activePreview.lastName} - ${activePreview.jobTitle}`}
          resumeName={activePreview.resumeOriginalName}
          cvUrl={`/api/admin/cv/${activePreview.id}/resume`}
          isOpen
          downloadUrl={`/api/admin/cv/${activePreview.id}/resume`}
          onClose={() => setActivePreview(null)}
        />
      )}

      <section className="rounded-[28px] border border-[var(--color-border-strong)] bg-[var(--color-panel)] p-6 shadow-[var(--shadow-soft)]">
        <div className="mb-5 grid gap-3 md:grid-cols-[1fr_200px]">
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name, email, or job"
            className="h-11 rounded-2xl border border-[var(--color-border)] bg-white px-4 text-sm text-[var(--color-ink)] outline-none focus:border-[var(--color-brand-strong)] focus:ring-4 focus:ring-[var(--color-focus-ring)]"
          />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-11 rounded-2xl border border-[var(--color-border)] bg-white px-4 text-sm text-[var(--color-ink)] outline-none focus:border-[var(--color-brand-strong)] focus:ring-4 focus:ring-[var(--color-focus-ring)]"
          >
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {filtered.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-16 text-center">
            <Users className="h-10 w-10 text-[var(--color-muted)]" />
            <p className="text-base font-medium text-[var(--color-ink)]">
              {submissions.length === 0
                ? "No applications yet"
                : "No candidates match your filters"}
            </p>
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
                    <p className="text-sm font-semibold text-[var(--color-ink)]">
                      {sub.firstName} {sub.lastName}
                    </p>
                    <ReviewBadge status={sub.reviewStatus} />
                  </div>
                  <p className="text-xs text-[var(--color-muted)]">{sub.email}</p>
                  <p className="mt-0.5 text-xs text-[var(--color-muted)]">
                    {sub.jobCode} · {sub.jobTitle}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span className="text-xs text-[var(--color-muted)]">
                    {new Date(sub.submittedAt).toLocaleDateString()}
                  </span>
                  <button
                    type="button"
                    onClick={() => setActivePreview(sub)}
                    className="inline-flex h-8 items-center rounded-xl border border-[var(--color-border)] px-3 text-xs font-medium text-[var(--color-ink)] transition hover:bg-[var(--color-panel-strong)]"
                  >
                    View CV
                  </button>
                  <a
                    href={`/admin/candidates/${sub.email}`}
                    className="inline-flex h-8 items-center rounded-xl border border-[var(--color-border)] px-3 text-xs font-medium text-[var(--color-ink)] transition hover:bg-[var(--color-panel-strong)]"
                  >
                    Profile
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </PortalShell>
  );
}
