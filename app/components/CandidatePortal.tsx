"use client";

import Link from "next/link";
import { BriefcaseBusiness, FileText, ShieldCheck, UserRound } from "lucide-react";
import { useState } from "react";
import type { CandidateProfile } from "../../lib/candidate-profile";
import type { CvSubmissionRecord } from "../../lib/cv-storage";
import { CandidateCvPreviewModal } from "./CandidateCvPreviewModal";
import { PortalShell } from "./PortalShell";

type CandidatePortalProps = {
  sessionEmail: string;
  profile: CandidateProfile;
  submissions: CvSubmissionRecord[];
};

export function CandidatePortal({
  sessionEmail,
  profile,
  submissions,
}: CandidatePortalProps) {
  const [activePreview, setActivePreview] = useState<CvSubmissionRecord | null>(null);
  const fullName = [profile.firstName, profile.lastName].filter(Boolean).join(" ") || "Candidate";
  const latestSubmission = submissions[0] ?? null;

  return (
    <PortalShell
      portal="candidate"
      sessionEmail={sessionEmail}
      eyebrow="Candidate Dashboard"
      title={`Welcome back, ${fullName}`}
      subtitle="Manage your job applications, profile, and account activity from one place."
      primaryActionHref="/apply"
      primaryActionLabel="Apply for a Job"
    >
      <div className="space-y-4">
        <section className="grid gap-4 md:grid-cols-3">
          <article className="rounded-[28px] border border-[var(--color-border-strong)] bg-[var(--color-panel)] p-5 shadow-[var(--shadow-soft)]">
            <p className="text-sm text-[var(--color-muted)]">Submitted applications</p>
            <p className="mt-2 text-3xl font-semibold text-[var(--color-ink)]">{submissions.length}</p>
          </article>
          <article className="rounded-[28px] border border-[var(--color-border-strong)] bg-[var(--color-panel)] p-5 shadow-[var(--shadow-soft)]">
            <p className="text-sm text-[var(--color-muted)]">Profile status</p>
            <p className="mt-2 text-lg font-semibold text-[var(--color-ink)]">
              {profile.phone && profile.idOrPassportNumber ? "Complete" : "Needs attention"}
            </p>
          </article>
          <article className="rounded-[28px] border border-[var(--color-border-strong)] bg-[var(--color-panel)] p-5 shadow-[var(--shadow-soft)]">
            <p className="text-sm text-[var(--color-muted)]">Profile updated</p>
            <p className="mt-2 text-lg font-semibold text-[var(--color-ink)]">
              {profile.updatedAt ? new Date(profile.updatedAt).toLocaleDateString() : "Not updated yet"}
            </p>
          </article>
        </section>

        <section className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
          <article className="rounded-[28px] border border-[var(--color-border-strong)] bg-[var(--color-panel)] p-6 shadow-[var(--shadow-soft)]">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--color-brand-strong)]">
                  Quick Links
                </p>
                <h2 className="mt-2 text-2xl font-semibold text-[var(--color-ink)]">
                  Choose what you want to do next
                </h2>
              </div>
            </div>

            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <Link href="/apply" className="rounded-[24px] border border-[var(--color-border)] bg-white p-5 transition hover:border-[var(--color-border-strong)]">
                <BriefcaseBusiness className="h-5 w-5 text-[var(--color-brand)]" />
                <h3 className="mt-4 text-lg font-semibold text-[var(--color-ink)]">New Job Application</h3>
                <p className="mt-2 text-sm leading-6 text-[var(--color-muted)]">Browse current openings and submit a new CV.</p>
              </Link>
              <Link href="/applications/history" className="rounded-[24px] border border-[var(--color-border)] bg-white p-5 transition hover:border-[var(--color-border-strong)]">
                <FileText className="h-5 w-5 text-[var(--color-brand)]" />
                <h3 className="mt-4 text-lg font-semibold text-[var(--color-ink)]">Applied Jobs</h3>
                <p className="mt-2 text-sm leading-6 text-[var(--color-muted)]">Review every submitted application and preview your CV copies.</p>
              </Link>
              <Link href="/account" className="rounded-[24px] border border-[var(--color-border)] bg-white p-5 transition hover:border-[var(--color-border-strong)]">
                <UserRound className="h-5 w-5 text-[var(--color-brand)]" />
                <h3 className="mt-4 text-lg font-semibold text-[var(--color-ink)]">Manage Profile</h3>
                <p className="mt-2 text-sm leading-6 text-[var(--color-muted)]">Update your personal details once and reuse them for future applications.</p>
              </Link>
              <div className="rounded-[24px] border border-dashed border-[var(--color-border)] bg-white/70 p-5">
                <ShieldCheck className="h-5 w-5 text-[var(--color-brand)]" />
                <h3 className="mt-4 text-lg font-semibold text-[var(--color-ink)]">Session</h3>
                <p className="mt-2 text-sm leading-6 text-[var(--color-muted)]">{sessionEmail}</p>
              </div>
            </div>
          </article>

          <article className="rounded-[28px] border border-[var(--color-border-strong)] bg-[var(--color-panel)] p-6 shadow-[var(--shadow-soft)]">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--color-brand-strong)]">
              Latest Activity
            </p>
            {latestSubmission ? (
              <>
                <h2 className="mt-2 text-2xl font-semibold text-[var(--color-ink)]">
                  {latestSubmission.jobTitle || latestSubmission.jobOpening}
                </h2>
                <p className="mt-2 text-sm leading-6 text-[var(--color-muted)]">
                  Submitted on {new Date(latestSubmission.submittedAt).toLocaleString()}
                </p>
                <div className="mt-5 rounded-[24px] border border-[var(--color-border)] bg-white p-5">
                  <p className="text-sm font-medium text-[var(--color-ink)]">{latestSubmission.jobOpening}</p>
                  <p className="mt-2 text-sm text-[var(--color-muted)]">{latestSubmission.resumeOriginalName}</p>
                  <button
                    type="button"
                    onClick={() => setActivePreview(latestSubmission)}
                    className="mt-4 inline-flex rounded-2xl border border-[var(--color-border)] px-4 py-2 text-sm font-medium text-[var(--color-ink)]"
                  >
                    View Latest CV
                  </button>
                </div>
              </>
            ) : (
              <div className="mt-4 rounded-[24px] border border-dashed border-[var(--color-border)] bg-white/70 p-6 text-sm leading-6 text-[var(--color-muted)]">
                You have not submitted any applications yet. Start from the Apply page.
              </div>
            )}
          </article>
        </section>
      </div>
      <CandidateCvPreviewModal
        title={activePreview?.jobTitle || activePreview?.jobOpening || "CV Preview"}
        resumeName={activePreview?.resumeOriginalName || ""}
        cvUrl={activePreview ? `/api/cv/${activePreview.id}/resume?disposition=inline` : ""}
        downloadUrl={activePreview ? `/api/cv/${activePreview.id}/resume` : null}
        isOpen={Boolean(activePreview)}
        onClose={() => setActivePreview(null)}
      />
    </PortalShell>
  );
}
