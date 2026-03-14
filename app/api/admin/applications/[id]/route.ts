import { NextResponse } from "next/server";
import { requireAdminApiSession } from "../../../../../lib/auth-guards";
import {
  deleteCvSubmission,
  updateCvSubmissionReview,
  type CvReviewStatus,
} from "../../../../../lib/cv-storage";

export const runtime = "nodejs";

type ApplicationPayload = {
  reviewStatus?: CvReviewStatus;
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
    });

    if (!updated) {
      return NextResponse.json({ message: "Application not found." }, { status: 404 });
    }

    return NextResponse.json({
      message: "Application updated successfully.",
      item: updated,
    });
  } catch (error) {
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
    const deleted = await deleteCvSubmission(id);

    if (!deleted) {
      return NextResponse.json({ message: "Application not found." }, { status: 404 });
    }

    return NextResponse.json({ message: "Application deleted successfully." });
  } catch (error) {
    console.error("Failed to delete application", error);
    return NextResponse.json(
      { message: "Failed to delete application." },
      { status: 500 },
    );
  }
}
