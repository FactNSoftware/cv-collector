import { NextResponse } from "next/server";
import { requireApiSession } from "../../../../lib/auth-guards";
import { listOrganizationsForMemberEmail } from "../../../../lib/organizations";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const auth = await requireApiSession(request);

  if ("response" in auth) {
    return auth.response;
  }

  const organizations = await listOrganizationsForMemberEmail(auth.session.email);
  const items = organizations
    .filter(({ organization }) => organization.status === "active")
    .map(({ organization }) => ({
      id: organization.id,
      slug: organization.slug,
      name: organization.name,
      logoUrl: organization.logoUrl,
    }));

  return NextResponse.json({ items });
}
