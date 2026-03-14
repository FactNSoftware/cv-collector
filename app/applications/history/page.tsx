import { CandidateApplicationsHistory } from "../../components/CandidateApplicationsHistory";
import { requireCandidatePageSession } from "../../../lib/auth-guards";
import { listCvSubmissionsByEmail } from "../../../lib/cv-storage";

export const dynamic = "force-dynamic";

export default async function ApplicationsHistoryPage() {
  const session = await requireCandidatePageSession();
  const submissions = await listCvSubmissionsByEmail(session.email);

  return (
    <CandidateApplicationsHistory
      sessionEmail={session.email}
      submissions={submissions}
    />
  );
}
