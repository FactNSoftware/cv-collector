import { CandidateApplicationsHistory } from "../../components/CandidateApplicationsHistory";
import { requireCandidatePageSession } from "../../../lib/auth-guards";
import { listCvSubmissionsByEmail } from "../../../lib/cv-storage";
import { listChatInboxForRequester } from "../../../lib/acs-chat";

export const dynamic = "force-dynamic";

export default async function ApplicationsHistoryPage() {
  const session = await requireCandidatePageSession();
  const [submissions, chatInbox] = await Promise.all([
    listCvSubmissionsByEmail(session.email),
    listChatInboxForRequester(session.email),
  ]);

  return (
    <CandidateApplicationsHistory
      sessionEmail={session.email}
      submissions={submissions}
      chatItems={chatInbox.items}
    />
  );
}
