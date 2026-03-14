import { CandidatePortal } from "../components/CandidatePortal";
import {
  ensureCandidateProfile,
} from "../../lib/candidate-profile";
import { listCvSubmissionsByEmail } from "../../lib/cv-storage";
import { requirePageSession } from "../../lib/auth-guards";

export const dynamic = "force-dynamic";

export default async function ApplicationsPage() {
  const session = await requirePageSession();
  const profile = await ensureCandidateProfile(session.email);
  const submissions = await listCvSubmissionsByEmail(session.email);

  return <CandidatePortal sessionEmail={session.email} profile={profile} submissions={submissions} />;
}
