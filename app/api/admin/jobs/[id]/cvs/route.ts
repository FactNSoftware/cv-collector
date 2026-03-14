import JSZip from "jszip";
import { NextResponse } from "next/server";
import {
  CvFileNotFoundError,
  downloadCvUpload,
} from "../../../../../../lib/cv-file-service";
import { requireAdminApiSession } from "../../../../../../lib/auth-guards";
import { getJobById } from "../../../../../../lib/jobs";
import { listCvSubmissionsByJobId } from "../../../../../../lib/cv-storage";

export const runtime = "nodejs";

const toSafeFileName = (value: string) => {
  return value.replace(/[^a-zA-Z0-9._-]+/g, "_").replace(/^_+|_+$/g, "") || "file";
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
    const { id } = await context.params;
    const [job, submissions] = await Promise.all([
      getJobById(id),
      listCvSubmissionsByJobId(id),
    ]);

    if (!job) {
      return NextResponse.json({ message: "Job not found." }, { status: 404 });
    }

    if (submissions.length === 0) {
      return NextResponse.json(
        { message: "No CVs found for this job yet." },
        { status: 404 },
      );
    }

    const zip = new JSZip();

    for (const submission of submissions) {
      try {
        const buffer = await downloadCvUpload(submission.resumeStoredName);
        const candidateName = `${submission.firstName}_${submission.lastName}`.trim();
        const fileName = `${toSafeFileName(submission.jobCode || job.code)}-${toSafeFileName(candidateName || submission.email)}-${toSafeFileName(submission.resumeOriginalName)}`;
        zip.file(fileName, buffer);
      } catch (error) {
        if (!(error instanceof CvFileNotFoundError)) {
          throw error;
        }
      }
    }

    const responseBody = await zip.generateAsync({ type: "arraybuffer" });

    return new NextResponse(responseBody, {
      status: 200,
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${toSafeFileName(job.code)}-cvs.zip"`,
      },
    });
  } catch (error) {
    console.error("Failed to create CV zip", error);
    return NextResponse.json(
      { message: "Failed to download CV zip." },
      { status: 500 },
    );
  }
}
