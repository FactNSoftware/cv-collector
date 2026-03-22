import { CandidateAccountView } from "../components/CandidateAccountView";
import { requireCandidatePageSession } from "../../lib/auth-guards";
import { ensureCandidateProfile } from "../../lib/candidate-profile";

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
