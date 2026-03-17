import { NextResponse } from "next/server";
import {
  deleteAuthSessionByToken,
  readSessionTokenFromRequest,
  SESSION_COOKIE_NAME,
} from "../../../../lib/auth-session";
import { getSessionCookieDomain } from "../../../../lib/app-url";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const token = readSessionTokenFromRequest(request);
    await deleteAuthSessionByToken(token);

    const response = NextResponse.json({ message: "Logged out successfully." });

    const cookieDomain = getSessionCookieDomain();
    response.cookies.set({
      name: SESSION_COOKIE_NAME,
      value: "",
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 0,
      ...(cookieDomain ? { domain: cookieDomain } : {}),
    });

    return response;
  } catch (error) {
    console.error("Failed to log out", error);
    return NextResponse.json(
      { message: "Failed to log out." },
      { status: 500 },
    );
  }
}
