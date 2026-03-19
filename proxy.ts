import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getAppBaseHost, isValidTenantSlug } from "./lib/app-url";

const BASE_HOST = getAppBaseHost();
const TENANT_PATH_PATTERN = /^\/o\/([^/]+)(?:\/(.*))?$/;

const PUBLIC_PATH_PREFIXES = ["/_next", "/api"];
const PUBLIC_PATH_EXACT = new Set([
  "/favicon.ico",
  "/icon.svg",
  "/opengraph-image",
  "/robots.txt",
  "/sitemap.xml",
]);

const normalizeHost = (value: string | null) => {
  if (!value) {
    return "";
  }

  return value
    .split(",")[0]
    .trim()
    .toLowerCase()
    .replace(/\.$/, "")
    .split(":")[0];
};

const isStaticAssetPath = (pathname: string) => {
  const lastSegment = pathname.split("/").pop() ?? "";
  return /\.[a-z0-9]+$/i.test(lastSegment);
};

const isPublicPath = (pathname: string) => {
  if (PUBLIC_PATH_EXACT.has(pathname)) {
    return true;
  }

  if (PUBLIC_PATH_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
    return true;
  }

  return isStaticAssetPath(pathname);
};

const extractTenantSlugFromHost = (host: string) => {
  if (!BASE_HOST || host === BASE_HOST) {
    return null;
  }

  const suffix = `.${BASE_HOST}`;

  if (!host.endsWith(suffix)) {
    return null;
  }

  const subdomain = host.slice(0, -suffix.length);

  if (!subdomain || subdomain.includes(".")) {
    return null;
  }

  return isValidTenantSlug(subdomain) ? subdomain : null;
};

const parseTenantPath = (pathname: string) => {
  const match = pathname.match(TENANT_PATH_PATTERN);

  if (!match) {
    return null;
  }

  let slug = "";

  try {
    slug = decodeURIComponent(match[1]).trim().toLowerCase();
  } catch {
    return null;
  }

  if (!isValidTenantSlug(slug)) {
    return null;
  }

  const remainder = match[2] ? `/${match[2]}` : "/";

  return { slug, remainder };
};

export function proxy(request: NextRequest) {
  if (!BASE_HOST) {
    return NextResponse.next();
  }

  const url = request.nextUrl.clone();
  const pathname = url.pathname;

  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  const host = normalizeHost(
    request.headers.get("x-forwarded-host")
    ?? request.headers.get("host")
    ?? url.host,
  );

  if (!host) {
    return NextResponse.next();
  }

  const tenantSlugFromHost = extractTenantSlugFromHost(host);

  if (tenantSlugFromHost) {
    const tenantPath = parseTenantPath(pathname);

    // Keep subdomain URLs clean: /o/<slug>/x -> /x
    if (tenantPath && tenantPath.slug === tenantSlugFromHost) {
      const redirectUrl = url.clone();
      redirectUrl.pathname = tenantPath.remainder;
      return NextResponse.redirect(redirectUrl, 308);
    }

    // Canonicalize mismatched explicit tenant path to the matching subdomain.
    if (tenantPath && tenantPath.slug !== tenantSlugFromHost) {
      const redirectUrl = url.clone();
      redirectUrl.hostname = `${tenantPath.slug}.${BASE_HOST}`;
      redirectUrl.pathname = tenantPath.remainder;
      return NextResponse.redirect(redirectUrl, 308);
    }

    if (!pathname.startsWith("/o/")) {
      const rewriteUrl = url.clone();
      rewriteUrl.pathname = pathname === "/"
        ? `/o/${tenantSlugFromHost}`
        : `/o/${tenantSlugFromHost}${pathname}`;

      return NextResponse.rewrite(rewriteUrl);
    }

    return NextResponse.next();
  }

  if (host === BASE_HOST) {
    const tenantPath = parseTenantPath(pathname);

    // Canonical URL: /o/<slug>/x on base host -> https://<slug>.<baseHost>/x
    if (tenantPath) {
      const redirectUrl = url.clone();
      redirectUrl.hostname = `${tenantPath.slug}.${BASE_HOST}`;
      redirectUrl.pathname = tenantPath.remainder;
      return NextResponse.redirect(redirectUrl, 308);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: "/:path*",
};
