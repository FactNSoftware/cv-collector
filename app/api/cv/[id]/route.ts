import { NextResponse } from "next/server";
import { requireApiSession } from "../../../../lib/auth-guards";
import { deleteCvSubmission, getCvSubmissionById } from "../../../../lib/cv-storage";

export const runtime = "nodejs";

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await requireApiSession(request);

  if ("response" in auth) {
    return auth.response;
  }

  try {
    const { id } = await context.params;
    const submission = await getCvSubmissionById(id);

    if (!submission || submission.email !== auth.session.email) {
      return NextResponse.json({ message: "Application not found." }, { status: 404 });
    }

    await deleteCvSubmission(id);

    return NextResponse.json({
      message: "Application withdrawn successfully. You can apply again now.",
    });
  } catch (error) {
    console.error("Failed to withdraw application", error);
    return NextResponse.json(
      { message: "Failed to withdraw application." },
      { status: 500 },
    );
  }
}
