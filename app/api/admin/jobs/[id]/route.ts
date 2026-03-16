import { NextResponse } from "next/server";
import { recordAdminAuditEvent } from "../../../../../lib/audit-log";
import { parseAtsKeywordInput } from "../../../../../lib/ats";
import { requireAdminApiSession } from "../../../../../lib/auth-guards";
import { deleteJob, getJobById, upsertJob } from "../../../../../lib/jobs";

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

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdminApiSession(request);

  if ("response" in auth) {
    return auth.response;
  }

  try {
    const { id } = await context.params;
    const existingJob = await getJobById(id);
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
      id,
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

    const action = existingJob && existingJob.isPublished !== job.isPublished
      ? job.isPublished ? "job.publish" : "job.unpublish"
      : "job.update";

    await recordAdminAuditEvent({
      actorEmail: auth.session.email,
      action,
      targetType: "job",
      targetId: job.id,
      summary: `${job.isPublished ? "Saved" : "Updated"} job ${job.code} - ${job.title}`,
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
      message: "Job updated successfully.",
      item: job,
    });
  } catch (error) {
    console.error("Failed to update job", error);
    return NextResponse.json({ message: "Failed to update job." }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdminApiSession(request);

  if ("response" in auth) {
    return auth.response;
  }

  try {
    const { id } = await context.params;
    const job = await getJobById(id);
    await deleteJob(id, auth.session.email);

    await recordAdminAuditEvent({
      actorEmail: auth.session.email,
      action: "job.delete",
      targetType: "job",
      targetId: id,
      summary: job ? `Soft-deleted job ${job.code} - ${job.title}` : `Soft-deleted job ${id}`,
      requestMethod: request.method,
      requestPath: new URL(request.url).pathname,
      userAgent: request.headers.get("user-agent") ?? "",
      details: job ? { jobCode: job.code, title: job.title } : undefined,
    });

    return NextResponse.json({ message: "Job deleted successfully." });
  } catch (error) {
    console.error("Failed to delete job", error);
    return NextResponse.json({ message: "Failed to delete job." }, { status: 500 });
  }
}
