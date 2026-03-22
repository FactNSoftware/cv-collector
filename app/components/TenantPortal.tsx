"use client";

import Link from "next/link";
import {
  Briefcase,
  Building2,
  Globe,
  LayoutGrid,
  Settings,
  ShieldCheck,
  Users,
} from "lucide-react";
import { PortalShell } from "./PortalShell";
import type { OrganizationRecord, OrganizationMembership } from "../../lib/organizations";
import { isFeatureEnabled } from "../../lib/feature-catalog";
import type { SubscriptionRecord } from "../../lib/subscriptions";
import type { JobRecord } from "../../lib/jobs";
import type { CvSubmissionRecord } from "../../lib/cv-storage";
import {
  DashboardEmptyState,
  DashboardMetricCard,
  DashboardPanel,
} from "./PortalDashboardPrimitives";

type Props = {
  sessionEmail: string;
  organization: OrganizationRecord;
  membership: OrganizationMembership | null;
  isSuperAdmin: boolean;
  featureKeys: string[];
  effectiveSubscription: SubscriptionRecord | null;
  featureAccessSource: "subscription" | "legacy_default";
  members: OrganizationMembership[];
  jobs: JobRecord[];
  submissions: CvSubmissionRecord[];
};

export function TenantPortal({
  sessionEmail,
  organization,
  membership,
  isSuperAdmin,
  featureKeys,
  effectiveSubscription,
  featureAccessSource,
  members,
  jobs,
  submissions,
}: Props) {
  const role = membership?.role ?? null;
  const isOwnerOrAdmin = isSuperAdmin || role === "owner" || role === "admin";
  const activeJobs = jobs.filter((job) => !job.isDeleted);
  const publishedJobs = activeJobs.filter((job) => job.isPublished);
  const pendingSubmissions = submissions.filter((submission) => submission.reviewStatus === "pending");
  const acceptedSubmissions = submissions.filter((submission) => submission.reviewStatus === "accepted");
  const recentSubmissions = [...submissions]
    .sort((left, right) => right.submittedAt.localeCompare(left.submittedAt))
    .slice(0, 5);

  const ownerCards = [
    isFeatureEnabled(featureKeys, "tenant_jobs")
      ? {
        href: `/o/${organization.slug}/jobs`,
        icon: Briefcase,
        title: "Jobs",
        description: "Manage your open positions and job postings.",
      }
      : null,
    isFeatureEnabled(featureKeys, "tenant_candidates")
      ? {
        href: `/o/${organization.slug}/candidates`,
        icon: Users,
        title: "Candidates",
        description: "Review applicants and manage your pipeline.",
      }
      : null,
    isFeatureEnabled(featureKeys, "tenant_settings")
      ? {
        href: `/o/${organization.slug}/settings`,
        icon: Settings,
        title: "Settings",
        description: "Branding, theme, custom domain, and members.",
      }
      : null,
  ];

  const cards = isOwnerOrAdmin
    ? ownerCards.filter((card): card is NonNullable<(typeof ownerCards)[number]> => card !== null)
    : [
      {
        href: `/o/${organization.slug}/apply`,
        icon: Briefcase,
        title: "Open positions",
        description: "Browse and apply for open roles at this organization.",
      },
      {
        href: `/o/${organization.slug}/applications`,
        icon: LayoutGrid,
        title: "My applications",
        description: "Track the status of your submitted applications.",
      },
    ];

  return (
    <PortalShell
      portal="tenant"
      sessionEmail={sessionEmail}
      organizationSlug={organization.slug}
      tenantFeatureKeys={featureKeys}
      title={organization.name}
      eyebrow="Organization Portal"
      subtitle={`${organization.slug} · ${role ?? (isSuperAdmin ? "super admin" : "")}`}
    >
      <div className="space-y-6">
        <section className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
          <DashboardMetricCard
            icon={Briefcase}
            label="Jobs"
            value={activeJobs.length}
            helper={`${publishedJobs.length} published`}
          />
          <DashboardMetricCard
            icon={Users}
            label="Applications"
            value={submissions.length}
            helper={`${pendingSubmissions.length} pending review`}
          />
          <DashboardMetricCard
            icon={ShieldCheck}
            label="Team"
            value={members.length}
            helper={`${members.filter((member) => member.role === "owner").length} owner${members.filter((member) => member.role === "owner").length === 1 ? "" : "s"}`}
          />
          <DashboardMetricCard
            icon={Settings}
            label="Enabled Features"
            value={featureKeys.length}
            helper={effectiveSubscription?.name ?? "Legacy default access"}
          />
        </section>

        <div className="grid gap-6 lg:grid-cols-[1.06fr_0.94fr]">
          <DashboardPanel eyebrow="Workspace" title="Organization summary">
            <div className="rounded-[16px] border border-[var(--color-border)] bg-[var(--color-panel-strong)] px-5 py-4">
              <div className="flex items-center gap-3">
                {organization.logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={organization.logoUrl}
                    alt={`${organization.name} logo`}
                    className="h-10 w-10 shrink-0 rounded-lg border border-[var(--color-border)] bg-white object-contain p-1"
                  />
                ) : (
                  <Building2 className="h-6 w-6 shrink-0 text-[var(--color-brand-strong)]" />
                )}
                <div>
                  <p className="text-base font-semibold text-[var(--color-ink)]">{organization.name}</p>
                  <p className="text-sm text-[var(--color-muted)]">Portal slug: {organization.slug}</p>
                </div>
              </div>
              {organization.description ? (
                <p className="mt-3 text-sm leading-6 text-[var(--color-muted)]">{organization.description}</p>
              ) : null}
              <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-[var(--color-muted)]">
                <span className="rounded-full border border-[var(--color-border)] bg-[var(--color-panel)] px-3 py-1.5">
                  Plan: {effectiveSubscription?.name ?? "Legacy default access"}
                </span>
                <span className="rounded-full border border-[var(--color-border)] bg-[var(--color-panel)] px-3 py-1.5">
                  Source: {featureAccessSource === "subscription" ? "subscription" : "default"}
                </span>
                <span className="rounded-full border border-[var(--color-border)] bg-[var(--color-panel)] px-3 py-1.5">
                  Accepted applications: {acceptedSubmissions.length}
                </span>
              </div>
            </div>

            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              {cards.map(({ href, icon: Icon, title, description }) => (
                <Link
                  key={href}
                  href={href}
                  className="group rounded-[16px] border border-[var(--color-border)] bg-white p-5 transition hover:border-[var(--color-border-strong)]"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[var(--color-panel-strong)]">
                    <Icon className="h-5 w-5 text-[var(--color-brand-strong)]" />
                  </div>
                  <p className="mt-4 font-semibold text-[var(--color-ink)] group-hover:text-[var(--color-brand-strong)]">
                    {title}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-[var(--color-muted)]">{description}</p>
                </Link>
              ))}
            </div>

            {isOwnerOrAdmin && cards.length === 0 ? (
              <div className="mt-4">
                <DashboardEmptyState message="This organization currently has no active tenant admin features assigned. Add or update a subscription from the system subscriptions page." />
              </div>
            ) : null}
          </DashboardPanel>

          <DashboardPanel
            eyebrow="Recent Applications"
            title="Latest candidate activity"
            action={isFeatureEnabled(featureKeys, "tenant_candidates") ? (
              <Link href={`/o/${organization.slug}/candidates`} className="text-sm font-medium text-[var(--color-brand-strong)]">
                View pipeline
              </Link>
            ) : undefined}
          >
            <div className="space-y-3">
              {recentSubmissions.length === 0 ? (
                <DashboardEmptyState message="No applications yet." />
              ) : recentSubmissions.map((submission) => (
                <div
                  key={submission.id}
                  className="rounded-[16px] border border-[var(--color-border)] bg-white p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold text-[var(--color-ink)]">
                        {[submission.firstName, submission.lastName].filter(Boolean).join(" ") || submission.email}
                      </p>
                      <p className="mt-1 text-sm text-[var(--color-muted)]">{submission.jobTitle || submission.jobOpening}</p>
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
                </div>
              ))}
            </div>
          </DashboardPanel>
        </div>

        {(role === "owner" || isSuperAdmin) && isFeatureEnabled(featureKeys, "tenant_settings") ? (
          <DashboardPanel eyebrow="Setup" title="Complete your workspace">
            <div className="flex items-start gap-4 rounded-[16px] border border-[var(--color-border)] bg-white p-5">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[var(--color-panel-strong)]">
                <Globe className="h-5 w-5 text-[var(--color-brand-strong)]" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-[var(--color-ink)]">Complete your setup</p>
                <p className="mt-1 text-sm leading-6 text-[var(--color-muted)]">
                  Add your branding, invite team members, and configure your custom domain in Settings.
                </p>
                <Link
                  href={`/o/${organization.slug}/settings`}
                  className="mt-3 inline-block text-sm font-medium text-[var(--color-brand-strong)] underline underline-offset-2"
                >
                  Go to settings →
                </Link>
              </div>
            </div>
          </DashboardPanel>
        ) : null}
      </div>
    </PortalShell>
  );
}
