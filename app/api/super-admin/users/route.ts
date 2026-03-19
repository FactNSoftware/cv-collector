import { NextResponse } from "next/server";
import { recordAdminAuditEvent } from "../../../../lib/audit-log";
import {
  createSuperAdminAccount,
  deleteSuperAdminAccount,
  listSuperAdminAccounts,
} from "../../../../lib/super-admin-access";
import { requireSuperAdminApiSession } from "../../../../lib/auth-guards";

export const runtime = "nodejs";

type CreateSuperAdminPayload = {
  email?: string;
};

type DeleteSuperAdminPayload = {
  email?: string;
};

export async function GET(request: Request) {
  const auth = await requireSuperAdminApiSession(request);

  if ("response" in auth) {
    return auth.response;
  }

  const items = await listSuperAdminAccounts();
  return NextResponse.json({ items });
}

export async function POST(request: Request) {
  const auth = await requireSuperAdminApiSession(request);

  if ("response" in auth) {
    return auth.response;
  }

  try {
    const body = (await request.json()) as CreateSuperAdminPayload;
    const email = typeof body.email === "string" ? body.email.trim() : "";

    if (!email) {
      return NextResponse.json({ message: "Email is required." }, { status: 400 });
    }

    const account = await createSuperAdminAccount(email, auth.session.email);

    await recordAdminAuditEvent({
      actorEmail: auth.session.email,
      action: "super_admin.create",
      targetType: "super_admin_account",
      targetId: account.email,
      summary: `Created super admin account for ${account.email}`,
      requestMethod: request.method,
      requestPath: new URL(request.url).pathname,
      userAgent: request.headers.get("user-agent") ?? "",
    });

    return NextResponse.json({ item: account }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create super admin account.";
    return NextResponse.json({ message }, { status: 400 });
  }
}

export async function DELETE(request: Request) {
  const auth = await requireSuperAdminApiSession(request);

  if ("response" in auth) {
    return auth.response;
  }

  try {
    const body = (await request.json()) as DeleteSuperAdminPayload;
    const email = typeof body.email === "string" ? body.email.trim() : "";

    if (!email) {
      return NextResponse.json({ message: "Email is required." }, { status: 400 });
    }

    if (email.toLowerCase() === auth.session.email.toLowerCase()) {
      return NextResponse.json({ message: "You cannot remove your own super admin access." }, { status: 400 });
    }

    await deleteSuperAdminAccount(email, auth.session.email);

    await recordAdminAuditEvent({
      actorEmail: auth.session.email,
      action: "super_admin.delete",
      targetType: "super_admin_account",
      targetId: email,
      summary: `Removed super admin access for ${email}`,
      requestMethod: request.method,
      requestPath: new URL(request.url).pathname,
      userAgent: request.headers.get("user-agent") ?? "",
    });

    return NextResponse.json({ message: "Super admin account removed." });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to remove super admin account.";
    return NextResponse.json({ message }, { status: 400 });
  }
}
