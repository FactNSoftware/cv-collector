import { NextResponse } from "next/server";
import { recordAdminAuditEvent } from "../../../../../lib/audit-log";
import { requireAdminApiSession } from "../../../../../lib/auth-guards";
import {
  getCvSubmissionById,
  deleteCvSubmission,
  updateCvSubmissionReview,
  type CvReviewStatus,
  InvalidApplicationReviewTransitionError,
} from "../../../../../lib/cv-storage";

export const runtime = "nodejs";

type ApplicationPayload = {
  reviewStatus?: CvReviewStatus;
  rejectionReason?: string;
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
    const body = (await request.json()) as ApplicationPayload;

    if (!body.reviewStatus || !["pending", "accepted", "rejected"].includes(body.reviewStatus)) {
      return NextResponse.json(
        { message: "A valid review status is required." },
        { status: 400 },
      );
    }

    const updated = await updateCvSubmissionReview({
      id,
      reviewStatus: body.reviewStatus,
      reviewedBy: auth.session.email,
      rejectionReason: body.rejectionReason,
    });

    if (!updated) {
      return NextResponse.json({ message: "Application not found." }, { status: 404 });
    }

    await recordAdminAuditEvent({
      actorEmail: auth.session.email,
      action: `application.${body.reviewStatus}`,
      targetType: "application",
      targetId: updated.id,
      summary: `Marked application ${updated.jobCode} for ${updated.email} as ${body.reviewStatus}`,
      requestMethod: request.method,
      requestPath: new URL(request.url).pathname,
      userAgent: request.headers.get("user-agent") ?? "",
      details: {
        candidateEmail: updated.email,
        jobCode: updated.jobCode,
        reviewStatus: body.reviewStatus,
        rejectionReason: updated.rejectionReason || undefined,
      },
    });

    return NextResponse.json({
      message: "Application updated successfully.",
      item: updated,
    });
  } catch (error) {
    if (error instanceof InvalidApplicationReviewTransitionError) {
      return NextResponse.json(
        { message: error.message },
        { status: 409 },
      );
    }

    console.error("Failed to update application", error);
    return NextResponse.json(
      { message: "Failed to update application." },
      { status: 500 },
    );
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
    const existing = await getCvSubmissionById(id);
    const deleted = await deleteCvSubmission(id);

    if (!deleted) {
      return NextResponse.json({ message: "Application not found." }, { status: 404 });
    }

    await recordAdminAuditEvent({
      actorEmail: auth.session.email,
      action: "application.delete",
      targetType: "application",
      targetId: id,
      summary: existing
        ? `Deleted application ${existing.jobCode} for ${existing.email}`
        : `Deleted application ${id}`,
      requestMethod: request.method,
      requestPath: new URL(request.url).pathname,
      userAgent: request.headers.get("user-agent") ?? "",
      details: existing
        ? { candidateEmail: existing.email, jobCode: existing.jobCode }
        : undefined,
    });

    return NextResponse.json({ message: "Application deleted successfully." });
  } catch (error) {
    console.error("Failed to delete application", error);
    return NextResponse.json(
      { message: "Failed to delete application." },
      { status: 500 },
    );
  }
}
