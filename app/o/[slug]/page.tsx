import { getAuthSessionFromCookies } from "../../../lib/auth-session";
import { getOrganizationBySlug } from "../../../lib/organizations";
import { resolveOrganizationAccess } from "../../../lib/organizations";
import { isSuperAdminEmail } from "../../../lib/super-admin-access";
import { TenantLoginForm } from "../../components/TenantLoginForm";
import { TenantPortal } from "../../components/TenantPortal";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

const isValidEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ email?: string | string[] }>;
};

export default async function TenantPortalPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const resolvedSearchParams = await searchParams;
  const emailParam = resolvedSearchParams.email;
  const initialEmailCandidate = typeof emailParam === "string"
    ? emailParam.trim().toLowerCase()
    : Array.isArray(emailParam)
      ? (emailParam[0] ?? "").trim().toLowerCase()
      : "";
  const initialEmail = isValidEmail(initialEmailCandidate) ? initialEmailCandidate : "";

  const organization = await getOrganizationBySlug(slug);

  if (!organization || organization.status !== "active") {
    notFound();
  }

  const session = await getAuthSessionFromCookies();

  if (!session) {
    return (
      <TenantLoginForm
        slug={slug}
        orgName={organization.name}
        orgLogoUrl={organization.logoUrl}
        orgDescription={organization.description}
        initialEmail={initialEmail}
      />
    );
  }

  const [{ membership }, isSuperAdmin] = await Promise.all([
    resolveOrganizationAccess({ slug, email: session.email }),
    isSuperAdminEmail(session.email),
  ]);

  if (!isSuperAdmin && !membership) {
    // Authenticated but not a member — show login form so they can switch accounts
    return (
      <TenantLoginForm
        slug={slug}
        orgName={organization.name}
        orgLogoUrl={organization.logoUrl}
        orgDescription={organization.description}
        initialEmail={initialEmail}
      />
    );
  }

  return (
    <TenantPortal
      sessionEmail={session.email}
      organization={organization}
      membership={membership ?? null}
      isSuperAdmin={isSuperAdmin}
    />
  );
}
