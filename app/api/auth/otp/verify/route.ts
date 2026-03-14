import { NextResponse } from "next/server";
import { createAuthSession, SESSION_COOKIE_NAME } from "../../../../../lib/auth-session";
import { OtpValidationError, verifyLoginOtp } from "../../../../../lib/auth-otp";
import { ensureCandidateProfile } from "../../../../../lib/candidate-profile";
import { getPostAuthRedirectPath } from "../../../../../lib/auth-guards";

export const runtime = "nodejs";

type VerifyOtpPayload = {
  email?: string;
  otp?: string;
  next?: string;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as VerifyOtpPayload;
    const email = typeof body.email === "string" ? body.email : "";
    const otp = typeof body.otp === "string" ? body.otp : "";
    const nextPath = typeof body.next === "string" ? body.next : null;

    const result = await verifyLoginOtp(email, otp);
    await ensureCandidateProfile(result.email);
    const session = await createAuthSession(result.email);
    const redirectPath = await getPostAuthRedirectPath(result.email, nextPath);

    const response = NextResponse.json({
      message: "Logged in successfully.",
      redirectPath,
    });

    response.cookies.set({
      name: SESSION_COOKIE_NAME,
      value: session.token,
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      expires: session.expiresAt,
    });

    return response;
  } catch (error) {
    if (error instanceof OtpValidationError) {
      return NextResponse.json({ message: error.message }, { status: 400 });
    }

    console.error("Failed to verify OTP", error);
    return NextResponse.json(
      { message: "Failed to verify OTP." },
      { status: 500 },
    );
  }
}
