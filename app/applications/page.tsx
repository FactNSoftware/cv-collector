import { CandidatePortal } from "../components/CandidatePortal";
import {
  ensureCandidateProfile,
} from "../../lib/candidate-profile";
import { listCvSubmissionsByEmail } from "../../lib/cv-storage";
import { requireCandidatePageSession } from "../../lib/auth-guards";

export const dynamic = "force-dynamic";

export default async function ApplicationsPage() {
  const session = await requireCandidatePageSession();
  const [profile, submissions] = await Promise.all([
    ensureCandidateProfile(session.email),
    listCvSubmissionsByEmail(session.email),
  ]);

  return (
    <CandidatePortal
      sessionEmail={session.email}
      profile={profile}
      submissions={submissions}
    />
  );
}
