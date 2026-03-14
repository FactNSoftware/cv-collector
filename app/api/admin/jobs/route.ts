import { NextResponse } from "next/server";
import { requireAdminApiSession } from "../../../../lib/auth-guards";
import { listJobs, upsertJob } from "../../../../lib/jobs";

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

  const jobs = await listJobs();
  return NextResponse.json({ items: jobs });
}

export async function POST(request: Request) {
  const auth = await requireAdminApiSession(request);

  if ("response" in auth) {
    return auth.response;
  }

  try {
    const body = (await request.json()) as JobPayload;

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
      closingDate: body.closingDate ?? "",
      requirements: body.requirements ?? "",
      benefits: body.benefits ?? "",
      isPublished: Boolean(body.isPublished),
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
