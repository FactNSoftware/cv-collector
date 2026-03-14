"use client";

import Link from "next/link";
import { ArrowRight, BriefcaseBusiness, MapPin, TimerReset } from "lucide-react";
import type { CandidateProfile } from "../../lib/candidate-profile";
import type { CvSubmissionRecord } from "../../lib/cv-storage";
import type { JobRecord } from "../../lib/jobs";

type CandidateApplyWorkspaceProps = {
  sessionEmail: string;
  profile: CandidateProfile;
  jobs: JobRecord[];
  submissions: CvSubmissionRecord[];
};

const isProfileReady = (profile: CandidateProfile) => {
  return Boolean(
    profile.firstName.trim()
      && profile.lastName.trim()
      && profile.phone.trim()
      && profile.idOrPassportNumber.trim(),
  );
};

export function CandidateApplyWorkspace({
  sessionEmail,
  profile,
  jobs,
  submissions,
}: CandidateApplyWorkspaceProps) {
  const profileReady = isProfileReady(profile);
  const appliedJobIds = new Set(submissions.map((submission) => submission.jobId));

  return (
    <div className="space-y-5">
      <section className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
        <article className="rounded-[28px] border border-[var(--color-border-strong)] bg-[var(--color-panel)] p-6 shadow-[var(--shadow-soft)]">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--color-brand-strong)]">
            Before You Apply
          </p>
          <h2 className="mt-2 text-2xl font-semibold text-[var(--color-ink)]">
            Keep your profile ready
          </h2>
          <p className="mt-2 text-sm leading-6 text-[var(--color-muted)]">
            Your application will reuse your saved account details. CV upload happens on the final job page.
          </p>

          <div className="mt-5 rounded-[24px] border border-[var(--color-border)] bg-white p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-[var(--color-ink)]">{sessionEmail}</p>
                <p className="mt-1 text-sm text-[var(--color-muted)]">
                  {profileReady
                    ? "Your personal details are already saved and ready to reuse."
                    : "Complete your profile details during application or from your profile page."}
                </p>
              </div>
              <span className={`rounded-full px-3 py-1 text-xs font-semibold ${
                profileReady
                  ? "theme-badge-brand"
                  : "bg-amber-100 text-amber-800"
              }`}>
                {profileReady ? "Profile Ready" : "Needs Details"}
              </span>
            </div>
          </div>
        </article>

        <article className="rounded-[28px] border border-[var(--color-border-strong)] bg-[var(--color-panel)] p-6 shadow-[var(--shadow-soft)]">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--color-brand-strong)]">
            Open Roles
          </p>
          <h2 className="mt-2 text-2xl font-semibold text-[var(--color-ink)]">
            {jobs.length} published {jobs.length === 1 ? "job" : "jobs"} available
          </h2>
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <div className="rounded-[24px] border border-[var(--color-border)] bg-white p-4">
              <BriefcaseBusiness className="h-5 w-5 text-[var(--color-brand)]" />
              <p className="mt-3 text-sm text-[var(--color-muted)]">Employment types</p>
              <p className="mt-1 text-lg font-semibold text-[var(--color-ink)]">Full role details</p>
            </div>
            <div className="rounded-[24px] border border-[var(--color-border)] bg-white p-4">
              <MapPin className="h-5 w-5 text-[var(--color-brand)]" />
              <p className="mt-3 text-sm text-[var(--color-muted)]">Location and mode</p>
              <p className="mt-1 text-lg font-semibold text-[var(--color-ink)]">Remote, hybrid, on-site</p>
            </div>
            <div className="rounded-[24px] border border-[var(--color-border)] bg-white p-4">
              <TimerReset className="h-5 w-5 text-[var(--color-brand)]" />
              <p className="mt-3 text-sm text-[var(--color-muted)]">Apply flow</p>
              <p className="mt-1 text-lg font-semibold text-[var(--color-ink)]">Review, then submit</p>
            </div>
          </div>
        </article>
      </section>

      <section className="rounded-[28px] border border-[var(--color-border-strong)] bg-[var(--color-panel)] p-6 shadow-[var(--shadow-soft)]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--color-brand-strong)]">
              Browse Jobs
            </p>
            <h2 className="mt-2 text-2xl font-semibold text-[var(--color-ink)]">
              Choose a role to view the full job details
            </h2>
          </div>
        </div>

        {jobs.length === 0 ? (
          <div className="mt-5 rounded-[24px] border border-dashed border-[var(--color-border)] bg-white/70 p-6 text-sm leading-6 text-[var(--color-muted)]">
            No published jobs are available right now.
          </div>
        ) : (
          <div className="mt-5 grid gap-4 xl:grid-cols-2">
            {jobs.map((job) => (
              (() => {
                const hasApplied = appliedJobIds.has(job.id);

                return (
              <article
                key={job.id}
                className="rounded-[24px] border border-[var(--color-border)] bg-white p-5 transition hover:border-[var(--color-border-strong)]"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="theme-badge-brand rounded-full px-2.5 py-1 text-xs font-semibold">
                    {job.code}
                  </span>
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
                    {job.employmentType}
                  </span>
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
                    {job.workplaceType}
                  </span>
                  {hasApplied && (
                    <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-800">
                      Applied
                    </span>
                  )}
                </div>
                <h3 className="mt-4 text-xl font-semibold text-[var(--color-ink)]">{job.title}</h3>
                {job.summary && (
                  <p className="mt-2 text-sm leading-6 text-[var(--color-muted)]">{job.summary}</p>
                )}
                <div className="mt-4 grid gap-2 text-sm text-[var(--color-muted)] sm:grid-cols-2">
                  {job.department && <p><span className="font-semibold text-[var(--color-ink)]">Department:</span> {job.department}</p>}
                  {job.location && <p><span className="font-semibold text-[var(--color-ink)]">Location:</span> {job.location}</p>}
                  <p><span className="font-semibold text-[var(--color-ink)]">Level:</span> {job.experienceLevel}</p>
                  {job.closingDate && <p><span className="font-semibold text-[var(--color-ink)]">Closing:</span> {new Date(job.closingDate).toLocaleDateString()}</p>}
                </div>
                {hasApplied && (
                  <p className="mt-4 text-sm text-[var(--color-muted)]">
                    You already applied for this job. You can still open the job page to review it or withdraw your application.
                  </p>
                )}
                <Link
                  href={`/apply/${job.id}`}
                  className="theme-btn-primary mt-5 inline-flex items-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-medium"
                >
                  {hasApplied ? "View Application" : "View Job"}
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </article>
                );
              })()
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
