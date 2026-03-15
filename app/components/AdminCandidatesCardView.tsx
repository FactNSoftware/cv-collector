"use client";

import Link from "next/link";
import type { AdminCandidateListItem } from "../../lib/admin-list-types";

type AdminCandidatesCardViewProps = {
  items: AdminCandidateListItem[];
};

export function AdminCandidatesCardView({ items }: AdminCandidatesCardViewProps) {
  if (items.length === 0) {
    return (
      <div className="rounded-[28px] border border-dashed border-[var(--color-border)] bg-white/70 p-6 text-sm text-[var(--color-muted)]">
        No candidates match the current filters.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {items.map((candidate) => (
        <Link
          key={candidate.email}
          href={`/admin/candidates/${encodeURIComponent(candidate.email)}`}
          className="block rounded-[28px] border border-[var(--color-border-strong)] bg-[var(--color-panel)] p-5 shadow-[var(--shadow-soft)] transition hover:border-[var(--color-border)]"
        >
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold text-[var(--color-ink)]">
                {[candidate.firstName, candidate.lastName].filter(Boolean).join(" ") || "Unnamed Candidate"}
              </h2>
              <p className="mt-2 text-sm text-[var(--color-muted)]">{candidate.email}</p>
              {candidate.phone && <p className="mt-1 text-sm text-[var(--color-muted)]">{candidate.phone}</p>}
            </div>
            <div className="flex flex-col items-end gap-2 text-sm text-[var(--color-muted)]">
              <span className="rounded-full bg-white px-3 py-1.5 font-semibold text-[var(--color-ink)]">
                {candidate.submissionCount} submission{candidate.submissionCount === 1 ? "" : "s"}
              </span>
              <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                candidate.latestReviewStatus === "accepted"
                  ? "bg-emerald-100 text-emerald-800"
                  : candidate.latestReviewStatus === "rejected"
                    ? "bg-rose-100 text-rose-800"
                    : candidate.latestReviewStatus === "pending"
                      ? "bg-amber-100 text-amber-800"
                      : "bg-slate-100 text-slate-700"
              }`}>
                {candidate.latestReviewStatus === "none"
                  ? "No submissions"
                  : candidate.latestReviewStatus.charAt(0).toUpperCase() + candidate.latestReviewStatus.slice(1)}
              </span>
              <span>
                {candidate.latestSubmissionAt
                  ? `Latest: ${new Date(candidate.latestSubmissionAt).toLocaleString()}`
                  : "No submissions yet"}
              </span>
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}
