"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { LogoutButton } from "./LogoutButton";
import { useToast } from "./ToastProvider";
import type { AdminAccount } from "../../lib/admin-access";
import type { JobRecord } from "../../lib/jobs";
import type { CandidateProfile } from "../../lib/candidate-profile";

type AdminUser = CandidateProfile & {
  submissions: Array<{
    id: string;
    jobOpening: string;
    submittedAt: string;
    resumeOriginalName: string;
    resumeDownloadUrl: string;
  }>;
};

type AdminPortalProps = {
  sessionEmail: string;
  initialJobs: JobRecord[];
  initialAdmins: AdminAccount[];
  initialUsers: AdminUser[];
};

type JobFormState = {
  title: string;
  description: string;
  isPublished: boolean;
};

const EMPTY_JOB: JobFormState = {
  title: "",
  description: "",
  isPublished: false,
};

export function AdminPortal({
  sessionEmail,
  initialJobs,
  initialAdmins,
  initialUsers,
}: AdminPortalProps) {
  const [jobs, setJobs] = useState(initialJobs);
  const [admins, setAdmins] = useState(initialAdmins);
  const [users] = useState(initialUsers);
  const [jobForm, setJobForm] = useState(EMPTY_JOB);
  const [editingJobId, setEditingJobId] = useState<string | null>(null);
  const [adminEmail, setAdminEmail] = useState("");
  const [adminToken, setAdminToken] = useState("");
  const [isSavingJob, setIsSavingJob] = useState(false);
  const [isCreatingAdmin, setIsCreatingAdmin] = useState(false);
  const { showToast } = useToast();

  const resetJobForm = () => {
    setJobForm(EMPTY_JOB);
    setEditingJobId(null);
  };

  const handleJobSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSavingJob(true);

    try {
      const response = await fetch(
        editingJobId ? `/api/admin/jobs/${editingJobId}` : "/api/admin/jobs",
        {
          method: editingJobId ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(jobForm),
        },
      );

      const payload = await response
        .json()
        .catch(() => ({ message: "Failed to save job." }));

      if (!response.ok) {
        showToast(payload.message || "Failed to save job.", "error");
        return;
      }

      const savedJob = payload.item as JobRecord;
      setJobs((current) => {
        const next = editingJobId
          ? current.map((job) => (job.id === savedJob.id ? savedJob : job))
          : [savedJob, ...current];

        return next.sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
      });
      resetJobForm();
      showToast(payload.message || "Job saved successfully.");
    } catch {
      showToast("Something went wrong while saving the job.", "error");
    } finally {
      setIsSavingJob(false);
    }
  };

  const handleDeleteJob = async (jobId: string) => {
    try {
      const response = await fetch(`/api/admin/jobs/${jobId}`, { method: "DELETE" });
      const payload = await response
        .json()
        .catch(() => ({ message: "Failed to delete job." }));

      if (!response.ok) {
        showToast(payload.message || "Failed to delete job.", "error");
        return;
      }

      setJobs((current) => current.filter((job) => job.id !== jobId));
      if (editingJobId === jobId) {
        resetJobForm();
      }
      showToast(payload.message || "Job deleted successfully.");
    } catch {
      showToast("Something went wrong while deleting the job.", "error");
    }
  };

  const handleTogglePublish = async (job: JobRecord) => {
    try {
      const response = await fetch(`/api/admin/jobs/${job.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: job.title,
          description: job.description,
          isPublished: !job.isPublished,
        }),
      });
      const payload = await response
        .json()
        .catch(() => ({ message: "Failed to update job status." }));

      if (!response.ok) {
        showToast(payload.message || "Failed to update job status.", "error");
        return;
      }

      const updated = payload.item as JobRecord;
      setJobs((current) => current.map((item) => (item.id === updated.id ? updated : item)));
      showToast(updated.isPublished ? "Job published." : "Job unpublished.");
    } catch {
      showToast("Something went wrong while updating the job.", "error");
    }
  };

  const handleCreateAdmin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsCreatingAdmin(true);

    try {
      const response = await fetch("/api/admin/admins", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: adminEmail,
          permissionToken: adminToken,
        }),
      });

      const payload = await response
        .json()
        .catch(() => ({ message: "Failed to create admin." }));

      if (!response.ok) {
        showToast(payload.message || "Failed to create admin.", "error");
        return;
      }

      setAdmins((current) => [payload.item as AdminAccount, ...current]);
      setAdminEmail("");
      setAdminToken("");
      showToast(payload.message || "Admin account created successfully.");
    } catch {
      showToast("Something went wrong while creating the admin.", "error");
    } finally {
      setIsCreatingAdmin(false);
    }
  };

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#f7f5ef_0%,#ffffff_45%)] px-4 py-8 sm:px-8">
      <section className="mx-auto max-w-7xl space-y-6">
        <header className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[#01371B]">
                Admin Portal
              </p>
              <h1 className="text-3xl font-semibold tracking-[-0.03em] text-slate-900">
                Recruitment Control Room
              </h1>
              <p className="mt-2 text-sm text-slate-600">
                Signed in as {sessionEmail}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Link
                href="/applications"
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700"
              >
                Candidate Portal
              </Link>
              <LogoutButton />
            </div>
          </div>
        </header>

        <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-slate-900">Jobs</h2>
              {editingJobId && (
                <button
                  type="button"
                  onClick={resetJobForm}
                  className="text-sm font-medium text-slate-600 underline"
                >
                  Cancel edit
                </button>
              )}
            </div>

            <form className="grid gap-4" onSubmit={handleJobSubmit}>
              <input
                value={jobForm.title}
                onChange={(event) =>
                  setJobForm((current) => ({ ...current, title: event.target.value }))
                }
                placeholder="Job title"
                className="h-12 rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-[#d38133] focus:ring-4 focus:ring-[#f3d8bc]"
              />
              <textarea
                value={jobForm.description}
                onChange={(event) =>
                  setJobForm((current) => ({ ...current, description: event.target.value }))
                }
                placeholder="Short description"
                rows={4}
                className="rounded-lg border border-slate-200 px-3 py-3 text-sm outline-none focus:border-[#d38133] focus:ring-4 focus:ring-[#f3d8bc]"
              />
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={jobForm.isPublished}
                  onChange={(event) =>
                    setJobForm((current) => ({
                      ...current,
                      isPublished: event.target.checked,
                    }))
                  }
                />
                Publish immediately
              </label>
              <button
                type="submit"
                disabled={isSavingJob}
                className="h-11 rounded-lg bg-[#01371B] px-4 text-sm font-medium text-[#A3E42F] disabled:opacity-70"
              >
                {isSavingJob ? "Saving..." : editingJobId ? "Update Job" : "Create Job"}
              </button>
            </form>

            <div className="mt-6 space-y-3">
              {jobs.map((job) => (
                <article
                  key={job.id}
                  className="rounded-xl border border-slate-200 bg-slate-50 p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-lg font-semibold text-slate-900">{job.title}</h3>
                        <span
                          className={`rounded-full px-2 py-1 text-xs font-semibold ${
                            job.isPublished
                              ? "bg-emerald-100 text-emerald-800"
                              : "bg-amber-100 text-amber-800"
                          }`}
                        >
                          {job.isPublished ? "Published" : "Draft"}
                        </span>
                      </div>
                      {job.description && (
                        <p className="mt-2 text-sm text-slate-600">{job.description}</p>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setJobForm({
                            title: job.title,
                            description: job.description,
                            isPublished: job.isPublished,
                          });
                          setEditingJobId(job.id);
                        }}
                        className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => handleTogglePublish(job)}
                        className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                      >
                        {job.isPublished ? "Unpublish" : "Publish"}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteJob(job.id)}
                        className="rounded-lg border border-rose-300 px-3 py-2 text-sm text-rose-700"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </section>

          <div className="space-y-6">
            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="mb-4 text-xl font-semibold text-slate-900">Admin Accounts</h2>
              <form className="grid gap-3" onSubmit={handleCreateAdmin}>
                <input
                  value={adminEmail}
                  onChange={(event) => setAdminEmail(event.target.value)}
                  placeholder="admin@example.com"
                  className="h-12 rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-[#d38133] focus:ring-4 focus:ring-[#f3d8bc]"
                />
                <input
                  value={adminToken}
                  onChange={(event) => setAdminToken(event.target.value)}
                  placeholder="Admin permission token"
                  className="h-12 rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-[#d38133] focus:ring-4 focus:ring-[#f3d8bc]"
                />
                <button
                  type="submit"
                  disabled={isCreatingAdmin}
                  className="h-11 rounded-lg bg-slate-900 px-4 text-sm font-medium text-white disabled:opacity-70"
                >
                  {isCreatingAdmin ? "Creating..." : "Add Admin"}
                </button>
              </form>

              <div className="mt-4 space-y-2">
                {admins.map((admin) => (
                  <div
                    key={admin.email}
                    className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700"
                  >
                    <div className="font-medium text-slate-900">{admin.email}</div>
                    <div className="text-xs text-slate-500">
                      Added by {admin.createdBy} on {new Date(admin.createdAt).toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="mb-4 text-xl font-semibold text-slate-900">Candidates</h2>
              <div className="space-y-3">
                {users.map((user) => (
                  <article key={user.email} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <h3 className="text-base font-semibold text-slate-900">
                          {[user.firstName, user.lastName].filter(Boolean).join(" ") || "Unnamed Candidate"}
                        </h3>
                        <p className="text-sm text-slate-600">{user.email}</p>
                        {user.phone && <p className="text-sm text-slate-600">{user.phone}</p>}
                        {user.idOrPassportNumber && (
                          <p className="text-sm text-slate-600">{user.idOrPassportNumber}</p>
                        )}
                      </div>
                      <span className="rounded-full bg-slate-200 px-2 py-1 text-xs font-semibold text-slate-700">
                        {user.submissions.length} submission{user.submissions.length === 1 ? "" : "s"}
                      </span>
                    </div>
                    {user.submissions.length > 0 && (
                      <div className="mt-3 space-y-2 border-t border-slate-200 pt-3">
                        {user.submissions.map((submission) => (
                          <div
                            key={submission.id}
                            className="flex flex-wrap items-center justify-between gap-2 text-sm"
                          >
                            <div>
                              <span className="font-medium text-slate-900">{submission.jobOpening}</span>
                              <span className="ml-2 text-slate-500">
                                {new Date(submission.submittedAt).toLocaleString()}
                              </span>
                            </div>
                            <a
                              href={submission.resumeDownloadUrl}
                              className="text-[#0c5db3] underline underline-offset-2"
                            >
                              {submission.resumeOriginalName}
                            </a>
                          </div>
                        ))}
                      </div>
                    )}
                  </article>
                ))}
              </div>
            </section>
          </div>
        </div>
      </section>
    </main>
  );
}
