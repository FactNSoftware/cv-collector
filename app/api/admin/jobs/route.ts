import { NextResponse } from "next/server";
import { buildAdminJobListItems } from "../../../../lib/admin-list-types";
import { parseAtsKeywordInput } from "../../../../lib/ats";
import { recordAdminAuditEvent } from "../../../../lib/audit-log";
import { requireAdminApiSession } from "../../../../lib/auth-guards";
import { listJobs, upsertJob } from "../../../../lib/jobs";
import { listCvSubmissions } from "../../../../lib/cv-storage";
import { getCursorParam, getPageLimit, paginateItems } from "../../../../lib/pagination";

export const runtime = "nodejs";

type JobPayload = {
  title?: string;
  summary?: string;
  descriptionHtml?: string;
  department?: string;
  location?: string;
  employmentType?: string;
  workplaceType?: string;
  experienceLevel?: string;
  salaryCurrency?: string;
  salaryRange?: string;
  vacancies?: number | null;
  maxRetryAttempts?: number | null;
  atsEnabled?: boolean;
  atsRequiredKeywords?: string[] | string;
  atsPreferredKeywords?: string[] | string;
  atsMinimumYearsExperience?: number | null;
  atsRequiredEducation?: string[] | string;
  atsRequiredCertifications?: string[] | string;
  closingDate?: string;
  requirements?: string;
  benefits?: string;
  isPublished?: boolean;
};

export async function GET(request: Request) {
  const auth = await requireAdminApiSession(request);

  if ("response" in auth) {
    return auth.response;
  }

  const url = new URL(request.url);
  const limit = getPageLimit(url.searchParams.get("limit"));
  const cursor = getCursorParam(url.searchParams.get("cursor"));
  const searchQuery = url.searchParams.get("q")?.trim().toLowerCase() ?? "";
  const statusFilter = url.searchParams.get("status")?.trim().toLowerCase() ?? "all";
  const [jobs, submissions] = await Promise.all([
    listJobs(),
    listCvSubmissions(),
  ]);
  const items = buildAdminJobListItems(jobs, submissions).filter((job) => {
    if (statusFilter === "published" && !job.isPublished) {
      return false;
    }

    if (statusFilter === "draft" && job.isPublished) {
      return false;
    }

    if (!searchQuery) {
      return true;
    }

    const haystack = [
      job.code,
      job.title,
      job.summary,
      job.department,
      job.location,
      job.employmentType,
      job.workplaceType,
      job.experienceLevel,
    ].join(" ").toLowerCase();

    return haystack.includes(searchQuery);
  });
  const page = paginateItems(items, limit, cursor);
  return NextResponse.json(page);
}

export async function POST(request: Request) {
  const auth = await requireAdminApiSession(request);

  if ("response" in auth) {
    return auth.response;
  }

  try {
    const body = (await request.json()) as JobPayload;
    const atsEnabled = Boolean(body.atsEnabled);
    const atsRequiredKeywords = parseAtsKeywordInput(body.atsRequiredKeywords);
    const atsPreferredKeywords = parseAtsKeywordInput(body.atsPreferredKeywords);
    const atsRequiredEducation = parseAtsKeywordInput(body.atsRequiredEducation);
    const atsRequiredCertifications = parseAtsKeywordInput(body.atsRequiredCertifications);
    const atsMinimumYearsExperience = typeof body.atsMinimumYearsExperience === "number" ? body.atsMinimumYearsExperience : null;

    if (!body.title?.trim()) {
      return NextResponse.json({ message: "Job title is required." }, { status: 400 });
    }

    const job = await upsertJob({
      title: body.title,
      summary: body.summary ?? "",
      descriptionHtml: body.descriptionHtml ?? "",
      department: body.department ?? "",
      location: body.location ?? "",
      employmentType: body.employmentType ?? "",
      workplaceType: body.workplaceType ?? "",
      experienceLevel: body.experienceLevel ?? "",
      salaryCurrency: body.salaryCurrency ?? "LKR",
      salaryRange: body.salaryRange ?? "",
      vacancies: typeof body.vacancies === "number" ? body.vacancies : null,
      maxRetryAttempts: typeof body.maxRetryAttempts === "number" ? body.maxRetryAttempts : 0,
      atsEnabled,
      atsRequiredKeywords,
      atsPreferredKeywords,
      atsMinimumYearsExperience,
      atsRequiredEducation,
      atsRequiredCertifications,
      closingDate: body.closingDate ?? "",
      requirements: body.requirements ?? "",
      benefits: body.benefits ?? "",
      isPublished: Boolean(body.isPublished),
    });

    await recordAdminAuditEvent({
      actorEmail: auth.session.email,
      action: "job.create",
      targetType: "job",
      targetId: job.id,
      summary: `Created ${job.isPublished ? "published" : "draft"} job ${job.code} - ${job.title}`,
      requestMethod: request.method,
      requestPath: new URL(request.url).pathname,
      userAgent: request.headers.get("user-agent") ?? "",
      details: {
        jobCode: job.code,
        title: job.title,
        isPublished: job.isPublished,
        maxRetryAttempts: job.maxRetryAttempts,
        atsEnabled: job.atsEnabled,
        atsRequiredKeywordCount: job.atsRequiredKeywords.length,
        atsPreferredKeywordCount: job.atsPreferredKeywords.length,
        atsMinimumYearsExperience: job.atsMinimumYearsExperience,
        atsRequiredEducationCount: job.atsRequiredEducation.length,
        atsRequiredCertificationsCount: job.atsRequiredCertifications.length,
      },
    });

    return NextResponse.json({
      message: "Job created successfully.",
      item: job,
    });
  } catch (error) {
    console.error("Failed to create job", error);
    return NextResponse.json({ message: "Failed to create job." }, { status: 500 });
  }
}
