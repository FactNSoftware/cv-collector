import { NextResponse } from "next/server";
import { recordAdminAuditEvent } from "../../../../../../lib/audit-log";
import { requireSuperAdminApiSession } from "../../../../../../lib/auth-guards";
import { ensureCandidateProfile } from "../../../../../../lib/candidate-profile";
import {
  getOrganizationBySlug,
  listOrganizationMemberships,
  removeOrganizationMembership,
  upsertOrganizationMembership,
  type OrganizationRole,
} from "../../../../../../lib/organizations";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{
    slug: string;
  }>;
};

type UpsertMembershipPayload = {
  email?: string;
  role?: OrganizationRole;
};

type RemoveMembershipPayload = {
  email?: string;
};

const decodeSlugParam = (value: string) => decodeURIComponent(value).trim().toLowerCase();

export async function GET(request: Request, context: RouteContext) {
  const auth = await requireSuperAdminApiSession(request);

  if ("response" in auth) {
    return auth.response;
  }

  const { slug: rawSlug } = await context.params;
  const slug = decodeSlugParam(rawSlug);
  const organization = await getOrganizationBySlug(slug);

  if (!organization) {
    return NextResponse.json({ message: "Organization not found." }, { status: 404 });
  }

  const items = await listOrganizationMemberships(organization.id);
  return NextResponse.json({
    organization,
    items,
  });
}

export async function POST(request: Request, context: RouteContext) {
  const auth = await requireSuperAdminApiSession(request);

  if ("response" in auth) {
    return auth.response;
  }

  try {
    const { slug: rawSlug } = await context.params;
    const slug = decodeSlugParam(rawSlug);
    const organization = await getOrganizationBySlug(slug);

    if (!organization) {
      return NextResponse.json({ message: "Organization not found." }, { status: 404 });
    }

    const body = (await request.json()) as UpsertMembershipPayload;
    const email = typeof body.email === "string" ? body.email.trim() : "";
    const role = body.role === "owner" ? "owner" : "admin";

    if (!email) {
      return NextResponse.json({ message: "Email is required." }, { status: 400 });
    }

    await ensureCandidateProfile(email);
    const item = await upsertOrganizationMembership({
      organizationId: organization.id,
      email,
      role,
      updatedBy: auth.session.email,
    });

    await recordAdminAuditEvent({
      actorEmail: auth.session.email,
      action: "organization.membership.upsert",
      targetType: "organization_membership",
      targetId: `${organization.id}:${item.email}`,
      summary: `Set ${item.email} as ${item.role} in ${organization.slug}`,
      requestMethod: request.method,
      requestPath: new URL(request.url).pathname,
      userAgent: request.headers.get("user-agent") ?? "",
      details: {
        organizationId: organization.id,
        organizationSlug: organization.slug,
        email: item.email,
        role: item.role,
      },
    });

    return NextResponse.json({
      message: "Organization membership saved successfully.",
      item,
    });
  } catch (error) {
    console.error("Failed to upsert organization membership", error);

    if (error instanceof Error) {
      return NextResponse.json({ message: error.message }, { status: 400 });
    }

    return NextResponse.json(
      { message: "Failed to save organization membership." },
      { status: 500 },
    );
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  const auth = await requireSuperAdminApiSession(request);

  if ("response" in auth) {
    return auth.response;
  }

  try {
    const { slug: rawSlug } = await context.params;
    const slug = decodeSlugParam(rawSlug);
    const organization = await getOrganizationBySlug(slug);

    if (!organization) {
      return NextResponse.json({ message: "Organization not found." }, { status: 404 });
    }

    const body = (await request.json()) as RemoveMembershipPayload;
    const email = typeof body.email === "string" ? body.email.trim() : "";

    if (!email) {
      return NextResponse.json({ message: "Email is required." }, { status: 400 });
    }

    await removeOrganizationMembership({
      organizationId: organization.id,
      email,
      removedBy: auth.session.email,
    });

    await recordAdminAuditEvent({
      actorEmail: auth.session.email,
      action: "organization.membership.remove",
      targetType: "organization_membership",
      targetId: `${organization.id}:${email.trim().toLowerCase()}`,
      summary: `Removed ${email.trim().toLowerCase()} from ${organization.slug}`,
      requestMethod: request.method,
      requestPath: new URL(request.url).pathname,
      userAgent: request.headers.get("user-agent") ?? "",
      details: {
        organizationId: organization.id,
        organizationSlug: organization.slug,
        email: email.trim().toLowerCase(),
      },
    });

    return NextResponse.json({ message: "Organization membership removed successfully." });
  } catch (error) {
    console.error("Failed to remove organization membership", error);

    if (error instanceof Error) {
      const status = error.message === "Organization membership not found." ? 404 : 400;
      return NextResponse.json({ message: error.message }, { status });
    }

    return NextResponse.json(
      { message: "Failed to remove organization membership." },
      { status: 500 },
    );
  }
}