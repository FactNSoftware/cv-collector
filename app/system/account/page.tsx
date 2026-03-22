import { CandidateProfileForm } from "../../components/CandidateProfileForm";
import { PortalShell } from "../../components/PortalShell";
import { requireSuperAdminPageSession } from "../../../lib/auth-guards";
import { ensureCandidateProfile } from "../../../lib/candidate-profile";

export const dynamic = "force-dynamic";

export default async function SystemAccountPage() {
  const session = await requireSuperAdminPageSession();
  const profile = await ensureCandidateProfile(session.email);

  return (
    <PortalShell
      portal="system"
      sessionEmail={session.email}
      eyebrow="Account"
      title="Your account"
      subtitle="Update your basic profile details using the shared account profile flow."
    >
      <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
        <section className="rounded-[28px] border border-[var(--color-border-strong)] bg-[var(--color-panel)] p-6 shadow-[var(--shadow-soft)]">
          <CandidateProfileForm initialProfile={profile} />
        </section>
        <section className="rounded-[28px] border border-[var(--color-border-strong)] bg-[var(--color-panel)] p-6 shadow-[var(--shadow-soft)]">
          <div className="grid gap-4">
            <div className="rounded-[16px] border border-[var(--color-border)] bg-white p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-muted)]">Email</p>
              <p className="mt-3 text-lg font-semibold text-[var(--color-ink)]">{session.email}</p>
            </div>
            <div className="rounded-[16px] border border-[var(--color-border)] bg-white p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-muted)]">Role</p>
              <p className="mt-3 text-lg font-semibold text-[var(--color-ink)]">Super admin</p>
            </div>
            <div className="rounded-[16px] border border-[var(--color-border)] bg-white p-5 text-sm leading-6 text-[var(--color-muted)]">
              This account page uses the same shared basic-profile update flow as the rest of the platform, so your identity details stay consistent across all portals.
            </div>
          </div>
        </section>
      </div>
    </PortalShell>
  );
}
