import { NextResponse } from "next/server";
import { recordAdminAuditEvent } from "../../../../lib/audit-log";
import {
  createOrganization,
  listOrganizationsPage,
} from "../../../../lib/organizations";
import { requireSuperAdminApiSession } from "../../../../lib/auth-guards";
import { ensureCandidateProfile } from "../../../../lib/candidate-profile";
import { getCursorParam, getPageLimit } from "../../../../lib/pagination";
import {
  assignDefaultPublicSubscriptionToOrganizationIfAvailable,
  assignSubscriptionToOrganization,
} from "../../../../lib/subscriptions";

export const runtime = "nodejs";

type CreateOrganizationPayload = {
  slug?: string;
  name?: string;
  ownerEmail?: string;
  subscriptionId?: string | null;
};

export async function GET(request: Request) {
  const auth = await requireSuperAdminApiSession(request);

  if ("response" in auth) {
    return auth.response;
  }

  const url = new URL(request.url);
  const limit = getPageLimit(url.searchParams.get("limit"));
  const cursor = getCursorParam(url.searchParams.get("cursor"));
  const page = await listOrganizationsPage(limit, cursor);

  return NextResponse.json(page);
}

export async function POST(request: Request) {
  const auth = await requireSuperAdminApiSession(request);

  if ("response" in auth) {
    return auth.response;
  }

  try {
    const body = (await request.json()) as CreateOrganizationPayload;
    const slug = typeof body.slug === "string" ? body.slug.trim() : "";
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const ownerEmail = typeof body.ownerEmail === "string" ? body.ownerEmail.trim() : "";
    const subscriptionId = typeof body.subscriptionId === "string"
      ? body.subscriptionId.trim()
      : body.subscriptionId === null
        ? null
        : undefined;

    if (!slug) {
      return NextResponse.json({ message: "Organization slug is required." }, { status: 400 });
    }

    if (!name) {
      return NextResponse.json({ message: "Organization name is required." }, { status: 400 });
    }

    if (!ownerEmail) {
      return NextResponse.json({ message: "Owner email is required." }, { status: 400 });
    }

    await ensureCandidateProfile(ownerEmail);
    const result = await createOrganization({
      slug,
      name,
      ownerEmail,
      createdBy: auth.session.email,
    });

    if (subscriptionId) {
      await assignSubscriptionToOrganization({
        organizationId: result.organization.id,
        subscriptionId,
        assignedBy: auth.session.email,
      });
    } else {
      await assignDefaultPublicSubscriptionToOrganizationIfAvailable({
        organizationId: result.organization.id,
        assignedBy: auth.session.email,
      });
    }

    await recordAdminAuditEvent({
      actorEmail: auth.session.email,
      action: "organization.create",
      targetType: "organization",
      targetId: result.organization.id,
      summary: `Created organization ${result.organization.slug}`,
      requestMethod: request.method,
      requestPath: new URL(request.url).pathname,
      userAgent: request.headers.get("user-agent") ?? "",
      details: {
        organizationSlug: result.organization.slug,
        organizationName: result.organization.name,
        ownerEmail,
      },
    });

    return NextResponse.json({
      message: "Organization created successfully.",
      item: result.organization,
      owner: result.owner,
    });
  } catch (error) {
    console.error("Failed to create organization", error);

    if (error instanceof Error) {
      const status = error.message === "Organization slug already exists." ? 409 : 400;
      return NextResponse.json({ message: error.message }, { status });
    }

    return NextResponse.json({ message: "Failed to create organization." }, { status: 500 });
  }
}
