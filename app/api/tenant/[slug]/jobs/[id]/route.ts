import { NextResponse } from "next/server";
import { parseAtsKeywordInput } from "../../../../../../lib/ats";
import {
  requireOrganizationFeatureApiSession,
  requireOrganizationFunctionalityApiSession,
} from "../../../../../../lib/auth-guards";
import { deleteJob, getJobById, upsertJob } from "../../../../../../lib/jobs";

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
  salaryMin?: number | null;
  salaryMax?: number | null;
  salaryVisible?: boolean;
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

export async function PATCH(
  request: Request,
  context: { params: Promise<{ slug: string; id: string }> },
) {
  const { slug, id } = await context.params;
  const auth = await requireOrganizationFeatureApiSession(request, slug, "tenant_jobs", {
    ownerOnly: true,
  });

  if ("response" in auth) {
    return auth.response;
  }

  try {
    const existingJob = await getJobById(id);

    if (!existingJob) {
      return NextResponse.json({ message: "Job not found." }, { status: 404 });
    }

    const body = (await request.json()) as JobPayload;

    if (!body.title?.trim()) {
      return NextResponse.json({ message: "Job title is required." }, { status: 400 });
    }

    const isPublishToggleOnly = Object.keys(body).every((key) => key === "isPublished");

    if (isPublishToggleOnly) {
      const publishAuth = await requireOrganizationFunctionalityApiSession(
        request,
        slug,
        "tenant_jobs",
        "tenant_jobs.publish",
        { ownerOnly: true },
      );

      if ("response" in publishAuth) {
        return publishAuth.response;
      }
    } else {
      const editAuth = await requireOrganizationFunctionalityApiSession(
        request,
        slug,
        "tenant_jobs",
        "tenant_jobs.edit",
        { ownerOnly: true },
      );

      if ("response" in editAuth) {
        return editAuth.response;
      }
    }

    const atsEnabled = Boolean(body.atsEnabled);
    const atsRequiredKeywords = parseAtsKeywordInput(body.atsRequiredKeywords);
    const atsPreferredKeywords = parseAtsKeywordInput(body.atsPreferredKeywords);
    const atsRequiredEducation = parseAtsKeywordInput(body.atsRequiredEducation);
    const atsRequiredCertifications = parseAtsKeywordInput(body.atsRequiredCertifications);
    const atsMinimumYearsExperience =
      typeof body.atsMinimumYearsExperience === "number" ? body.atsMinimumYearsExperience : null;

    const job = await upsertJob({
      id,
      title: body.title.trim(),
      summary: body.summary ?? existingJob.summary,
      descriptionHtml: body.descriptionHtml ?? existingJob.descriptionHtml,
      department: body.department ?? existingJob.department,
      location: body.location ?? existingJob.location,
      employmentType: body.employmentType ?? existingJob.employmentType,
      workplaceType: body.workplaceType ?? existingJob.workplaceType,
      experienceLevel: body.experienceLevel ?? existingJob.experienceLevel,
      salaryCurrency: body.salaryCurrency ?? existingJob.salaryCurrency,
      salaryMin: typeof body.salaryMin !== "undefined" ? body.salaryMin : existingJob.salaryMin,
      salaryMax: typeof body.salaryMax !== "undefined" ? body.salaryMax : existingJob.salaryMax,
      salaryVisible: typeof body.salaryVisible !== "undefined" ? Boolean(body.salaryVisible) : existingJob.salaryVisible,
      vacancies: typeof body.vacancies === "number" ? body.vacancies : existingJob.vacancies,
      maxRetryAttempts: typeof body.maxRetryAttempts === "number" ? body.maxRetryAttempts : existingJob.maxRetryAttempts,
      atsEnabled,
      atsRequiredKeywords,
      atsPreferredKeywords,
      atsMinimumYearsExperience,
      atsRequiredEducation,
      atsRequiredCertifications,
      closingDate: body.closingDate ?? existingJob.closingDate,
      requirements: body.requirements ?? existingJob.requirements,
      benefits: body.benefits ?? existingJob.benefits,
      isPublished: typeof body.isPublished !== "undefined" ? Boolean(body.isPublished) : existingJob.isPublished,
    });

    return NextResponse.json({ item: job });
  } catch {
    return NextResponse.json({ message: "Failed to update job." }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ slug: string; id: string }> },
) {
  const { slug, id } = await context.params;
  const auth = await requireOrganizationFunctionalityApiSession(request, slug, "tenant_jobs", "tenant_jobs.delete", {
    ownerOnly: true,
  });

  if ("response" in auth) {
    return auth.response;
  }

  await deleteJob(id, auth.session.email);
  return NextResponse.json({ message: "Job deleted." });
}
