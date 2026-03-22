import { NextResponse } from "next/server";
import { requireOrganizationFunctionalityApiSession } from "../../../../../../lib/auth-guards";
import { getAppBaseUrl } from "../../../../../../lib/app-url";
import {
  buildOrganizationRootOwnershipTransferredEmailTemplate,
} from "../../../../../../lib/organization-membership-email-template";
import { getOrgEmailSender } from "../../../../../../lib/organization-branding";
import { sendTransactionalEmail } from "../../../../../../lib/email-service";
import {
  getOrganizationMembershipByEmail,
  getOrganizationRootOwnerEmail,
  transferOrganizationRootOwnership,
} from "../../../../../../lib/organizations";

export const runtime = "nodejs";

type TransferRootPayload = {
  newRootOwnerEmail?: string;
};

export async function POST(
  request: Request,
  context: { params: Promise<{ slug: string }> },
) {
  const { slug } = await context.params;
  const auth = await requireOrganizationFunctionalityApiSession(
    request,
    slug,
    "tenant_settings",
    "tenant_settings.root_owner_transfer",
    {
    ownerOnly: true,
    },
  );

  if ("response" in auth) {
    return auth.response;
  }

  try {
    const body = (await request.json()) as TransferRootPayload;
    const targetEmail = body.newRootOwnerEmail?.trim().toLowerCase();

    if (!targetEmail) {
      return NextResponse.json({ message: "newRootOwnerEmail is required." }, { status: 400 });
    }

    const currentRootOwnerEmail = await getOrganizationRootOwnerEmail(auth.organization.id);

    if (!currentRootOwnerEmail) {
      return NextResponse.json(
        { message: "Current root owner is not configured for this organization." },
        { status: 400 },
      );
    }

    if (!auth.isSuperAdmin && auth.session.email !== currentRootOwnerEmail) {
      return NextResponse.json(
        { message: "Only the root owner can transfer root ownership." },
        { status: 403 },
      );
    }

    const targetMembership = await getOrganizationMembershipByEmail(auth.organization.id, targetEmail);

    if (!targetMembership) {
      return NextResponse.json(
        { message: "Target user must be an active organization member." },
        { status: 400 },
      );
    }

    if (targetMembership.role !== "owner") {
      return NextResponse.json(
        { message: "Target user must be an owner before ownership transfer." },
        { status: 400 },
      );
    }

    const transfer = await transferOrganizationRootOwnership({
      organizationId: auth.organization.id,
      newRootOwnerEmail: targetEmail,
      transferredBy: auth.session.email,
    });

    let warning: string | null = null;

    try {
      const sender = await getOrgEmailSender(auth.organization.id);
      const mailOptions = sender.address
        ? {
          senderAddress: sender.address,
          senderDisplayName: sender.displayName || undefined,
        }
        : undefined;

      const templateForNewRoot = buildOrganizationRootOwnershipTransferredEmailTemplate({
        recipientEmail: transfer.newRootOwnerEmail,
        organizationName: auth.organization.name,
        previousRootOwnerEmail: transfer.previousRootOwnerEmail,
        newRootOwnerEmail: transfer.newRootOwnerEmail,
        actorEmail: auth.session.email,
        loginUrl: `${getAppBaseUrl()}/o/${auth.organization.slug}`,
      });

      await sendTransactionalEmail(
        transfer.newRootOwnerEmail,
        templateForNewRoot,
        mailOptions,
      );

      if (transfer.previousRootOwnerEmail !== transfer.newRootOwnerEmail) {
        const templateForPreviousRoot = buildOrganizationRootOwnershipTransferredEmailTemplate({
          recipientEmail: transfer.previousRootOwnerEmail,
          organizationName: auth.organization.name,
          previousRootOwnerEmail: transfer.previousRootOwnerEmail,
          newRootOwnerEmail: transfer.newRootOwnerEmail,
          actorEmail: auth.session.email,
          loginUrl: `${getAppBaseUrl()}/o/${auth.organization.slug}`,
        });

        await sendTransactionalEmail(
          transfer.previousRootOwnerEmail,
          templateForPreviousRoot,
          mailOptions,
        );
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown email error";
      warning = "Ownership transferred, but one or more notification emails could not be sent.";
      console.error("Failed to send root ownership transfer emails", {
        organizationId: auth.organization.id,
        previousRootOwnerEmail: transfer.previousRootOwnerEmail,
        newRootOwnerEmail: transfer.newRootOwnerEmail,
        error: message,
      });
    }

    return NextResponse.json({
      message: `Root ownership transferred to ${transfer.newRootOwnerEmail}.`,
      previousRootOwnerEmail: transfer.previousRootOwnerEmail,
      newRootOwnerEmail: transfer.newRootOwnerEmail,
      warning,
    });
  } catch (error) {
    if (error instanceof Error) {
      return NextResponse.json({ message: error.message }, { status: 400 });
    }

    return NextResponse.json(
      { message: "Failed to transfer root ownership." },
      { status: 500 },
    );
  }
}
