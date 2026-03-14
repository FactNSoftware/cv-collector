import { AdminCandidatesIndex } from "../../components/AdminCandidatesIndex";
import { requireAdminPageSession } from "../../../lib/auth-guards";
import { listCandidateProfiles } from "../../../lib/candidate-profile";
import { listCvSubmissions } from "../../../lib/cv-storage";

export const dynamic = "force-dynamic";

export default async function AdminCandidatesPage() {
  const session = await requireAdminPageSession();
  const [profiles, submissions] = await Promise.all([
    listCandidateProfiles(),
    listCvSubmissions(),
  ]);

  const candidates = profiles.map((profile) => {
    const candidateSubmissions = submissions.filter((submission) => submission.email === profile.email);

    return {
      ...profile,
      submissionCount: candidateSubmissions.length,
      latestSubmissionAt: candidateSubmissions[0]?.submittedAt ?? null,
      latestReviewStatus: candidateSubmissions[0]?.reviewStatus ?? null,
    };
  });

  return (
    <AdminCandidatesIndex
      sessionEmail={session.email}
      candidates={candidates}
    />
  );
}
