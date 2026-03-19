import { NextResponse } from "next/server";
import { createAuthSession, SESSION_COOKIE_NAME } from "@/lib/auth-session";
import { getPostAuthRedirectPath } from "@/lib/auth-guards";
import { getSessionCookieDomain } from "@/lib/app-url";
import { OtpValidationError, verifyLoginOtp } from "@/lib/auth-otp";
import { isSuperAdminEmail } from "@/lib/super-admin-access";

export const runtime = "nodejs";

type VerifySystemOtpPayload = {
  email?: string;
  otp?: string;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as VerifySystemOtpPayload;
    const email = typeof body.email === "string" ? body.email : "";
    const otp = typeof body.otp === "string" ? body.otp : "";

    const result = await verifyLoginOtp(email, otp);

    if (!(await isSuperAdminEmail(result.email))) {
      return NextResponse.json(
        { message: "This email does not have super admin access." },
        { status: 403 },
      );
    }

    const session = await createAuthSession(result.email);
    const redirectPath = await getPostAuthRedirectPath(result.email, "/system");

    const response = NextResponse.json({
      message: "Logged in successfully.",
      redirectPath,
    });

    const cookieDomain = getSessionCookieDomain();
    response.cookies.set({
      name: SESSION_COOKIE_NAME,
      value: session.token,
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      expires: session.expiresAt,
      ...(cookieDomain ? { domain: cookieDomain } : {}),
    });

    return response;
  } catch (error) {
    if (error instanceof OtpValidationError) {
      return NextResponse.json({ message: error.message }, { status: 400 });
    }

    console.error("Failed to verify system OTP", error);
    return NextResponse.json(
      { message: "Failed to verify OTP." },
      { status: 500 },
    );
  }
}
