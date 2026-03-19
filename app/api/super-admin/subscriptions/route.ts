import { NextResponse } from "next/server";
import { recordAdminAuditEvent } from "../../../../lib/audit-log";
import { requireSuperAdminApiSession } from "../../../../lib/auth-guards";
import { listFeatureCatalogSummary } from "../../../../lib/subscriptions";
import {
  createSubscription,
  listOrganizationSubscriptionAssignmentDetails,
  listSubscriptions,
  type SubscriptionStatus,
  type SubscriptionVisibility,
} from "../../../../lib/subscriptions";

export const runtime = "nodejs";

type CreateSubscriptionPayload = {
  name?: string;
  description?: string | null;
  visibility?: SubscriptionVisibility;
  status?: SubscriptionStatus;
  isDefaultPublic?: boolean;
  featureKeys?: string[];
  functionalityKeys?: string[];
};

export async function GET(request: Request) {
  const auth = await requireSuperAdminApiSession(request);

  if ("response" in auth) {
    return auth.response;
  }

  const [subscriptions, assignments] = await Promise.all([
    listSubscriptions(),
    listOrganizationSubscriptionAssignmentDetails(),
  ]);

  return NextResponse.json({
    subscriptions,
    assignments,
    features: listFeatureCatalogSummary(),
  });
}

export async function POST(request: Request) {
  const auth = await requireSuperAdminApiSession(request);

  if ("response" in auth) {
    return auth.response;
  }

  try {
    const body = (await request.json()) as CreateSubscriptionPayload;

    const subscription = await createSubscription({
      name: typeof body.name === "string" ? body.name : "",
      description: Object.prototype.hasOwnProperty.call(body, "description") ? body.description : undefined,
      visibility: body.visibility,
      status: body.status,
      isDefaultPublic: Boolean(body.isDefaultPublic),
      featureKeys: Array.isArray(body.featureKeys) ? body.featureKeys : [],
      functionalityKeys: Array.isArray(body.functionalityKeys) ? body.functionalityKeys : [],
      createdBy: auth.session.email,
    });

    await recordAdminAuditEvent({
      actorEmail: auth.session.email,
      action: "subscription.create",
      targetType: "subscription",
      targetId: subscription.id,
      summary: `Created subscription ${subscription.name}`,
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
      message: "Subscription created successfully.",
      item: subscription,
    }, { status: 201 });
  } catch (error) {
    if (error instanceof Error) {
      return NextResponse.json({ message: error.message }, { status: 400 });
    }

    return NextResponse.json({ message: "Failed to create subscription." }, { status: 500 });
  }
}
