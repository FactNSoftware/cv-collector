import { NextResponse } from "next/server";
import { recordAdminAuditEvent } from "../../../../lib/audit-log";
import { requireAdminApiSession } from "../../../../lib/auth-guards";
import {
  createAdminAccount,
  listAdminAccounts,
} from "../../../../lib/admin-access";
import { ensureCandidateProfile } from "../../../../lib/candidate-profile";
import { getCursorParam, getPageLimit, paginateItems } from "../../../../lib/pagination";

export const runtime = "nodejs";

type CreateAdminPayload = {
  email?: string;
};

export async function GET(request: Request) {
  const auth = await requireAdminApiSession(request);

  if ("response" in auth) {
    return auth.response;
  }

  const url = new URL(request.url);
  const limit = getPageLimit(url.searchParams.get("limit"));
  const cursor = getCursorParam(url.searchParams.get("cursor"));
  const searchQuery = url.searchParams.get("q")?.trim().toLowerCase() ?? "";
  const items = (await listAdminAccounts()).filter((admin) => {
    if (!searchQuery) {
      return true;
    }

    return [
      admin.email,
      admin.createdBy,
    ].join(" ").toLowerCase().includes(searchQuery);
  });
  const page = paginateItems(items, limit, cursor);
  return NextResponse.json(page);
}

export async function POST(request: Request) {
  const auth = await requireAdminApiSession(request);

  if ("response" in auth) {
    return auth.response;
  }

  try {
    const body = (await request.json()) as CreateAdminPayload;
    const email = typeof body.email === "string" ? body.email.trim() : "";

    if (!email) {
      return NextResponse.json({ message: "Email is required." }, { status: 400 });
    }

    await ensureCandidateProfile(email);
    const admin = await createAdminAccount(email, auth.session.email);

    await recordAdminAuditEvent({
      actorEmail: auth.session.email,
      action: "admin.create",
      targetType: "admin_account",
      targetId: admin.email,
      summary: `Granted admin access to ${admin.email}`,
      requestMethod: request.method,
      requestPath: new URL(request.url).pathname,
      userAgent: request.headers.get("user-agent") ?? "",
    });

    return NextResponse.json({
      message: "Admin account created successfully.",
      item: admin,
    });
  } catch (error) {
    console.error("Failed to create admin", error);
    return NextResponse.json({ message: "Failed to create admin." }, { status: 500 });
  }
}
