import { NextResponse } from "next/server";
import { requireOrganizationFeatureApiSession } from "../../../../../../lib/auth-guards";
import {
  isOrganizationSlugAvailable,
  isOrganizationSlugValid,
} from "../../../../../../lib/organizations";

export const runtime = "nodejs";

const normalizeSlugCandidate = (value: string) => {
  return value
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
};

export async function GET(
  request: Request,
  context: { params: Promise<{ slug: string }> },
) {
  const { slug } = await context.params;
  const auth = await requireOrganizationFeatureApiSession(request, slug, "tenant_settings", {
    ownerOnly: true,
  });

  if ("response" in auth) {
    return auth.response;
  }

  const url = new URL(request.url);
  const candidateRaw = url.searchParams.get("slug") ?? "";
  const candidate = normalizeSlugCandidate(candidateRaw);

  if (!candidate) {
    return NextResponse.json(
      { available: false, slug: "", message: "Slug is required." },
      { status: 400 },
    );
  }

  if (!isOrganizationSlugValid(candidate)) {
    return NextResponse.json({
      available: false,
      slug: candidate,
      message: "Slug must use lowercase letters, numbers, and hyphens only.",
    });
  }

  const available = await isOrganizationSlugAvailable(candidate, auth.organization.id);

  return NextResponse.json({
    available,
    slug: candidate,
    message: available ? "Slug is available." : "Slug is already in use.",
  });
}
