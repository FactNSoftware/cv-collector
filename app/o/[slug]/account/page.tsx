import { CandidateProfileForm } from "../../../components/CandidateProfileForm";
import { PortalShell } from "../../../components/PortalShell";
import { requireOrganizationAdminPageSession } from "../../../../lib/auth-guards";
import { ensureCandidateProfile } from "../../../../lib/candidate-profile";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

export default async function TenantAccountPage({ params }: Props) {
  const { slug } = await params;
  const access = await requireOrganizationAdminPageSession(slug);
  const profile = await ensureCandidateProfile(access.session.email);
  const roleLabel = access.isSuperAdmin
    ? "Super admin"
    : access.membership?.isRootOwner
      ? "Root owner"
      : access.membership?.role === "owner"
        ? "Owner"
        : "Admin";

  return (
    <PortalShell
      portal="tenant"
      sessionEmail={access.session.email}
      organizationSlug={slug}
      tenantFeatureKeys={access.featureKeys}
      eyebrow="Account"
      title="Your account"
      subtitle="Update your basic profile details and review your organization access."
    >
      <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
        <section className="rounded-[28px] border border-[var(--color-border-strong)] bg-[var(--color-panel)] p-6 shadow-[var(--shadow-soft)]">
          <CandidateProfileForm initialProfile={profile} />
        </section>
        <section className="rounded-[28px] border border-[var(--color-border-strong)] bg-[var(--color-panel)] p-6 shadow-[var(--shadow-soft)]">
          <div className="grid gap-4">
            <div className="rounded-[16px] border border-[var(--color-border)] bg-white p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-muted)]">Email</p>
              <p className="mt-3 text-lg font-semibold text-[var(--color-ink)]">{access.session.email}</p>
            </div>
            <div className="rounded-[16px] border border-[var(--color-border)] bg-white p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-muted)]">Organization</p>
              <p className="mt-3 text-lg font-semibold text-[var(--color-ink)]">{access.organization.name}</p>
            </div>
            <div className="rounded-[16px] border border-[var(--color-border)] bg-white p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-muted)]">Role</p>
              <p className="mt-3 text-lg font-semibold text-[var(--color-ink)]">{roleLabel}</p>
            </div>
          </div>
        </section>
      </div>
    </PortalShell>
  );
}
