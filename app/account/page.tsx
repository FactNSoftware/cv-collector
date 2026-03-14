import { CandidateAccountView } from "../components/CandidateAccountView";
import { ensureCandidateProfile } from "../../lib/candidate-profile";
import { requireCandidatePageSession } from "../../lib/auth-guards";

export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const session = await requireCandidatePageSession();
  const profile = await ensureCandidateProfile(session.email);

  return (
    <CandidateAccountView
      sessionEmail={session.email}
      profile={profile}
    />
  );
}
