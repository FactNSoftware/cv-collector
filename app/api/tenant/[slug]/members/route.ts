import { NextResponse } from "next/server";
import {
  requireOrganizationAccessApiSession,
  requireOrganizationOwnerApiSession,
} from "../../../../../lib/auth-guards";
import { getAppBaseUrl } from "../../../../../lib/app-url";
import {
  buildOrganizationRoleAssignedEmailTemplate,
} from "../../../../../lib/organization-membership-email-template";
import { getOrgEmailSender } from "../../../../../lib/organization-branding";
import { sendTransactionalEmail } from "../../../../../lib/email-service";
import {
  getOrganizationMembershipByEmail,
  listOrganizationMemberships,
  upsertOrganizationMembership,
  type OrganizationRole,
} from "../../../../../lib/organizations";

export const runtime = "nodejs";

export async function GET(
  request: Request,
  context: { params: Promise<{ slug: string }> },
) {
  const { slug } = await context.params;
  const auth = await requireOrganizationAccessApiSession(request, slug);

  if ("response" in auth) {
    return auth.response;
  }

  const members = await listOrganizationMemberships(auth.organization.id);
  return NextResponse.json({ items: members });
}

export async function POST(
  request: Request,
  context: { params: Promise<{ slug: string }> },
) {
  const { slug } = await context.params;
  const auth = await requireOrganizationOwnerApiSession(request, slug);

  if ("response" in auth) {
    return auth.response;
  }

  try {
    const body = (await request.json()) as { email?: string; role?: string };

    const email = body.email?.trim().toLowerCase();
    const role = (body.role?.trim() ?? "admin") as OrganizationRole;

    if (!email) {
      return NextResponse.json({ message: "Email is required." }, { status: 400 });
    }

    const validRoles: OrganizationRole[] = ["owner", "admin"];
    if (!validRoles.includes(role)) {
      return NextResponse.json({ message: "Invalid role. Must be owner or admin." }, { status: 400 });
    }

    const existingMembership = await getOrganizationMembershipByEmail(
      auth.organization.id,
      email,
    );

    const membership = await upsertOrganizationMembership({
      organizationId: auth.organization.id,
      email,
      role,
      updatedBy: auth.session.email,
    });

    let warning: string | null = null;

    try {
      const sender = await getOrgEmailSender(auth.organization.id);
      await sendTransactionalEmail(
        membership.email,
        buildOrganizationRoleAssignedEmailTemplate({
          recipientEmail: membership.email,
          organizationName: auth.organization.name,
          role: membership.role,
          actorEmail: auth.session.email,
          loginUrl: `${getAppBaseUrl()}/o/${auth.organization.slug}`,
        }),
        sender.address
          ? {
            senderAddress: sender.address,
            senderDisplayName: sender.displayName || undefined,
          }
          : undefined,
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown email error";
      warning = "Member access was updated, but notification email could not be sent.";
      console.error("Failed to send organization member access email", {
        organizationId: auth.organization.id,
        memberEmail: membership.email,
        error: message,
      });
    }

    return NextResponse.json({
      item: membership,
      message: existingMembership ? "Member role updated." : "Member invited successfully.",
      warning,
    }, { status: existingMembership ? 200 : 201 });
  } catch (error) {
    if (error instanceof Error) {
      return NextResponse.json({ message: error.message }, { status: 400 });
    }

    return NextResponse.json(
      { message: "Failed to update organization member." },
      { status: 500 },
    );
  }
}
