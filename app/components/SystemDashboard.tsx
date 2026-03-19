"use client";

import { useEffect, useState } from "react";
import {
  Building2,
  Users,
  TrendingUp,
  AlertCircle,
  Briefcase,
  FilePlus,
  ArrowUp,
  ArrowDown,
  Activity,
} from "lucide-react";
import { PortalShell } from "./PortalShell";
import { useToast } from "./ToastProvider";
import { SystemDashboardSkeleton } from "./SystemDashboardSkeleton";

type AnalyticsData = {
  summary: {
    totalOrganizations: number;
    activeOrganizations: number;
    suspendedOrganizations: number;
    totalSuperAdmins: number;
    totalCandidates: number;
    totalJobs: number;
    activeJobs: number;
    totalApplications: number;
  };
  trends: {
    organizationChange: {
      current: number;
      previous: number;
      percentChange: string;
    };
    candidateChange: {
      current: number;
      previous: number;
      percentChange: string;
    };
    applicationChange: {
      current: number;
      previous: number;
      percentChange: string;
    };
  };
  statusDistribution: {
    active: number;
    suspended: number;
  };
  recentOrganizations: Array<{
    name: string;
    slug: string;
    status: string;
    createdAt: string;
    rootOwnerEmail: string;
  }>;
  topJobs: Array<{
    id: string;
    title: string;
    applications: number;
  }>;
  auditSummary: {
    totalEvents: number;
    recentEvents: Array<{
      actorEmail: string;
      action: string;
      summary: string;
      createdAt: number;
    }>;
    eventsByAction: Record<string, number>;
  };
  systemHealth: {
    timestamp: string;
    activeConnections: number;
    dataPoints: number;
  };
};

type MetricCardProps = {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number;
  trend?: {
    current: number;
    previous: number;
    percentChange: string;
  };
  suffix?: string;
};

function MetricCard({ icon: Icon, label, value, trend, suffix = "" }: MetricCardProps) {
  const percentChange = trend ? parseFloat(trend.percentChange) : 0;
  const isPositive = percentChange >= 0;

  return (
    <div className="rounded-[16px] border border-[var(--color-border)] bg-[var(--color-panel)] p-6">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-xs font-medium uppercase tracking-[0.15em] text-[var(--color-muted)]">
            {label}
          </p>
          <p className="mt-2 text-4xl font-bold text-[var(--color-ink)]">
            {value}
            <span className="text-base text-[var(--color-muted)]">{suffix}</span>
          </p>
          {trend && (
            <div className="mt-3 space-y-1">
              <p className="text-xs text-[var(--color-muted)]">
                7-day change: {trend.current} vs {trend.previous} last week
              </p>
              <div className="flex items-center gap-1">
                {isPositive ? (
                  <ArrowUp className="h-4 w-4 text-green-600" />
                ) : (
                  <ArrowDown className="h-4 w-4 text-amber-600" />
                )}
                <span
                  className={`text-sm font-semibold ${
                    isPositive ? "text-green-600" : "text-amber-600"
                  }`}
                >
                  {percentChange > 0 ? "+" : ""}
                  {percentChange.toFixed(1)}%
                </span>
              </div>
            </div>
          )}
        </div>
        <div className="ml-4 rounded-xl bg-[var(--color-canvas)] p-3">
          <Icon className="h-6 w-6 text-[var(--color-brand-strong)]" />
        </div>
      </div>
    </div>
  );
}

