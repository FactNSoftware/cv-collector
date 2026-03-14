import { NextResponse } from "next/server";
import { CvFileNotFoundError } from "../../../../lib/cv-file-service";
import { getJobDescriptionImage } from "../../../../lib/job-assets";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  context: { params: Promise<{ path: string[] }> },
) {
  try {
    const { path } = await context.params;
    const asset = await getJobDescriptionImage(path);
    const body = new Uint8Array(asset.buffer);

    return new NextResponse(body, {
      status: 200,
      headers: {
        "Content-Type": asset.mimeType,
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch (error) {
    if (error instanceof CvFileNotFoundError) {
      return NextResponse.json({ message: error.message }, { status: 404 });
    }

    console.error("Failed to download job asset", error);
    return NextResponse.json(
      { message: "Failed to load image." },
      { status: 500 },
    );
  }
}
