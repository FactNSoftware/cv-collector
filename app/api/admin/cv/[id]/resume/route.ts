import { NextResponse } from "next/server";
import {
  CvFileNotFoundError,
  downloadCvUpload,
} from "../../../../../../lib/cv-file-service";
import { requireAdminApiSession } from "../../../../../../lib/auth-guards";
import { getCvSubmissionById } from "../../../../../../lib/cv-storage";

export const runtime = "nodejs";

const toSafeDownloadName = (fileName: string) => {
  return fileName.replace(/[\r\n"]/g, "_");
};

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdminApiSession(request);

  if ("response" in auth) {
    return auth.response;
  }

  try {
    const url = new URL(request.url);
    const disposition = url.searchParams.get("disposition") === "inline"
      ? "inline"
      : "attachment";
    const { id } = await context.params;
    const submission = await getCvSubmissionById(id);

    if (!submission) {
      return NextResponse.json({ message: "CV not found." }, { status: 404 });
    }

    const fileBytes = await downloadCvUpload(submission.resumeStoredName);

    return new NextResponse(new Uint8Array(fileBytes), {
      status: 200,
      headers: {
        "Content-Type": submission.resumeMimeType || "application/pdf",
        "Content-Disposition": `${disposition}; filename="${toSafeDownloadName(submission.resumeOriginalName)}"`,
      },
    });
  } catch (error) {
    if (error instanceof CvFileNotFoundError) {
      return NextResponse.json(
        { message: "CV file not found." },
        { status: 404 },
      );
    }

    console.error("Failed to read admin CV file", error);
    return NextResponse.json(
      { message: "Failed to download CV file." },
      { status: 500 },
    );
  }
}
