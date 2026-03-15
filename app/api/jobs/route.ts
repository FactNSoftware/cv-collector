import { NextResponse } from "next/server";
import { listJobsPage } from "../../../lib/jobs";
import { getCursorParam, getPageLimit } from "../../../lib/pagination";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const limit = getPageLimit(url.searchParams.get("limit"));
    const cursor = getCursorParam(url.searchParams.get("cursor"));
    const page = await listJobsPage(limit, cursor, true);
    return NextResponse.json(page);
  } catch (error) {
    console.error("Failed to load jobs", error);
    return NextResponse.json({ message: "Failed to load jobs." }, { status: 500 });
  }
}
