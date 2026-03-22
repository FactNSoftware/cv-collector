import { getAuthSessionFromCookies } from "../../../lib/auth-session";
import { getOrganizationBySlug } from "../../../lib/organizations";
import { listOrganizationsForMemberEmail } from "../../../lib/organizations";
import { resolveOrganizationAccess } from "../../../lib/organizations";
import { resolveOrganizationSubscriptionAccess } from "../../../lib/subscriptions";
import { isSuperAdminEmail } from "../../../lib/super-admin-access";
import { listOrganizationMemberships } from "../../../lib/organizations";
import { listJobs } from "../../../lib/jobs";
import { listCvSubmissions } from "../../../lib/cv-storage";
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

  let effectiveMembership = membership;

  if (!isSuperAdmin && !effectiveMembership) {
    const accessibleOrganizations = await listOrganizationsForMemberEmail(session.email);
    const matchedAccess = accessibleOrganizations.find((item) => item.organization.slug === slug);

    if (matchedAccess) {
      effectiveMembership = {
        organizationId: organization.id,
        email: session.email.trim().toLowerCase(),
        role: matchedAccess.role,
        isRootOwner: matchedAccess.isRootOwner,
        createdAt: organization.createdAt,
        createdBy: organization.createdBy,
        updatedAt: organization.updatedAt,
        updatedBy: organization.updatedBy,
        isDeleted: false,
        deletedAt: null,
        deletedBy: "",
      };
    }
  }

  if (!isSuperAdmin && !effectiveMembership) {
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

  const [featureAccess, members, jobs, submissions] = await Promise.all([
    resolveOrganizationSubscriptionAccess(organization.id),
    listOrganizationMemberships(organization.id),
    listJobs(),
    listCvSubmissions(),
  ]);

  return (
    <TenantPortal
      sessionEmail={session.email}
      organization={organization}
      membership={effectiveMembership ?? null}
      isSuperAdmin={isSuperAdmin}
      featureKeys={featureAccess.featureKeys}
      effectiveSubscription={featureAccess.subscription}
      featureAccessSource={featureAccess.source}
      members={members}
      jobs={jobs.filter((job) => !job.isDeleted)}
      submissions={submissions}
    />
  );
}
