import { NextResponse } from "next/server";
import { createAuthSession, SESSION_COOKIE_NAME } from "../../lib/auth-session";
import { getRequestAuthority, getSessionCookieDomain } from "../../lib/app-url";
import { consumePortalTransferToken } from "../../lib/portal-transfer";

export const runtime = "nodejs";

const normalizeNextPath = (value: string | null) => {
  if (!value) {
    return "/";
  }

  const normalized = value.startsWith("/") ? value : `/${value}`;
  return normalized.startsWith("//") ? "/" : normalized;
};

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const { searchParams } = requestUrl;
  const token = searchParams.get("token");
  const nextPath = normalizeNextPath(searchParams.get("next"));
  const transfer = await consumePortalTransferToken(token);

  if (!transfer) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  const session = await createAuthSession(transfer.email);
  const authority = getRequestAuthority(new Headers(request.headers));
  const protocol = request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim().toLowerCase() === "http"
    ? "http"
    : "https";
  const redirectTarget = authority
    ? new URL(`${protocol}://${authority}${nextPath}`)
    : new URL(nextPath, request.url);
  const response = NextResponse.redirect(redirectTarget);
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
}
