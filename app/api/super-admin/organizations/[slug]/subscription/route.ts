import { NextResponse } from "next/server";
import { recordAdminAuditEvent } from "../../../../../../lib/audit-log";
import { requireSuperAdminApiSession } from "../../../../../../lib/auth-guards";
import { getOrganizationBySlug } from "../../../../../../lib/organizations";
import {
  assignSubscriptionToOrganization,
  getSubscriptionById,
  resolveOrganizationSubscriptionAccess,
} from "../../../../../../lib/subscriptions";

export const runtime = "nodejs";

type UpdateOrganizationSubscriptionPayload = {
  subscriptionId?: string | null;
};

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
    const organization = await getOrganizationBySlug(slug);

    if (!organization) {
      return NextResponse.json({ message: "Organization not found." }, { status: 404 });
    }

    const body = (await request.json()) as UpdateOrganizationSubscriptionPayload;
    const subscriptionId = typeof body.subscriptionId === "string"
      ? body.subscriptionId.trim()
      : body.subscriptionId === null
        ? null
        : null;

    const assignment = await assignSubscriptionToOrganization({
      organizationId: organization.id,
      subscriptionId,
      assignedBy: auth.session.email,
    });

    const subscription = assignment ? await getSubscriptionById(assignment.subscriptionId) : null;
    const effective = await resolveOrganizationSubscriptionAccess(organization.id);

    await recordAdminAuditEvent({
      actorEmail: auth.session.email,
      action: "organization.subscription.assign",
      targetType: "organization",
      targetId: organization.id,
      summary: subscription
        ? `Assigned subscription ${subscription.name} to ${organization.slug}`
        : `Cleared explicit subscription assignment for ${organization.slug}`,
      requestMethod: request.method,
      requestPath: new URL(request.url).pathname,
      userAgent: request.headers.get("user-agent") ?? "",
      details: {
        organizationId: organization.id,
        organizationSlug: organization.slug,
        subscriptionId: subscription?.id ?? null,
        subscriptionName: subscription?.name ?? null,
        effectiveFeatureKeys: effective.featureKeys,
        effectiveFunctionalityKeys: effective.functionalityKeys,
        source: effective.source,
      },
    });

    return NextResponse.json({
      message: subscription
        ? "Subscription assigned successfully."
        : "Organization reverted to legacy default access.",
      assignment,
      subscription,
      effective,
    });
  } catch (error) {
    if (error instanceof Error) {
      return NextResponse.json({ message: error.message }, { status: 400 });
    }

    return NextResponse.json({ message: "Failed to update organization subscription." }, { status: 500 });
  }
}
