import { NextResponse } from "next/server";
import { requireOrganizationFunctionalityApiSession } from "../../../../../../lib/auth-guards";
import { getAppBaseUrl } from "../../../../../../lib/app-url";
import {
  buildOrganizationMembershipRemovedEmailTemplate,
} from "../../../../../../lib/organization-membership-email-template";
import { getOrgEmailSender } from "../../../../../../lib/organization-branding";
import { sendTransactionalEmail } from "../../../../../../lib/email-service";
import {
  getOrganizationMembershipByEmail,
  removeOrganizationMembership,
} from "../../../../../../lib/organizations";

export const runtime = "nodejs";

export async function DELETE(
  request: Request,
  context: { params: Promise<{ slug: string; email: string }> },
) {
  const { slug, email: rawEmail } = await context.params;
  const auth = await requireOrganizationFunctionalityApiSession(
    request,
    slug,
    "tenant_settings",
    "tenant_settings.members_remove",
    {
    ownerOnly: true,
    },
  );

  if ("response" in auth) {
    return auth.response;
  }

  const email = decodeURIComponent(rawEmail).trim().toLowerCase();

  if (email === auth.session.email && !auth.isSuperAdmin) {
    return NextResponse.json({ message: "You cannot remove yourself from the organization." }, { status: 400 });
  }

  try {
    const membership = await getOrganizationMembershipByEmail(auth.organization.id, email);

    if (!membership) {
      return NextResponse.json({ message: "Organization membership not found." }, { status: 404 });
    }

    await removeOrganizationMembership({
      organizationId: auth.organization.id,
      email,
      removedBy: auth.session.email,
    });

    let warning: string | null = null;

    try {
      const sender = await getOrgEmailSender(auth.organization.id);
      await sendTransactionalEmail(
        membership.email,
        buildOrganizationMembershipRemovedEmailTemplate({
          recipientEmail: membership.email,
          organizationName: auth.organization.name,
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
      warning = "Member removed, but notification email could not be sent.";
      console.error("Failed to send organization member removal email", {
        organizationId: auth.organization.id,
        memberEmail: membership.email,
        error: message,
      });
    }

    return NextResponse.json({ message: "Member removed.", warning });
  } catch (error) {
    if (error instanceof Error) {
      return NextResponse.json({ message: error.message }, { status: 400 });
    }

    return NextResponse.json({ message: "Failed to remove member." }, { status: 500 });
  }
}
