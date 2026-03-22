"use client";

import Link from "next/link";
import {
  BriefcaseBusiness,
  CheckCircle2,
  Clock3,
  FileText,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { useState } from "react";
import type { CandidateProfile } from "../../lib/candidate-profile";
import type { CvSubmissionRecord } from "../../lib/cv-storage";
import { CandidateCvPreviewModal } from "./CandidateCvPreviewModal";
import { PortalShell } from "./PortalShell";
import {
  DashboardEmptyState,
  DashboardMetricCard,
  DashboardPanel,
} from "./PortalDashboardPrimitives";

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
  const pendingCount = submissions.filter((submission) => submission.reviewStatus === "pending").length;
  const acceptedCount = submissions.filter((submission) => submission.reviewStatus === "accepted").length;
  const profileCompletionCount = [profile.phone, profile.idOrPassportNumber].filter(Boolean).length;
  const profileCompletionLabel = profileCompletionCount === 2 ? "Complete" : "Needs attention";
  const averageAtsScore = submissions.filter((submission) => submission.atsScore !== null);
  const atsAverage = averageAtsScore.length > 0
    ? Math.round(averageAtsScore.reduce((total, submission) => total + (submission.atsScore ?? 0), 0) / averageAtsScore.length)
    : null;

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
      <div className="space-y-6">
        <section className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
          <DashboardMetricCard
            icon={FileText}
            label="Applications"
            value={submissions.length}
            helper={`${pendingCount} pending review`}
          />
          <DashboardMetricCard
            icon={CheckCircle2}
            label="Accepted"
            value={acceptedCount}
            helper={atsAverage === null ? "No ATS score yet" : `Average ATS ${atsAverage}%`}
          />
          <DashboardMetricCard
            icon={ShieldCheck}
            label="Profile"
            value={profileCompletionLabel}
            helper={profile.updatedAt ? `Updated ${new Date(profile.updatedAt).toLocaleDateString()}` : "Not updated yet"}
          />
          <DashboardMetricCard
            icon={Clock3}
            label="Latest CV"
            value={latestSubmission ? "Ready" : "None"}
            helper={latestSubmission?.resumeOriginalName || "Submit an application to store your CV"}
          />
        </section>

        <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
          <DashboardPanel eyebrow="Quick Links" title="Choose what you want to do next">
            <div className="grid gap-4 sm:grid-cols-2">
              <Link href="/apply" className="rounded-[16px] border border-[var(--color-border)] bg-white p-5 transition hover:border-[var(--color-border-strong)]">
                <BriefcaseBusiness className="h-5 w-5 text-[var(--color-brand)]" />
                <h3 className="mt-4 text-lg font-semibold text-[var(--color-ink)]">New Job Application</h3>
                <p className="mt-2 text-sm leading-6 text-[var(--color-muted)]">Browse current openings and submit a new CV.</p>
              </Link>
              <Link href="/applications/history" className="rounded-[16px] border border-[var(--color-border)] bg-white p-5 transition hover:border-[var(--color-border-strong)]">
                <FileText className="h-5 w-5 text-[var(--color-brand)]" />
                <h3 className="mt-4 text-lg font-semibold text-[var(--color-ink)]">Application History</h3>
                <p className="mt-2 text-sm leading-6 text-[var(--color-muted)]">Review submissions, statuses, and previous CV uploads.</p>
              </Link>
              <Link href="/account" className="rounded-[16px] border border-[var(--color-border)] bg-white p-5 transition hover:border-[var(--color-border-strong)]">
                <UserRound className="h-5 w-5 text-[var(--color-brand)]" />
                <h3 className="mt-4 text-lg font-semibold text-[var(--color-ink)]">Manage Profile</h3>
                <p className="mt-2 text-sm leading-6 text-[var(--color-muted)]">Keep your details current for faster applications.</p>
              </Link>
              <div className="rounded-[16px] border border-dashed border-[var(--color-border)] bg-white p-5">
                <ShieldCheck className="h-5 w-5 text-[var(--color-brand)]" />
                <h3 className="mt-4 text-lg font-semibold text-[var(--color-ink)]">Session</h3>
                <p className="mt-2 text-sm leading-6 text-[var(--color-muted)]">{sessionEmail}</p>
              </div>
            </div>
          </DashboardPanel>

          <DashboardPanel eyebrow="Latest Activity" title="Most recent submission">
            {latestSubmission ? (
              <div className="rounded-[16px] border border-[var(--color-border)] bg-white p-5">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                    latestSubmission.reviewStatus === "accepted"
                      ? "bg-emerald-100 text-emerald-800"
                      : latestSubmission.reviewStatus === "rejected"
                        ? "bg-rose-100 text-rose-800"
                        : "bg-amber-100 text-amber-800"
                  }`}>
                    {latestSubmission.reviewStatus.charAt(0).toUpperCase() + latestSubmission.reviewStatus.slice(1)}
                  </span>
                  {latestSubmission.reviewedAt ? (
                    <span className="text-xs text-[var(--color-muted)]">
                      Reviewed on {new Date(latestSubmission.reviewedAt).toLocaleString()}
                    </span>
                  ) : null}
                </div>
                <h3 className="mt-4 text-lg font-semibold text-[var(--color-ink)]">
                  {latestSubmission.jobTitle || latestSubmission.jobOpening}
                </h3>
                <p className="mt-2 text-sm leading-6 text-[var(--color-muted)]">
                  Submitted on {new Date(latestSubmission.submittedAt).toLocaleString()}
                </p>
                <p className="mt-2 text-sm text-[var(--color-muted)]">{latestSubmission.resumeOriginalName}</p>
                {latestSubmission.reviewStatus === "rejected" && latestSubmission.rejectionReason ? (
                  <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
                    <span className="font-medium">Rejection reason:</span> {latestSubmission.rejectionReason}
                  </div>
                ) : null}
                <button
                  type="button"
                  onClick={() => setActivePreview(latestSubmission)}
                  className="mt-4 inline-flex rounded-2xl border border-[var(--color-border)] px-4 py-2 text-sm font-medium text-[var(--color-ink)]"
                >
                  View Latest CV
                </button>
              </div>
            ) : (
              <DashboardEmptyState message="You have not submitted any applications yet. Start from the Apply page." />
            )}
          </DashboardPanel>
        </div>
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
