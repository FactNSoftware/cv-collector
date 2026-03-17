import { NextResponse } from "next/server";
import { recordAdminAuditEvent } from "../../../../lib/audit-log";
import { ensureCandidateProfile } from "../../../../lib/candidate-profile";
import {
  createSuperAdminAccount,
  hasAnySuperAdminAccount,
  validateSuperAdminBootstrapAttempt,
} from "../../../../lib/super-admin-access";

export const runtime = "nodejs";

type RegisterSuperAdminPayload = {
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
    if (await hasAnySuperAdminAccount()) {
      return NextResponse.json(
        {
          message:
            "Super admin bootstrap is disabled after the first super admin account is created.",
        },
        { status: 403 },
      );
    }

    const body = (await request.json()) as RegisterSuperAdminPayload;
    const email = typeof body.email === "string" ? body.email.trim() : "";
    const permissionToken = typeof body.permissionToken === "string"
      ? body.permissionToken.trim()
      : "";

    if (!email) {
      return NextResponse.json({ message: "Email is required." }, { status: 400 });
    }

    const validation = await validateSuperAdminBootstrapAttempt({
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
    const superAdmin = await createSuperAdminAccount(email, actorEmail);

    await recordAdminAuditEvent({
      actorEmail,
      action: "super_admin.bootstrap",
      targetType: "super_admin_account",
      targetId: superAdmin.email,
      summary: `Bootstrapped super admin access for ${superAdmin.email}`,
      requestMethod: request.method,
      requestPath: new URL(request.url).pathname,
      userAgent: request.headers.get("user-agent") ?? "",
    });

    return NextResponse.json({
      message: "Super admin account created successfully.",
      item: superAdmin,
    });
  } catch (error) {
    console.error("Failed to register super admin", error);
    return NextResponse.json(
      { message: "Failed to register super admin." },
      { status: 500 },
    );
  }
}