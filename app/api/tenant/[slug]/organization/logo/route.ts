import { NextResponse } from "next/server";
import { requireOrganizationOwnerApiSession } from "../../../../../../lib/auth-guards";
import { PdfValidationError } from "../../../../../../lib/cv-file-service";
import { saveOrganizationLogoImage } from "../../../../../../lib/job-assets";

export const runtime = "nodejs";

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
    const formData = await request.formData();
    const logo = formData.get("logo");

    if (!(logo instanceof File)) {
      return NextResponse.json(
        { message: "Logo file is required." },
        { status: 400 },
      );
    }

    const saved = await saveOrganizationLogoImage({
      fileName: logo.name || "organization-logo",
      mimeType: logo.type,
      fileBuffer: Buffer.from(await logo.arrayBuffer()),
    });

    return NextResponse.json({
      message: "Logo uploaded successfully.",
      item: {
        url: saved.url,
        storedFileName: saved.storedFileName,
        width: saved.dimensions.width,
        height: saved.dimensions.height,
      },
    });
  } catch (error) {
    if (error instanceof PdfValidationError) {
      const isServerProcessingIssue = error.message.includes("on the server right now");

      return NextResponse.json(
        { message: error.message },
        { status: isServerProcessingIssue ? 503 : 400 },
      );
    }

    if (error instanceof Error) {
      return NextResponse.json(
        { message: error.message },
        { status: 400 },
      );
    }

    return NextResponse.json(
      { message: "Failed to upload logo." },
      { status: 500 },
    );
  }
}
