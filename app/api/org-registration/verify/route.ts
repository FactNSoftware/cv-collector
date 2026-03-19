import { NextResponse } from "next/server";
import { OrgRegistrationError, verifyOrgRegistration } from "../../../../lib/org-registration";
import { createAuthSession, SESSION_COOKIE_NAME } from "../../../../lib/auth-session";
import { ensureCandidateProfile } from "../../../../lib/candidate-profile";

export const runtime = "nodejs";

type VerifyPayload = {
  ownerEmail?: string;
  otp?: string;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as VerifyPayload;
    const ownerEmail = typeof body.ownerEmail === "string" ? body.ownerEmail : "";
    const otp = typeof body.otp === "string" ? body.otp : "";

    const { slug, ownerEmail: activatedEmail } = await verifyOrgRegistration(ownerEmail, otp);

    // Ensure a candidate profile exists so the session is valid across portals
    await ensureCandidateProfile(activatedEmail);

    const session = await createAuthSession(activatedEmail);

    const response = NextResponse.json({
      message: "Organization created. Redirecting to your portal.",
      redirectPath: `/o/${slug}`,
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
    if (error instanceof OrgRegistrationError) {
      return NextResponse.json({ message: error.message }, { status: 400 });
    }

    console.error("Failed to verify org registration", error);
    return NextResponse.json(
      { message: "Failed to verify registration. Please try again." },
      { status: 500 },
    );
  }
}
