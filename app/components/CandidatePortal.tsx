"use client";

import Link from "next/link";
import type { CandidateProfile } from "../../lib/candidate-profile";
import type { CvSubmissionRecord } from "../../lib/cv-storage";
import { LogoutButton } from "./LogoutButton";
import { CandidateProfileForm } from "./CandidateProfileForm";

type CandidatePortalProps = {
  sessionEmail: string;
  profile: CandidateProfile;
  submissions: CvSubmissionRecord[];
};

export function CandidatePortal({
  sessionEmail,
  profile,
  submissions,
}: CandidatePortalProps) {
  return (
    <main className="min-h-screen bg-[#faf9f6] px-4 py-8 sm:px-8">
      <section className="mx-auto max-w-6xl space-y-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#01371B]">
              Candidate Portal
            </p>
            <h1 className="text-3xl font-semibold tracking-[-0.03em] text-[#171717]">
              My Profile & CVs
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <p className="text-sm text-slate-600">{sessionEmail}</p>
            <Link
              href="/apply"
              className="rounded-lg bg-[#01371B] px-4 py-2 text-sm font-medium text-[#A3E42F]"
            >
              Submit CV
            </Link>
            <LogoutButton />
          </div>
        </div>

        <section className="rounded-xl border border-slate-200 bg-slate-50 p-5">
          <h2 className="mb-4 text-lg font-semibold text-slate-900">Personal Information</h2>
          <CandidateProfileForm initialProfile={profile} />
        </section>

        <section>
          <h2 className="mb-4 text-lg font-semibold text-slate-900">My Submitted CVs</h2>
          {submissions.length === 0 ? (
            <p className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-6 text-slate-600">
              No CV submissions yet. Use the Submit CV page to upload your first resume.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500">
                    <th className="py-3 pr-4 font-semibold">Name</th>
                    <th className="py-3 pr-4 font-semibold">Job Opening</th>
                    <th className="py-3 pr-4 font-semibold">Submitted At</th>
                    <th className="py-3 pr-4 font-semibold">Resume</th>
                  </tr>
                </thead>
                <tbody>
                  {submissions.map((submission) => (
                    <tr key={submission.id} className="border-b border-slate-100">
                      <td className="py-3 pr-4 text-[#1d1d1d]">
                        {submission.firstName} {submission.lastName}
                      </td>
                      <td className="py-3 pr-4 text-[#1d1d1d]">{submission.jobOpening}</td>
                      <td className="py-3 pr-4 text-[#1d1d1d]">
                        {new Date(submission.submittedAt).toLocaleString()}
                      </td>
                      <td className="py-3 pr-4">
                        <a
                          href={`/api/cv/${submission.id}/resume`}
                          className="font-medium text-[#0c5db3] underline underline-offset-2"
                        >
                          {submission.resumeOriginalName}
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </section>
    </main>
  );
}
