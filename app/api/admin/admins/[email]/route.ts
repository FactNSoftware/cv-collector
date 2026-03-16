import { NextResponse } from "next/server";
import { recordAdminAuditEvent } from "../../../../../lib/audit-log";
import { requireAdminApiSession } from "../../../../../lib/auth-guards";
import {
  deleteAdminAccount,
  updateAdminAccountEmail,
} from "../../../../../lib/admin-access";
import { ensureCandidateProfile } from "../../../../../lib/candidate-profile";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{
    email: string;
  }>;
};

type UpdateAdminPayload = {
  email?: string;
};

const decodeEmailParam = (value: string) => decodeURIComponent(value).trim().toLowerCase();

export async function PATCH(request: Request, context: RouteContext) {
  const auth = await requireAdminApiSession(request);

  if ("response" in auth) {
    return auth.response;
  }

  try {
    const { email: rawEmail } = await context.params;
    const currentEmail = decodeEmailParam(rawEmail);
    const body = (await request.json()) as UpdateAdminPayload;
    const nextEmail = typeof body.email === "string" ? body.email.trim() : "";

    if (!nextEmail) {
      return NextResponse.json({ message: "Email is required." }, { status: 400 });
    }

    await ensureCandidateProfile(nextEmail);
    const item = await updateAdminAccountEmail(currentEmail, nextEmail, auth.session.email);

    await recordAdminAuditEvent({
      actorEmail: auth.session.email,
      action: "admin.update_email",
      targetType: "admin_account",
      targetId: item.email,
      summary: `Changed admin email from ${currentEmail} to ${item.email}`,
      requestMethod: request.method,
      requestPath: new URL(request.url).pathname,
      userAgent: request.headers.get("user-agent") ?? "",
      details: {
        previousEmail: currentEmail,
        nextEmail: item.email,
      },
    });

    return NextResponse.json({
      message: "Admin account updated successfully.",
      item,
    });
  } catch (error) {
    console.error("Failed to update admin", error);

    if (error instanceof Error) {
      const status = error.message === "Admin account not found." ? 404 : 400;
      return NextResponse.json({ message: error.message }, { status });
    }

    return NextResponse.json({ message: "Failed to update admin." }, { status: 500 });
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  const auth = await requireAdminApiSession(request);

  if ("response" in auth) {
    return auth.response;
  }

  try {
    const { email: rawEmail } = await context.params;
    const targetEmail = decodeEmailParam(rawEmail);

    if (targetEmail === auth.session.email.trim().toLowerCase()) {
      return NextResponse.json(
        { message: "You cannot delete your own admin account." },
        { status: 400 },
      );
    }

    await deleteAdminAccount(targetEmail, auth.session.email);

    await recordAdminAuditEvent({
      actorEmail: auth.session.email,
      action: "admin.delete",
      targetType: "admin_account",
      targetId: targetEmail,
      summary: `Soft-deleted admin access for ${targetEmail}`,
      requestMethod: request.method,
      requestPath: new URL(request.url).pathname,
      userAgent: request.headers.get("user-agent") ?? "",
    });

    return NextResponse.json({
      message: "Admin account deleted successfully.",
    });
  } catch (error) {
    console.error("Failed to delete admin", error);

    if (error instanceof Error) {
      const status = error.message === "Admin account not found." ? 404 : 400;
      return NextResponse.json({ message: error.message }, { status });
    }

    return NextResponse.json({ message: "Failed to delete admin." }, { status: 500 });
  }
}
