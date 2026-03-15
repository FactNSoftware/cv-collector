import { NextResponse } from "next/server";
import { recordAdminAuditEvent } from "../../../../lib/audit-log";
import { requireAdminApiSession } from "../../../../lib/auth-guards";
import { PdfValidationError } from "../../../../lib/cv-file-service";
import { saveJobDescriptionImage } from "../../../../lib/job-assets";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const auth = await requireAdminApiSession(request);

  if ("response" in auth) {
    return auth.response;
  }

  try {
    const formData = await request.formData();
    const image = formData.get("image");

    if (!(image instanceof File)) {
      return NextResponse.json(
        { message: "Image file is required." },
        { status: 400 },
      );
    }

    const saved = await saveJobDescriptionImage({
      fileName: image.name || "job-image",
      mimeType: image.type,
      fileBuffer: Buffer.from(await image.arrayBuffer()),
    });

    await recordAdminAuditEvent({
      actorEmail: auth.session.email,
      action: "job_asset.upload",
      targetType: "job_asset",
      targetId: saved.storedFileName,
      summary: `Uploaded job description image ${image.name || "job-image"}`,
      requestMethod: request.method,
      requestPath: new URL(request.url).pathname,
      userAgent: request.headers.get("user-agent") ?? "",
    });

    return NextResponse.json({
      message: "Image uploaded successfully.",
      item: {
        url: saved.url,
        storedFileName: saved.storedFileName,
      },
    });
  } catch (error) {
    if (error instanceof PdfValidationError) {
      return NextResponse.json({ message: error.message }, { status: 400 });
    }

    console.error("Failed to upload job asset", error);
    return NextResponse.json(
      { message: "Failed to upload image." },
      { status: 500 },
    );
  }
}
