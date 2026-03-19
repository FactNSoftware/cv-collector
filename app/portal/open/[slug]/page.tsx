import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getAuthSessionFromCookies } from "../../../../lib/auth-session";
import { getRequestAuthority, toTenantPortalUrl } from "../../../../lib/app-url";
import { listOrganizationsForMemberEmail } from "../../../../lib/organizations";
import { createPortalTransferToken } from "../../../../lib/portal-transfer";

export const dynamic = "force-dynamic";

export default async function PortalOpenPage(
  props: { params: Promise<{ slug: string }> },
) {
  const session = await getAuthSessionFromCookies();

  if (!session) {
    redirect("/portal");
  }

  const { slug } = await props.params;
  const accessibleOrganizations = await listOrganizationsForMemberEmail(session.email);
  const hasAccess = accessibleOrganizations.some(
    (item) => item.organization.slug === slug && item.organization.status === "active",
  );

  if (!hasAccess) {
    redirect("/portal");
  }

  const requestHeaders = await headers();
  const authority = getRequestAuthority(requestHeaders);
  const protocol = requestHeaders.get("x-forwarded-proto");
  const tenantUrl = toTenantPortalUrl({
    slug,
    path: "/portal-entry",
    requestAuthority: authority,
    protocol,
  });

  if (!tenantUrl) {
    redirect("/portal");
  }

  const transfer = await createPortalTransferToken(session.email);
  const redirectUrl = new URL(tenantUrl);
  redirectUrl.searchParams.set("token", transfer.token);
  redirectUrl.searchParams.set("next", "/");

  redirect(redirectUrl.toString());
}
