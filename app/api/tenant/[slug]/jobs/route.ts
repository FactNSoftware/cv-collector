import { NextResponse } from "next/server";
import { parseAtsKeywordInput } from "../../../../../lib/ats";
import { requireOrganizationOwnerApiSession, requireOrganizationAccessApiSession } from "../../../../../lib/auth-guards";
import { listJobs, upsertJob } from "../../../../../lib/jobs";

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

export async function GET(
  request: Request,
  context: { params: Promise<{ slug: string }> },
) {
  const { slug } = await context.params;
  const auth = await requireOrganizationAccessApiSession(request, slug);

  if ("response" in auth) {
    return auth.response;
  }

  const jobs = await listJobs();
  return NextResponse.json({ items: jobs });
}

export async function POST(
  request: Request,
  context: { params: Promise<{ slug: string }> },
) {
  const { slug } = await context.params;
  const auth = await requireOrganizationOwnerApiSession(request, slug);

  if ("response" in auth) {
    return auth.response;
  }

  try {
    const body = (await request.json()) as JobPayload;

    if (!body.title?.trim()) {
      return NextResponse.json({ message: "Job title is required." }, { status: 400 });
    }

    const atsEnabled = Boolean(body.atsEnabled);
    const atsRequiredKeywords = parseAtsKeywordInput(body.atsRequiredKeywords);
    const atsPreferredKeywords = parseAtsKeywordInput(body.atsPreferredKeywords);
    const atsRequiredEducation = parseAtsKeywordInput(body.atsRequiredEducation);
    const atsRequiredCertifications = parseAtsKeywordInput(body.atsRequiredCertifications);
    const atsMinimumYearsExperience =
      typeof body.atsMinimumYearsExperience === "number" ? body.atsMinimumYearsExperience : null;

    const job = await upsertJob({
      title: body.title.trim(),
      summary: body.summary ?? "",
      descriptionHtml: body.descriptionHtml ?? "",
      department: body.department ?? "",
      location: body.location ?? "",
      employmentType: body.employmentType,
      workplaceType: body.workplaceType,
      experienceLevel: body.experienceLevel,
      salaryCurrency: body.salaryCurrency,
      salaryMin: typeof body.salaryMin === "number" ? body.salaryMin : null,
      salaryMax: typeof body.salaryMax === "number" ? body.salaryMax : null,
      salaryVisible: Boolean(body.salaryVisible),
      vacancies: typeof body.vacancies === "number" ? body.vacancies : 1,
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

    return NextResponse.json({ item: job }, { status: 201 });
  } catch {
    return NextResponse.json({ message: "Failed to create job." }, { status: 500 });
  }
}
