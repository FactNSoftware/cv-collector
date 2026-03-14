import { notFound } from "next/navigation";
import { AdminCandidateDetail } from "../../../components/AdminCandidateDetail";
import { isAdminEmail } from "../../../../lib/admin-access";
import { requireAdminPageSession } from "../../../../lib/auth-guards";
import { getCandidateProfileByEmail } from "../../../../lib/candidate-profile";
import { listCvSubmissionsByEmail } from "../../../../lib/cv-storage";

export const dynamic = "force-dynamic";

export default async function AdminCandidateDetailPage(
  props: { params: Promise<{ email: string }> },
) {
  const session = await requireAdminPageSession();
  const { email } = await props.params;
  const candidateEmail = decodeURIComponent(email);
  const [candidate, submissions, candidateIsAdmin] = await Promise.all([
    getCandidateProfileByEmail(candidateEmail),
    listCvSubmissionsByEmail(candidateEmail),
    isAdminEmail(candidateEmail),
  ]);

  if (!candidate) {
    notFound();
  }

  return (
    <AdminCandidateDetail
      sessionEmail={session.email}
      candidate={candidate}
      submissions={submissions}
      isAdmin={candidateIsAdmin}
    />
  );
}
