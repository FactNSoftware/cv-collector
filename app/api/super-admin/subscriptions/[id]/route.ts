import { NextResponse } from "next/server";
import { recordAdminAuditEvent } from "../../../../../lib/audit-log";
import { requireSuperAdminApiSession } from "../../../../../lib/auth-guards";
import {
  getSubscriptionById,
  updateSubscription,
  type SubscriptionStatus,
  type SubscriptionVisibility,
} from "../../../../../lib/subscriptions";

export const runtime = "nodejs";

type UpdateSubscriptionPayload = {
  name?: string;
  description?: string | null;
  visibility?: SubscriptionVisibility;
  status?: SubscriptionStatus;
  isDefaultPublic?: boolean;
  featureKeys?: string[];
  functionalityKeys?: string[];
};

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await requireSuperAdminApiSession(request);

  if ("response" in auth) {
    return auth.response;
  }

  try {
    const { id } = await context.params;
    const body = (await request.json()) as UpdateSubscriptionPayload;

    const subscription = await updateSubscription({
      id,
      name: Object.prototype.hasOwnProperty.call(body, "name") ? body.name : undefined,
      description: Object.prototype.hasOwnProperty.call(body, "description") ? body.description : undefined,
      visibility: body.visibility,
      status: body.status,
      isDefaultPublic: Object.prototype.hasOwnProperty.call(body, "isDefaultPublic")
        ? Boolean(body.isDefaultPublic)
        : undefined,
      featureKeys: Array.isArray(body.featureKeys) ? body.featureKeys : undefined,
      functionalityKeys: Array.isArray(body.functionalityKeys) ? body.functionalityKeys : undefined,
      updatedBy: auth.session.email,
    });

    await recordAdminAuditEvent({
      actorEmail: auth.session.email,
      action: "subscription.update",
      targetType: "subscription",
      targetId: subscription.id,
      summary: `Updated subscription ${subscription.name}`,
      requestMethod: request.method,
      requestPath: new URL(request.url).pathname,
      userAgent: request.headers.get("user-agent") ?? "",
      details: {
        subscriptionId: subscription.id,
        visibility: subscription.visibility,
        status: subscription.status,
        featureKeys: subscription.featureKeys,
        functionalityKeys: subscription.functionalityKeys,
      },
    });

    return NextResponse.json({
      message: "Subscription updated successfully.",
      item: subscription,
    });
  } catch (error) {
    if (error instanceof Error) {
      const status = error.message === "Subscription not found." ? 404 : 400;
      return NextResponse.json({ message: error.message }, { status });
    }

    return NextResponse.json({ message: "Failed to update subscription." }, { status: 500 });
  }
}

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await requireSuperAdminApiSession(request);

  if ("response" in auth) {
    return auth.response;
  }

  const { id } = await context.params;
  const subscription = await getSubscriptionById(id);

  if (!subscription) {
    return NextResponse.json({ message: "Subscription not found." }, { status: 404 });
  }

  return NextResponse.json({ item: subscription });
}
