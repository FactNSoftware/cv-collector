"use client";

import Link from "next/link";
import {
  Activity,
  BriefcaseBusiness,
  CheckCircle2,
  ClipboardList,
  Clock3,
  Settings,
  Users,
  XCircle,
} from "lucide-react";
import type { AdminAccount } from "../../lib/admin-access";
import type { CvSubmissionRecord } from "../../lib/cv-storage";
import { PortalShell } from "./PortalShell";
import {
  DashboardEmptyState,
  DashboardMetricCard,
  DashboardPanel,
} from "./PortalDashboardPrimitives";

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
  submissions: CvSubmissionRecord[];
  jobCount: number;
};

export function AdminPortal({
  sessionEmail,
  initialAdmins,
  initialUsers,
  submissions,
  jobCount,
}: AdminPortalProps) {
  const totalSubmissions = submissions.length;
  const pendingSubmissions = submissions.filter((submission) => submission.reviewStatus === "pending").length;
  const acceptedSubmissions = submissions.filter((submission) => submission.reviewStatus === "accepted").length;
  const rejectedSubmissions = submissions.filter((submission) => submission.reviewStatus === "rejected").length;
  const atsInProgress = submissions.filter(
    (submission) => submission.atsStatus === "queued" || submission.atsStatus === "processing",
  ).length;
  const recentCandidates = [...initialUsers]
    .sort((left, right) => (right.submissions[0]?.submittedAt || "").localeCompare(left.submissions[0]?.submittedAt || ""))
    .slice(0, 5);
  const recentSubmissions = [...submissions]
    .sort((left, right) => right.submittedAt.localeCompare(left.submittedAt))
    .slice(0, 5);

  return (
    <PortalShell
      portal="admin"
      sessionEmail={sessionEmail}
      eyebrow="Admin Dashboard"
      title="Hiring operations overview"
      subtitle="Track jobs, candidates, review load, and ATS activity from one workspace."
      primaryActionHref="/admin/jobs/new"
      primaryActionLabel="Create Job"
    >
      <div className="space-y-6">
        <section className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
          <DashboardMetricCard
            icon={Users}
            label="Candidates"
            value={initialUsers.length}
            helper={`${pendingSubmissions} pending review`}
          />
          <DashboardMetricCard
            icon={BriefcaseBusiness}
            label="Jobs"
            value={jobCount}
            helper={`${totalSubmissions} total applications`}
          />
          <DashboardMetricCard
            icon={CheckCircle2}
            label="Accepted"
            value={acceptedSubmissions}
            helper={`${rejectedSubmissions} rejected`}
          />
          <DashboardMetricCard
            icon={Activity}
            label="ATS Queue"
            value={atsInProgress}
            helper={`${initialAdmins.length} admin account${initialAdmins.length === 1 ? "" : "s"}`}
          />
        </section>

        <div className="grid gap-6 lg:grid-cols-[1.06fr_0.94fr]">
          <DashboardPanel eyebrow="Quick Links" title="Workspace shortcuts">
            <div className="grid gap-4 sm:grid-cols-2">
              <Link href="/admin/jobs" className="rounded-[16px] border border-[var(--color-border)] bg-white p-5 transition hover:border-[var(--color-border-strong)]">
                <BriefcaseBusiness className="h-5 w-5 text-[var(--color-brand)]" />
                <h3 className="mt-4 text-lg font-semibold text-[var(--color-ink)]">Manage Jobs</h3>
                <p className="mt-2 text-sm leading-6 text-[var(--color-muted)]">Create, edit, publish, and inspect applicants per job.</p>
              </Link>
              <Link href="/admin/candidates" className="rounded-[16px] border border-[var(--color-border)] bg-white p-5 transition hover:border-[var(--color-border-strong)]">
                <Users className="h-5 w-5 text-[var(--color-brand)]" />
                <h3 className="mt-4 text-lg font-semibold text-[var(--color-ink)]">Candidate Directory</h3>
                <p className="mt-2 text-sm leading-6 text-[var(--color-muted)]">Open candidate detail, ATS review, and decision workflows.</p>
              </Link>
              <Link href="/admin/settings" className="rounded-[16px] border border-[var(--color-border)] bg-white p-5 transition hover:border-[var(--color-border-strong)]">
                <Settings className="h-5 w-5 text-[var(--color-brand)]" />
                <h3 className="mt-4 text-lg font-semibold text-[var(--color-ink)]">Admin Settings</h3>
                <p className="mt-2 text-sm leading-6 text-[var(--color-muted)]">Manage admin access, account holders, and operational controls.</p>
              </Link>
              <Link href="/admin/audit" className="rounded-[16px] border border-[var(--color-border)] bg-white p-5 transition hover:border-[var(--color-border-strong)]">
                <ClipboardList className="h-5 w-5 text-[var(--color-brand)]" />
                <h3 className="mt-4 text-lg font-semibold text-[var(--color-ink)]">Audit Trail</h3>
                <p className="mt-2 text-sm leading-6 text-[var(--color-muted)]">Review immutable admin activity and sensitive CV access logs.</p>
              </Link>
            </div>
          </DashboardPanel>

          <DashboardPanel
            eyebrow="Review Queue"
            title="Latest submissions"
            action={<Link href="/admin/candidates" className="text-sm font-medium text-[var(--color-brand-strong)]">View all</Link>}
          >
            <div className="space-y-3">
              {recentSubmissions.length === 0 ? (
                <DashboardEmptyState message="No applications yet." />
              ) : recentSubmissions.map((submission) => (
                <Link
                  key={submission.id}
                  href={`/admin/candidates/${encodeURIComponent(submission.email)}`}
                  className="block rounded-[16px] border border-[var(--color-border)] bg-white p-4 transition hover:border-[var(--color-border-strong)]"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold text-[var(--color-ink)]">
                        {[submission.firstName, submission.lastName].filter(Boolean).join(" ") || submission.email}
                      </p>
                      <p className="mt-1 text-sm text-[var(--color-muted)]">
                        {submission.jobTitle || submission.jobOpening}
                      </p>
                      <p className="mt-2 text-xs text-[var(--color-muted)]">
                        Submitted {new Date(submission.submittedAt).toLocaleString()}
                      </p>
                    </div>
                    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                      submission.reviewStatus === "accepted"
                        ? "bg-emerald-100 text-emerald-700"
                        : submission.reviewStatus === "rejected"
                          ? "bg-rose-100 text-rose-700"
                          : "bg-amber-100 text-amber-700"
                    }`}>
                      {submission.reviewStatus}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </DashboardPanel>
        </div>

        <div className="grid gap-6 lg:grid-cols-[0.98fr_1.02fr]">
          <DashboardPanel eyebrow="Pipeline" title="Queue distribution">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-[16px] border border-[var(--color-border)] bg-white p-5">
                <div className="flex items-center gap-3">
                  <Clock3 className="h-5 w-5 text-amber-600" />
                  <div>
                    <p className="text-sm font-semibold text-[var(--color-ink)]">Pending review</p>
                    <p className="mt-1 text-2xl font-semibold text-[var(--color-ink)]">{pendingSubmissions}</p>
                  </div>
                </div>
              </div>
              <div className="rounded-[16px] border border-[var(--color-border)] bg-white p-5">
                <div className="flex items-center gap-3">
                  <XCircle className="h-5 w-5 text-rose-600" />
                  <div>
                    <p className="text-sm font-semibold text-[var(--color-ink)]">Rejected</p>
                    <p className="mt-1 text-2xl font-semibold text-[var(--color-ink)]">{rejectedSubmissions}</p>
                  </div>
                </div>
              </div>
            </div>
          </DashboardPanel>

          <DashboardPanel eyebrow="Recent Candidates" title="Latest candidate activity">
            <div className="space-y-3">
              {recentCandidates.length === 0 ? (
                <DashboardEmptyState message="No candidate activity yet." />
              ) : recentCandidates.map((user) => (
                <Link
                  key={user.email}
                  href={`/admin/candidates/${encodeURIComponent(user.email)}`}
                  className="block rounded-[16px] border border-[var(--color-border)] bg-white p-4 transition hover:border-[var(--color-border-strong)]"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold text-[var(--color-ink)]">
                        {[user.firstName, user.lastName].filter(Boolean).join(" ") || user.email}
                      </p>
                      <p className="mt-1 text-sm text-[var(--color-muted)]">{user.email}</p>
                    </div>
                    <span className="rounded-full bg-[var(--color-panel-strong)] px-2.5 py-1 text-xs font-semibold text-[var(--color-ink)]">
                      {user.submissions.length}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </DashboardPanel>
        </div>
      </div>
    </PortalShell>
  );
}