function StatusChart({
  distribution,
}: {
  distribution: { active: number; suspended: number };
}) {
  const total = Object.values(distribution).reduce((a, b) => a + b, 0);
  if (total === 0) return null;

  const percentages = {
    active: total > 0 ? (distribution.active / total) * 100 : 0,
    suspended: total > 0 ? (distribution.suspended / total) * 100 : 0,
  };

  return (
    <div className="rounded-[16px] border border-[var(--color-border)] bg-[var(--color-panel)] p-6">
      <h3 className="mb-4 text-sm font-semibold text-[var(--color-ink)]">Organization Status</h3>

      {/* Bar chart */}
      <div className="space-y-4">
        {(["active", "suspended"] as const).map((status) => (
          <div key={status}>
            <div className="mb-1 flex items-center justify-between">
              <span className="text-xs font-medium text-[var(--color-muted)] capitalize">
                {status}
              </span>
              <span className="text-sm font-semibold text-[var(--color-ink)]">
                {distribution[status]} ({percentages[status].toFixed(0)}%)
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-[var(--color-canvas)]">
              <div
                className={`h-full transition-all ${
                  status === "active"
                    ? "bg-green-600"
                    : "bg-amber-600"
                }`}
                style={{ width: `${percentages[status]}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function RecentOrgsList({ organizations }: { organizations: AnalyticsData["recentOrganizations"] }) {
  if (organizations.length === 0) {
    return (
      <div className="rounded-[16px] border border-[var(--color-border)] bg-[var(--color-panel)] p-6">
        <h3 className="mb-4 text-sm font-semibold text-[var(--color-ink)]">Recent Organizations</h3>
        <p className="text-center text-sm text-[var(--color-muted)]">No organizations yet.</p>
      </div>
    );
  }

  return (
    <div className="rounded-[16px] border border-[var(--color-border)] bg-[var(--color-panel)]">
      <div className="border-b border-[var(--color-border)] px-6 py-4">
        <h3 className="text-sm font-semibold text-[var(--color-ink)]">Recent Organizations</h3>
      </div>
      <div className="divide-y divide-[var(--color-border)]">
        {organizations.map((org) => (
          <div key={org.slug} className="px-6 py-4 hover:bg-[var(--color-canvas)]">
            <div className="flex items-start justify-between">
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-[var(--color-ink)]">{org.name}</p>
                <p className="mt-0.5 text-xs text-[var(--color-muted)]">{org.slug}</p>
                <p className="mt-1 text-xs text-[var(--color-muted)]">
                  Owner: {org.rootOwnerEmail}
                </p>
              </div>
              <div className="ml-4 flex flex-shrink-0 items-center gap-2">
                <span
                  className={`rounded-full px-2 py-1 text-xs font-medium ${
                    org.status === "active"
                      ? "bg-green-100 text-green-700"
                      : "bg-amber-100 text-amber-700"
                  }`}
                >
                  {org.status}
                </span>
              </div>
            </div>
            <p className="mt-2 text-xs text-[var(--color-muted)]">
              Added {new Date(org.createdAt).toLocaleDateString()}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

function TopJobsList({ jobs }: { jobs: AnalyticsData["topJobs"] }) {
  if (jobs.length === 0) {
    return (
      <div className="rounded-[16px] border border-[var(--color-border)] bg-[var(--color-panel)] p-6">
        <h3 className="mb-4 text-sm font-semibold text-[var(--color-ink)]">Top Jobs</h3>
        <p className="text-center text-sm text-[var(--color-muted)]">No jobs with applications yet.</p>
      </div>
    );
  }

  return (
    <div className="rounded-[16px] border border-[var(--color-border)] bg-[var(--color-panel)]">
      <div className="border-b border-[var(--color-border)] px-6 py-4">
        <h3 className="text-sm font-semibold text-[var(--color-ink)]">Top Jobs by Applications</h3>
      </div>
      <div className="divide-y divide-[var(--color-border)]">
        {jobs.map((job) => (
          <div
            key={job.id}
            className="flex items-center justify-between px-6 py-4 hover:bg-[var(--color-canvas)]"
          >
            <div className="flex-1">
              <p className="font-medium text-[var(--color-ink)]">{job.title}</p>
              <p className="mt-0.5 text-xs text-[var(--color-muted)]">ID: {job.id}</p>
            </div>
            <div className="ml-4 flex items-center gap-3">
              <Briefcase className="h-4 w-4 text-[var(--color-muted)]" />
              <span className="rounded-lg bg-[var(--color-canvas)] px-3 py-1 text-sm font-semibold text-[var(--color-ink)]">
                {job.applications}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function RecentAuditLog({ events }: { events: AnalyticsData["auditSummary"]["recentEvents"] }) {
  if (events.length === 0) {
    return (
      <div className="rounded-[16px] border border-[var(--color-border)] bg-[var(--color-panel)] p-6">
        <h3 className="mb-4 text-sm font-semibold text-[var(--color-ink)]">Recent Activity</h3>
        <p className="text-center text-sm text-[var(--color-muted)]">No activity yet.</p>
      </div>
    );
  }

  return (
    <div className="rounded-[16px] border border-[var(--color-border)] bg-[var(--color-panel)]">
      <div className="border-b border-[var(--color-border)] px-6 py-4">
        <h3 className="text-sm font-semibold text-[var(--color-ink)]">Recent System Activity</h3>
      </div>
      <div className="divide-y divide-[var(--color-border)]">
        {events.map((event, idx) => (
          <div key={idx} className="px-6 py-4 hover:bg-[var(--color-canvas)]">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-xs font-semibold uppercase tracking-[0.1em] text-[var(--color-brand-strong)]">
                  {event.action}
                </p>
                <p className="mt-1 text-sm text-[var(--color-ink)]">{event.summary}</p>
                <p className="mt-1 text-xs text-[var(--color-muted)]">by {event.actorEmail}</p>
              </div>
              <div className="ml-4 flex-shrink-0 text-xs text-[var(--color-muted)]">
                {new Date(event.createdAt).toLocaleDateString()}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

type SystemDashboardProps = {
  sessionEmail: string;
};

export function SystemDashboard({ sessionEmail }: SystemDashboardProps) {
  const { showToast } = useToast();
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchAnalytics = async () => {
      setIsLoading(true);
      try {
        const response = await fetch("/api/super-admin/analytics");
        const payload = await response.json().catch(() => ({}));

        if (!response.ok) {
          showToast(payload.message || "Failed to load analytics.", "error");
          return;
        }

        setAnalytics(payload);
      } catch {
        showToast("Something went wrong.", "error");
      } finally {
        setIsLoading(false);
      }
    };

    void fetchAnalytics();
  }, [showToast]);

  if (isLoading) {
    return (
      <PortalShell
        portal="system"
        sessionEmail={sessionEmail}
        eyebrow="System"
        title="Dashboard"
        subtitle="System-wide analytics and metrics"
      >
        <SystemDashboardSkeleton />
      </PortalShell>
    );
  }

  if (!analytics) {
    return (
      <PortalShell
        portal="system"
        sessionEmail={sessionEmail}
        eyebrow="System"
        title="Dashboard"
        subtitle="System-wide analytics and metrics"
      >
        <div className="mx-auto max-w-6xl">
          <div className="rounded-[16px] border border-[var(--color-border)] bg-[var(--color-panel)] p-8">
            <div className="flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-amber-600" />
              <p className="text-sm text-[var(--color-muted)]">Failed to load analytics data.</p>
            </div>
          </div>
        </div>
      </PortalShell>
    );
  }

  return (
    <PortalShell
      portal="system"
      sessionEmail={sessionEmail}
      eyebrow="System"
      title="Dashboard"
      subtitle="System-wide analytics and metrics"
    >
      <div className="mx-auto max-w-7xl space-y-8">
        {/* Top level metrics */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCard
            icon={Building2}
            label="Organizations"
            value={analytics.summary.totalOrganizations}
            trend={analytics.trends.organizationChange}
          />
          <MetricCard
            icon={Users}
            label="Candidates"
            value={analytics.summary.totalCandidates}
            trend={analytics.trends.candidateChange}
          />
          <MetricCard
            icon={Briefcase}
            label="All Jobs"
            value={analytics.summary.totalJobs}
          />
          <MetricCard
            icon={FilePlus}
            label="Applications"
            value={analytics.summary.totalApplications}
            trend={analytics.trends.applicationChange}
          />
        </div>

        {/* Secondary metrics */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCard
            icon={TrendingUp}
            label="Active Organizations"
            value={analytics.summary.activeOrganizations}
          />
          <MetricCard
            icon={AlertCircle}
            label="Suspended Organizations"
            value={analytics.summary.suspendedOrganizations}
          />
          <MetricCard
            icon={Activity}
            label="Active Jobs"
            value={analytics.summary.activeJobs}
          />
          <MetricCard
            icon={Users}
            label="Super Admins"
            value={analytics.summary.totalSuperAdmins}
          />
        </div>

        {/* Charts and detailed sections */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <StatusChart distribution={analytics.statusDistribution} />

          <div className="rounded-[16px] border border-[var(--color-border)] bg-[var(--color-panel)] p-6">
            <h3 className="mb-4 text-sm font-semibold text-[var(--color-ink)]">System Health</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between rounded-lg bg-[var(--color-canvas)] p-4">
                <span className="flex items-center gap-2 text-sm text-[var(--color-muted)]">
                  <Activity className="h-4 w-4" />
                  Active Connections
                </span>
                <span className="text-lg font-semibold text-[var(--color-ink)]">
                  {analytics.systemHealth.activeConnections}
                </span>
              </div>
              <div className="flex items-center justify-between rounded-lg bg-[var(--color-canvas)] p-4">
                <span className="flex items-center gap-2 text-sm text-[var(--color-muted)]">
                  <FilePlus className="h-4 w-4" />
                  Data Points
                </span>
                <span className="text-lg font-semibold text-[var(--color-ink)]">
                  {analytics.systemHealth.dataPoints}
                </span>
              </div>
              <div className="border-t border-[var(--color-border)] pt-4">
                <p className="text-xs text-[var(--color-muted)]">
                  Last updated: {new Date(analytics.systemHealth.timestamp).toLocaleString()}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Top jobs and audit log */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <TopJobsList jobs={analytics.topJobs} />
          <RecentAuditLog events={analytics.auditSummary.recentEvents} />
        </div>

        {/* Recent organizations */}
        <RecentOrgsList organizations={analytics.recentOrganizations} />
      </div>
    </PortalShell>
  );
}
