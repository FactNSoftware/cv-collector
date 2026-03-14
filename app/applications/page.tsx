import { CandidatePortal } from "../components/CandidatePortal";
import {
  ensureCandidateProfile,
} from "../../lib/candidate-profile";
import { listCvSubmissionsByEmail } from "../../lib/cv-storage";
import { requirePageSession } from "../../lib/auth-guards";
import { isAdminEmail } from "../../lib/admin-access";

export const dynamic = "force-dynamic";

export default async function ApplicationsPage() {
  const session = await requirePageSession();
  const [profile, submissions, isAdmin] = await Promise.all([
    ensureCandidateProfile(session.email),
    listCvSubmissionsByEmail(session.email),
    isAdminEmail(session.email),
  ]);

  return (
    <CandidatePortal
      sessionEmail={session.email}
      profile={profile}
      submissions={submissions}
      isAdmin={isAdmin}
    />
  );
}
