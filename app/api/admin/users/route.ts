import { NextResponse } from "next/server";
import { buildAdminCandidateListItems } from "../../../../lib/admin-list-types";
import { requireAdminApiSession } from "../../../../lib/auth-guards";
import { listCandidateProfiles } from "../../../../lib/candidate-profile";
import { listCvSubmissions } from "../../../../lib/cv-storage";
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
    const searchQuery = url.searchParams.get("q")?.trim().toLowerCase() ?? "";
    const statusFilter = url.searchParams.get("status")?.trim().toLowerCase() ?? "all";
    const [profiles, submissions] = await Promise.all([
      listCandidateProfiles(),
      listCvSubmissions(),
    ]);

    const items = buildAdminCandidateListItems(profiles, submissions).filter((candidate) => {
      if (statusFilter !== "all" && candidate.latestReviewStatus !== statusFilter) {
        return false;
      }

      if (!searchQuery) {
        return true;
      }

      const haystack = [
        candidate.email,
        candidate.firstName,
        candidate.lastName,
        candidate.phone,
        candidate.idOrPassportNumber,
      ].join(" ").toLowerCase();

      return haystack.includes(searchQuery);
    });

    return NextResponse.json(paginateItems(items, limit, cursor));
  } catch (error) {
    console.error("Failed to load admin user list", error);
    return NextResponse.json({ message: "Failed to load users." }, { status: 500 });
  }
}
