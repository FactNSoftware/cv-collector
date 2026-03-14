"use client";

import { CandidateProfileForm } from "./CandidateProfileForm";
import { PortalShell } from "./PortalShell";
import type { CandidateProfile } from "../../lib/candidate-profile";

type CandidateAccountViewProps = {
  sessionEmail: string;
  profile: CandidateProfile;
};

export function CandidateAccountView({
  sessionEmail,
  profile,
}: CandidateAccountViewProps) {
  return (
    <PortalShell
      portal="candidate"
      sessionEmail={sessionEmail}
      eyebrow="Profile"
      title="Manage your profile"
      subtitle="Basic details are required for job applications. Keep them valid and ready."
      primaryActionHref="/apply"
      primaryActionLabel="Apply for a Job"
    >
      <section className="rounded-[28px] border border-[var(--color-border-strong)] bg-[var(--color-panel)] p-6 shadow-[var(--shadow-soft)]">
        <CandidateProfileForm initialProfile={profile} />
      </section>
    </PortalShell>
  );
}
