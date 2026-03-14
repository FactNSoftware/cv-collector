import { NextResponse } from "next/server";
import { listPublishedJobs } from "../../../lib/jobs";

export const runtime = "nodejs";

export async function GET() {
  try {
    const jobs = await listPublishedJobs();
    return NextResponse.json({ items: jobs });
  } catch (error) {
    console.error("Failed to load jobs", error);
    return NextResponse.json({ message: "Failed to load jobs." }, { status: 500 });
  }
}
