import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getAuthSessionFromCookies } from "../../../../../lib/auth-session";
import { getRequestAuthority, toTenantPortalUrl } from "../../../../../lib/app-url";
import { getOrganizationBySlug, listOrganizationsForMemberEmail } from "../../../../../lib/organizations";
import { createPortalTransferToken } from "../../../../../lib/portal-transfer";
import { isSuperAdminEmail } from "../../../../../lib/super-admin-access";

export const dynamic = "force-dynamic";

const normalizeProtocol = (value: string | null) => {
  const normalized = (value ?? "").split(",")[0]?.trim().toLowerCase();
  return normalized === "http" || normalized === "https" ? normalized : "https";
};

const normalizeNextPath = (value: string | string[] | undefined) => {
  const raw = typeof value === "string"
    ? value
    : Array.isArray(value)
      ? (value[0] ?? "")
      : "";

  if (!raw) {
    return "/";
  }

  const normalized = raw.startsWith("/") ? raw : `/${raw}`;
  return normalized.startsWith("//") ? "/" : normalized;
};

type Props = {
  params: Promise<{ slug: string; nextSlug: string }>;
  searchParams: Promise<{ next?: string | string[] }>;
};

export default async function TenantOrganizationSwitchPage({ params, searchParams }: Props) {
  const session = await getAuthSessionFromCookies();

  if (!session) {
    redirect("/");
  }

  const { nextSlug } = await params;
  const resolvedSearchParams = await searchParams;
  const nextPath = normalizeNextPath(resolvedSearchParams.next);
  const normalizedEmail = session.email.trim().toLowerCase();
  const [isSuperAdmin, accessibleOrganizations] = await Promise.all([
    isSuperAdminEmail(normalizedEmail),
    listOrganizationsForMemberEmail(normalizedEmail),
  ]);

  const canAccessTarget = accessibleOrganizations.some(
    ({ organization }) => organization.slug === nextSlug && organization.status === "active",
  );

  if (!canAccessTarget && !isSuperAdmin) {
    redirect("/");
  }

  if (isSuperAdmin && !canAccessTarget) {
    const organization = await getOrganizationBySlug(nextSlug);

    if (!organization || organization.status !== "active") {
      redirect("/");
    }
  }

  const requestHeaders = await headers();
  const authority = getRequestAuthority(requestHeaders);
  const protocol = normalizeProtocol(requestHeaders.get("x-forwarded-proto"));
  const tenantUrl = toTenantPortalUrl({
    slug: nextSlug,
    path: "/portal-entry",
    requestAuthority: authority,
    protocol,
  });

  if (!tenantUrl) {
    redirect("/");
  }

  const transfer = await createPortalTransferToken(normalizedEmail);
  const redirectUrl = new URL(tenantUrl);
  redirectUrl.searchParams.set("token", transfer.token);
  redirectUrl.searchParams.set("next", nextPath);

  redirect(redirectUrl.toString());
}
