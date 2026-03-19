import { NextResponse } from "next/server";
import { listOrganizations } from "../../../../lib/organizations";
import { listSuperAdminAccounts } from "../../../../lib/super-admin-access";
import { listCandidateProfiles } from "../../../../lib/candidate-profile";
import { listJobs } from "../../../../lib/jobs";
import { listCvSubmissions } from "../../../../lib/cv-storage";
import { listAdminAuditEvents } from "../../../../lib/audit-log";
import { requireSuperAdminApiSession } from "../../../../lib/auth-guards";

export const runtime = "nodejs";

const DAY_MS = 24 * 60 * 60 * 1000;

const getTimestamp = (value: string | null | undefined) => {
  if (!value) {
    return null;
  }

  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const countItemsInWindow = <T,>(
  items: T[],
  getCreatedAt: (item: T) => string | null | undefined,
  startInclusive: number,
  endExclusive: number,
) => {
  return items.reduce((count, item) => {
    const timestamp = getTimestamp(getCreatedAt(item));

    if (timestamp === null) {
      return count;
    }

    return timestamp >= startInclusive && timestamp < endExclusive ? count + 1 : count;
  }, 0);
};

const buildTrend = <T,>(
  items: T[],
  getCreatedAt: (item: T) => string | null | undefined,
  currentStartInclusive: number,
  currentEndExclusive: number,
  previousStartInclusive: number,
  previousEndExclusive: number,
) => {
  const current = countItemsInWindow(
    items,
    getCreatedAt,
    currentStartInclusive,
    currentEndExclusive,
  );
  const previous = countItemsInWindow(
    items,
    getCreatedAt,
    previousStartInclusive,
    previousEndExclusive,
  );
  const percentChange = previous === 0
    ? (current > 0 ? 100 : 0)
    : ((current - previous) / previous) * 100;

  return {
    current,
    previous,
    percentChange: percentChange.toFixed(1),
  };
};

export async function GET(request: Request) {
  const auth = await requireSuperAdminApiSession(request);

  if ("response" in auth) {
    return auth.response;
  }

  try {
    const organizations = await listOrganizations();
    const superAdmins = await listSuperAdminAccounts();
    const candidateProfiles = await listCandidateProfiles();
    const jobs = await listJobs();
    const cvSubmissions = await listCvSubmissions();
    const auditEvents = await listAdminAuditEvents();

    // Calculate key metrics
    const totalOrganizations = organizations.length;
    const activeOrganizations = organizations.filter((org) => org.status === "active").length;
    const suspendedOrganizations = organizations.filter((org) => org.status === "suspended").length;
    const totalSuperAdmins = superAdmins.length;

    // Candidate and application metrics
    const totalCandidates = candidateProfiles.length;
    const totalJobs = jobs.length;
    const activeJobs = jobs.filter((job) => job.isPublished && !job.isDeleted).length;
    const totalApplications = cvSubmissions.filter((app) => !app.isDeleted).length;

    // Calculate trends using matching 7-day date windows based on creation/submission timestamps.
    const now = Date.now();
    const currentWindowStart = now - (7 * DAY_MS);
    const previousWindowStart = now - (14 * DAY_MS);

    const organizationTrend = buildTrend(
      organizations,
      (organization) => organization.createdAt,
      currentWindowStart,
      now,
      previousWindowStart,
      currentWindowStart,
    );
    const candidateTrend = buildTrend(
      candidateProfiles,
      (candidate) => candidate.createdAt,
      currentWindowStart,
      now,
      previousWindowStart,
      currentWindowStart,
    );
    const applicationTrend = buildTrend(
      cvSubmissions.filter((submission) => !submission.isDeleted),
      (submission) => submission.submittedAt,
      currentWindowStart,
      now,
      previousWindowStart,
      currentWindowStart,
    );

    // Organization status distribution (for chart)
    const statusDistribution = {
      active: activeOrganizations,
      suspended: suspendedOrganizations,
    };

    // Recent organizations (last 5)
    const recentOrganizations = organizations
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 5);

    // Top performing jobs (by application count)
    const jobAppCounts = new Map<string, number>();
    cvSubmissions.forEach((app) => {
      const jobId = app.jobId;
      jobAppCounts.set(jobId, (jobAppCounts.get(jobId) || 0) + 1);
    });

    const topJobs = jobs
      .map((job) => ({
        id: job.id,
        title: job.title,
        applications: jobAppCounts.get(job.id) || 0,
      }))
      .sort((a, b) => b.applications - a.applications)
      .slice(0, 5);

    // Audit summary
    const auditSummary = {
      totalEvents: auditEvents.length,
      recentEvents: auditEvents.slice(0, 5),
      eventsByAction: auditEvents.reduce(
        (acc, event) => {
          acc[event.action] = (acc[event.action] || 0) + 1;
          return acc;
        },
        {} as Record<string, number>,
      ),
    };

    const analytics = {
      summary: {
        totalOrganizations,
        activeOrganizations,
        suspendedOrganizations,
        totalSuperAdmins,
        totalCandidates,
        totalJobs,
        activeJobs,
        totalApplications,
      },
      trends: {
        organizationChange: {
          current: organizationTrend.current,
          previous: organizationTrend.previous,
          percentChange: organizationTrend.percentChange,
        },
        candidateChange: candidateTrend,
        applicationChange: {
          current: applicationTrend.current,
          previous: applicationTrend.previous,
          percentChange: applicationTrend.percentChange,
        },
      },
      statusDistribution,
      recentOrganizations: recentOrganizations.map((org) => ({
        name: org.name,
        slug: org.slug,
        status: org.status,
        createdAt: org.createdAt,
        rootOwnerEmail: org.rootOwnerEmail,
      })),
      topJobs,
      auditSummary,
      systemHealth: {
        timestamp: new Date().toISOString(),
        activeConnections: totalCandidates,
        dataPoints: totalApplications,
      },
    };

    return NextResponse.json(analytics);
  } catch (error) {
    console.error("Failed to fetch analytics", error);
    return NextResponse.json(
      { message: "Failed to fetch analytics." },
      { status: 500 },
    );
  }
}
