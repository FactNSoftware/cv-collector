import { NextResponse } from "next/server";
import { requireAdminApiSession } from "../../../../../lib/auth-guards";
import { deleteJob, upsertJob } from "../../../../../lib/jobs";

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
    const body = (await request.json()) as JobPayload;

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
      closingDate: body.closingDate ?? "",
      requirements: body.requirements ?? "",
      benefits: body.benefits ?? "",
      isPublished: Boolean(body.isPublished),
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
    await deleteJob(id);
    return NextResponse.json({ message: "Job deleted successfully." });
  } catch (error) {
    console.error("Failed to delete job", error);
    return NextResponse.json({ message: "Failed to delete job." }, { status: 500 });
  }
}
