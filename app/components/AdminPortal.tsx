"use client";

import Link from "next/link";
import { BriefcaseBusiness, ClipboardList, Settings, Users } from "lucide-react";
import type { AdminAccount } from "../../lib/admin-access";
import { PortalShell } from "./PortalShell";

type AdminUser = {
  email: string;
  firstName: string;
  lastName: string;
  submissions: Array<{
    id: string;
    jobOpening: string;
    submittedAt: string;
  }>;
};

type AdminPortalProps = {
  sessionEmail: string;
  initialAdmins: AdminAccount[];
  initialUsers: AdminUser[];
  jobCount: number;
};

export function AdminPortal({
  sessionEmail,
  initialAdmins,
  initialUsers,
  jobCount,
}: AdminPortalProps) {
  const totalSubmissions = initialUsers.reduce((sum, user) => sum + user.submissions.length, 0);
  const recentCandidates = [...initialUsers]
    .sort((left, right) => (right.submissions[0]?.submittedAt || "").localeCompare(left.submissions[0]?.submittedAt || ""))
    .slice(0, 5);

  return (
    <PortalShell
      portal="admin"
      sessionEmail={sessionEmail}
      eyebrow="Admin Dashboard"
      title="Hiring operations overview"
      subtitle="Jump into jobs, candidates, and access management from one workspace."
      primaryActionHref="/admin/jobs/new"
      primaryActionLabel="Create Job"
    >
      <div className="space-y-4">
        <section className="grid gap-4 md:grid-cols-4">
          <article className="rounded-[28px] border border-[var(--color-border-strong)] bg-[var(--color-panel)] p-5 shadow-[var(--shadow-soft)]">
            <p className="text-sm text-[var(--color-muted)]">Admins</p>
            <p className="mt-2 text-3xl font-semibold">{initialAdmins.length}</p>
          </article>
          <article className="rounded-[28px] border border-[var(--color-border-strong)] bg-[var(--color-panel)] p-5 shadow-[var(--shadow-soft)]">
            <p className="text-sm text-[var(--color-muted)]">Candidates</p>
            <p className="mt-2 text-3xl font-semibold">{initialUsers.length}</p>
          </article>
          <article className="rounded-[28px] border border-[var(--color-border-strong)] bg-[var(--color-panel)] p-5 shadow-[var(--shadow-soft)]">
            <p className="text-sm text-[var(--color-muted)]">Jobs</p>
            <p className="mt-2 text-3xl font-semibold">{jobCount}</p>
          </article>
          <article className="rounded-[28px] border border-[var(--color-border-strong)] bg-[var(--color-panel)] p-5 shadow-[var(--shadow-soft)]">
            <p className="text-sm text-[var(--color-muted)]">Applications</p>
            <p className="mt-2 text-3xl font-semibold">{totalSubmissions}</p>
          </article>
        </section>

        <section className="grid gap-4 lg:grid-cols-[1.05fr_0.95fr]">
          <article className="rounded-[28px] border border-[var(--color-border-strong)] bg-[var(--color-panel)] p-6 shadow-[var(--shadow-soft)]">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--color-brand-strong)]">
              Quick Links
            </p>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <Link href="/admin/jobs" className="rounded-[24px] border border-[var(--color-border)] bg-white p-5 transition hover:border-[var(--color-border-strong)]">
                <BriefcaseBusiness className="h-5 w-5 text-[var(--color-brand)]" />
                <h2 className="mt-4 text-lg font-semibold">Manage Jobs</h2>
                <p className="mt-2 text-sm leading-6 text-[var(--color-muted)]">Create, edit, publish, and inspect applicants per job.</p>
              </Link>
              <Link href="/admin/candidates" className="rounded-[24px] border border-[var(--color-border)] bg-white p-5 transition hover:border-[var(--color-border-strong)]">
                <Users className="h-5 w-5 text-[var(--color-brand)]" />
                <h2 className="mt-4 text-lg font-semibold">Candidate Directory</h2>
                <p className="mt-2 text-sm leading-6 text-[var(--color-muted)]">See candidate summaries and open full history pages.</p>
              </Link>
              <Link href="/admin/settings" className="rounded-[24px] border border-[var(--color-border)] bg-white p-5 transition hover:border-[var(--color-border-strong)]">
                <Settings className="h-5 w-5 text-[var(--color-brand)]" />
                <h2 className="mt-4 text-lg font-semibold">Admin Settings</h2>
                <p className="mt-2 text-sm leading-6 text-[var(--color-muted)]">Add admins and review current access holders.</p>
              </Link>
              <Link href="/admin/audit" className="rounded-[24px] border border-[var(--color-border)] bg-white p-5 transition hover:border-[var(--color-border-strong)]">
                <ClipboardList className="h-5 w-5 text-[var(--color-brand)]" />
                <h2 className="mt-4 text-lg font-semibold">Audit Trail</h2>
                <p className="mt-2 text-sm leading-6 text-[var(--color-muted)]">Review immutable admin activity and sensitive CV access logs.</p>
              </Link>
            </div>
          </article>

          <article className="rounded-[28px] border border-[var(--color-border-strong)] bg-[var(--color-panel)] p-6 shadow-[var(--shadow-soft)]">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--color-brand-strong)]">
                  Recent Candidates
                </p>
                <h2 className="mt-2 text-2xl font-semibold">Latest activity</h2>
              </div>
              <Link href="/admin/candidates" className="text-sm font-medium text-[var(--color-brand-strong)]">
                View all
              </Link>
            </div>

            <div className="mt-5 space-y-3">
              {recentCandidates.map((user) => (
                <Link
                  key={user.email}
                  href={`/admin/candidates/${encodeURIComponent(user.email)}`}
                  className="block rounded-[24px] border border-[var(--color-border)] bg-white p-4 transition hover:border-[var(--color-border-strong)]"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="font-semibold text-[var(--color-ink)]">
                        {[user.firstName, user.lastName].filter(Boolean).join(" ") || user.email}
                      </h3>
                      <p className="mt-1 text-sm text-[var(--color-muted)]">{user.email}</p>
                    </div>
                    <span className="rounded-full bg-[var(--color-panel-strong)] px-2.5 py-1 text-xs font-semibold text-[var(--color-ink)]">
                      {user.submissions.length}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </article>
        </section>
      </div>
    </PortalShell>
  );
}
