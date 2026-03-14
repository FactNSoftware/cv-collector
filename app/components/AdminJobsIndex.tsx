"use client";

import Link from "next/link";
import { FileArchive, Pencil, Users } from "lucide-react";
import { useState } from "react";
import type { JobRecord } from "../../lib/jobs";
import { ConfirmDialog } from "./ConfirmDialog";
import { PortalShell } from "./PortalShell";
import { PublicJobActions } from "./PublicJobActions";
import { useToast } from "./ToastProvider";

type AdminJobsIndexProps = {
  sessionEmail: string;
  jobs: Array<JobRecord & { applicantCount: number }>;
};

export function AdminJobsIndex({ sessionEmail, jobs }: AdminJobsIndexProps) {
  const [items, setItems] = useState(jobs);
  const [pendingDeleteJobId, setPendingDeleteJobId] = useState<string | null>(null);
  const [pendingPublishJob, setPendingPublishJob] = useState<(JobRecord & { applicantCount: number }) | null>(null);
  const { showToast } = useToast();

  const togglePublish = async (job: JobRecord & { applicantCount: number }) => {
    const response = await fetch(`/api/admin/jobs/${job.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...job,
        descriptionHtml: job.descriptionHtml,
        isPublished: !job.isPublished,
      }),
    });
    const payload = await response.json().catch(() => ({ message: "Failed to update job." }));

    if (!response.ok) {
      showToast(payload.message || "Failed to update job.", "error");
      return;
    }

    setItems((current) => current.map((item) => item.id === job.id ? { ...(payload.item as JobRecord), applicantCount: item.applicantCount } : item));
    showToast(payload.message || "Job updated successfully.");
  };

  const deleteJob = async (jobId: string) => {
    const response = await fetch(`/api/admin/jobs/${jobId}`, { method: "DELETE" });
    const payload = await response.json().catch(() => ({ message: "Failed to delete job." }));

    if (!response.ok) {
      showToast(payload.message || "Failed to delete job.", "error");
      return;
    }

    setItems((current) => current.filter((item) => item.id !== jobId));
    showToast(payload.message || "Job deleted successfully.");
  };

  return (
    <PortalShell
      portal="admin"
      sessionEmail={sessionEmail}
      eyebrow="Jobs"
      title="Manage jobs and applicants"
      subtitle="Browse every role, open edit pages, and review applicant pipelines."
      primaryActionHref="/admin/jobs/new"
      primaryActionLabel="New Job"
    >
      <div className="space-y-4">
        <section className="grid gap-4 md:grid-cols-3">
          <article className="rounded-[24px] border border-[#eadfcb] bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">Total jobs</p>
            <p className="mt-2 text-2xl font-semibold text-slate-900">{items.length}</p>
          </article>
          <article className="rounded-[24px] border border-[#eadfcb] bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">Published jobs</p>
            <p className="mt-2 text-2xl font-semibold text-slate-900">{items.filter((job) => job.isPublished).length}</p>
          </article>
          <article className="rounded-[24px] border border-[#eadfcb] bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">Applications</p>
            <p className="mt-2 text-2xl font-semibold text-slate-900">{items.reduce((sum, job) => sum + job.applicantCount, 0)}</p>
          </article>
        </section>

        <section className="space-y-4">
          {items.map((job) => (
            <article key={job.id} className="rounded-[28px] border border-[#eadfcb] bg-white p-6 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="max-w-3xl">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="theme-badge-brand rounded-full px-2.5 py-1 text-xs font-semibold">
                      {job.code}
                    </span>
                    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${job.isPublished ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"}`}>
                      {job.isPublished ? "Published" : "Draft"}
                    </span>
                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
                      {job.applicantCount} applicant{job.applicantCount === 1 ? "" : "s"}
                    </span>
                  </div>
                  <h2 className="mt-3 text-2xl font-semibold text-slate-900">{job.title}</h2>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{job.summary}</p>
                  <div className="mt-4 flex flex-wrap gap-2 text-xs font-medium text-slate-700">
                    <span className="rounded-full bg-slate-100 px-2.5 py-1">{job.employmentType}</span>
                    <span className="rounded-full bg-slate-100 px-2.5 py-1">{job.workplaceType}</span>
                    <span className="rounded-full bg-slate-100 px-2.5 py-1">{job.experienceLevel}</span>
                    {job.location && <span className="rounded-full bg-slate-100 px-2.5 py-1">{job.location}</span>}
                    {job.department && <span className="rounded-full bg-slate-100 px-2.5 py-1">{job.department}</span>}
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {job.isPublished && (
                    <PublicJobActions jobId={job.id} />
                  )}
                  <Link href={`/admin/jobs/${job.id}/edit`} className="inline-flex items-center rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700">
                    <Pencil className="mr-2 h-4 w-4" />
                    Edit Job
                  </Link>
                  <Link href={`/admin/jobs/${job.id}/candidates`} className="inline-flex items-center rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700">
                    <Users className="mr-2 h-4 w-4" />
                    View Candidates
                  </Link>
                  <a href={`/api/admin/jobs/${job.id}/cvs`} className="inline-flex items-center rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700">
                    <FileArchive className="mr-2 h-4 w-4" />
                    Download CV ZIP
                  </a>
                  <button
                    type="button"
                    onClick={() => setPendingPublishJob(job)}
                    className={job.isPublished
                      ? "inline-flex items-center rounded-xl border border-[var(--color-border-strong)] bg-[var(--color-panel-strong)] px-4 py-2 text-sm font-medium text-[var(--color-brand-strong)]"
                      : "theme-btn-primary inline-flex items-center rounded-xl px-4 py-2 text-sm font-medium"}
                  >
                    {job.isPublished ? "Unpublish" : "Publish"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setPendingDeleteJobId(job.id)}
                    className="inline-flex items-center rounded-xl border border-rose-300 px-4 py-2 text-sm font-medium text-rose-700"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </article>
          ))}
        </section>
      </div>
      <ConfirmDialog
        isOpen={Boolean(pendingPublishJob)}
        title={pendingPublishJob?.isPublished ? "Unpublish job?" : "Publish job?"}
        message={pendingPublishJob?.isPublished
          ? "This will remove the job from the public listing and prevent new candidates from applying."
          : "This will make the job visible on the public careers page and allow candidates to apply."}
        confirmLabel={pendingPublishJob?.isPublished ? "Unpublish" : "Publish"}
        onConfirm={async () => {
          if (!pendingPublishJob) {
            return;
          }
          await togglePublish(pendingPublishJob);
          setPendingPublishJob(null);
        }}
        onCancel={() => setPendingPublishJob(null)}
      />
      <ConfirmDialog
        isOpen={Boolean(pendingDeleteJobId)}
        title="Delete job?"
        message="This permanently removes the job posting from the admin portal."
        confirmLabel="Delete"
        onConfirm={async () => {
          if (!pendingDeleteJobId) {
            return;
          }
          await deleteJob(pendingDeleteJobId);
          setPendingDeleteJobId(null);
        }}
        onCancel={() => setPendingDeleteJobId(null)}
      />
    </PortalShell>
  );
}
