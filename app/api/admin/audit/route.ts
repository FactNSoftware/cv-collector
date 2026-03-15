import { NextResponse } from "next/server";
import { requireAdminApiSession } from "../../../../lib/auth-guards";
import { listAdminAuditEvents } from "../../../../lib/audit-log";
import { getCursorParam, getPageLimit, paginateItems } from "../../../../lib/pagination";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const auth = await requireAdminApiSession(request);

  if ("response" in auth) {
    return auth.response;
  }

  try {
    const url = new URL(request.url);
    const limit = getPageLimit(url.searchParams.get("limit"));
    const cursor = getCursorParam(url.searchParams.get("cursor"));
    const actorEmail = url.searchParams.get("actorEmail")?.trim() ?? "";
    const searchQuery = url.searchParams.get("q")?.trim().toLowerCase() ?? "";
    const items = (await listAdminAuditEvents()).filter((log) => {
      if (actorEmail && log.actorEmail !== actorEmail.toLowerCase()) {
        return false;
      }

      if (!searchQuery) {
        return true;
      }

      const haystack = [
        log.summary,
        log.actorEmail,
        log.action,
        log.targetId,
        log.targetType,
        log.requestMethod,
        log.requestPath,
        JSON.stringify(log.details ?? {}),
      ].join(" ").toLowerCase();

      return haystack.includes(searchQuery);
    });
    const page = paginateItems(items, limit, cursor);

    return NextResponse.json(page);
  } catch (error) {
    console.error("Failed to load admin audit logs", error);
    return NextResponse.json({ message: "Failed to load audit logs." }, { status: 500 });
  }
}
