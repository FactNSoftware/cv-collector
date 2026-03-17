import { NextResponse } from "next/server";
import { recordAdminAuditEvent } from "../../../../../lib/audit-log";
import {
  getOrganizationBySlug,
  updateOrganizationStatus,
  type OrganizationStatus,
} from "../../../../../lib/organizations";
import { requireSuperAdminApiSession } from "../../../../../lib/auth-guards";

export const runtime = "nodejs";

type UpdateOrganizationPayload = {
  status?: OrganizationStatus;
};

export async function GET(
  request: Request,
  context: { params: Promise<{ slug: string }> },
) {
  const auth = await requireSuperAdminApiSession(request);

  if ("response" in auth) {
    return auth.response;
  }

  const { slug } = await context.params;
  const organization = await getOrganizationBySlug(slug);

  if (!organization) {
    return NextResponse.json({ message: "Organization not found." }, { status: 404 });
  }

  return NextResponse.json({ item: organization });
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ slug: string }> },
) {
  const auth = await requireSuperAdminApiSession(request);

  if ("response" in auth) {
    return auth.response;
  }

  try {
    const { slug } = await context.params;
    const body = (await request.json()) as UpdateOrganizationPayload;
    const status = body.status;

    if (status !== "active" && status !== "suspended") {
      return NextResponse.json({ message: "A valid organization status is required." }, { status: 400 });
    }

    const organization = await updateOrganizationStatus({
      slug,
      status,
      updatedBy: auth.session.email,
    });

    await recordAdminAuditEvent({
      actorEmail: auth.session.email,
      action: "organization.status.update",
      targetType: "organization",
      targetId: organization.id,
      summary: `Set organization ${organization.slug} to ${organization.status}`,
      requestMethod: request.method,
      requestPath: new URL(request.url).pathname,
      userAgent: request.headers.get("user-agent") ?? "",
      details: {
        organizationId: organization.id,
        organizationSlug: organization.slug,
        status: organization.status,
      },
    });

    return NextResponse.json({
      message: organization.status === "active"
        ? "Organization reactivated successfully."
        : "Organization suspended successfully.",
      item: organization,
    });
  } catch (error) {
    console.error("Failed to update organization status", error);

    if (error instanceof Error) {
      const status = error.message === "Organization not found." ? 404 : 400;
      return NextResponse.json({ message: error.message }, { status });
    }

    return NextResponse.json({ message: "Failed to update organization status." }, { status: 500 });
  }
}
