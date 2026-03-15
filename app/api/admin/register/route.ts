import { NextResponse } from "next/server";
import { recordAdminAuditEvent } from "../../../../lib/audit-log";
import {
  createAdminAccount,
  hasAnyAdminAccount,
  validateAdminBootstrapAttempt,
} from "../../../../lib/admin-access";
import { ensureCandidateProfile } from "../../../../lib/candidate-profile";

export const runtime = "nodejs";

type RegisterAdminPayload = {
  email?: string;
  permissionToken?: string;
};

const getRequesterKey = (request: Request) => {
  const forwardedFor = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const realIp = request.headers.get("x-real-ip")?.trim();

  return forwardedFor || realIp || "unknown";
};

export async function POST(request: Request) {
  try {
    if (await hasAnyAdminAccount()) {
      return NextResponse.json(
        {
          message:
            "Admin bootstrap is disabled after the first admin account is created. Use the authenticated admin portal to manage admins.",
        },
        { status: 403 },
      );
    }

    const body = (await request.json()) as RegisterAdminPayload;
    const email = typeof body.email === "string" ? body.email.trim() : "";
    const permissionToken = typeof body.permissionToken === "string"
      ? body.permissionToken.trim()
      : "";

    if (!email) {
      return NextResponse.json({ message: "Email is required." }, { status: 400 });
    }

    const validation = await validateAdminBootstrapAttempt({
      providedToken: permissionToken,
      requesterKey: getRequesterKey(request),
    });

    if (!validation.ok) {
      const response = NextResponse.json(
        { message: validation.message },
        { status: validation.status },
      );

      if (validation.retryAfterSeconds) {
        response.headers.set("Retry-After", String(validation.retryAfterSeconds));
      }

      return response;
    }

    const actorEmail = "system";

    await ensureCandidateProfile(email);
    const admin = await createAdminAccount(email, actorEmail);

    await recordAdminAuditEvent({
      actorEmail,
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
