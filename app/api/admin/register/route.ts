import { NextResponse } from "next/server";
import { recordAdminAuditEvent } from "../../../../lib/audit-log";
import {
  createAdminAccount,
  isAdminPermissionTokenValid,
} from "../../../../lib/admin-access";
import { ensureCandidateProfile } from "../../../../lib/candidate-profile";

export const runtime = "nodejs";

type RegisterAdminPayload = {
  email?: string;
  permissionToken?: string;
  createdBy?: string;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as RegisterAdminPayload;
    const email = typeof body.email === "string" ? body.email.trim() : "";
    const permissionToken = typeof body.permissionToken === "string"
      ? body.permissionToken.trim()
      : "";
    const createdBy = typeof body.createdBy === "string"
      ? body.createdBy.trim()
      : "system";

    if (!email) {
      return NextResponse.json({ message: "Email is required." }, { status: 400 });
    }

    if (!isAdminPermissionTokenValid(permissionToken)) {
      return NextResponse.json(
        { message: "Invalid admin permission token." },
        { status: 403 },
      );
    }

    await ensureCandidateProfile(email);
    const admin = await createAdminAccount(email, createdBy);

    await recordAdminAuditEvent({
      actorEmail: createdBy || "system",
      action: "admin.bootstrap",
      targetType: "admin_account",
      targetId: admin.email,
      summary: `Bootstrapped admin access for ${admin.email}`,
      requestMethod: request.method,
      requestPath: new URL(request.url).pathname,
      userAgent: request.headers.get("user-agent") ?? "",
    });

    return NextResponse.json({
      message: "Admin account created successfully.",
      item: admin,
    });
  } catch (error) {
    console.error("Failed to register admin", error);
    return NextResponse.json(
      { message: "Failed to register admin." },
      { status: 500 },
    );
  }
}
