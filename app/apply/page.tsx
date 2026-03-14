import { CvSubmissionForm } from "../components/CvSubmissionForm";
import Link from "next/link";
import { LogoutButton } from "../components/LogoutButton";
import { requirePageSession } from "../../lib/auth-guards";
import { ensureCandidateProfile } from "../../lib/candidate-profile";
import { listPublishedJobs } from "../../lib/jobs";
import { isAdminEmail } from "../../lib/admin-access";

export default async function ApplyPage() {
  const session = await requirePageSession();
  const [profile, jobs, isAdmin] = await Promise.all([
    ensureCandidateProfile(session.email),
    listPublishedJobs(),
    isAdminEmail(session.email),
  ]);

  return (
    <main className="min-h-screen bg-white px-4 py-10 sm:px-6 sm:py-14">
      <div className="mx-auto mb-4 flex max-w-4xl items-center justify-between gap-3">
        <p className="text-sm text-slate-600">Signed in as {session.email}</p>
        <div className="flex items-center gap-2">
          <Link
            href="/applications"
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700"
          >
            My Portal
          </Link>
          {isAdmin && (
            <Link
              href="/admin"
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700"
            >
              Admin
            </Link>
          )}
          <LogoutButton />
        </div>
      </div>
      <CvSubmissionForm sessionEmail={session.email} initialProfile={profile} jobs={jobs} />
    </main>
  );
}
