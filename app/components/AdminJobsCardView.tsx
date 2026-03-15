"use client";

import Link from "next/link";
import { FileArchive, Pencil, Users } from "lucide-react";
import type { AdminJobListItem } from "../../lib/admin-list-types";
import { PublicJobActions } from "./PublicJobActions";

type AdminJobsCardViewProps = {
  items: AdminJobListItem[];
  downloadingJobId: string | null;
  onDownloadZip: (job: AdminJobListItem) => void;
  onTogglePublish: (job: AdminJobListItem) => void;
  onDelete: (jobId: string) => void;
};

export function AdminJobsCardView({
  items,
  downloadingJobId,
  onDownloadZip,
  onTogglePublish,
  onDelete,
}: AdminJobsCardViewProps) {
  if (items.length === 0) {
    return (
      <div className="rounded-[28px] border border-dashed border-[var(--color-border)] bg-white/70 p-6 text-sm text-[var(--color-muted)]">
        No jobs match the current filters.
      </div>
    );
  }

  return (
    <div className="space-y-4">
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
              {job.isPublished && <PublicJobActions jobId={job.id} />}
              <Link href={`/admin/jobs/${job.id}/edit`} className="theme-action-button theme-action-button-secondary inline-flex items-center rounded-xl px-4 py-2">
                <Pencil className="mr-2 h-4 w-4" />
                Edit Job
              </Link>
              <Link href={`/admin/jobs/${job.id}/candidates`} className="theme-action-button theme-action-button-secondary inline-flex items-center rounded-xl px-4 py-2">
                <Users className="mr-2 h-4 w-4" />
                View Applicants
              </Link>
              <button
                type="button"
                onClick={() => onDownloadZip(job)}
                disabled={job.applicantCount === 0 || downloadingJobId === job.id}
                className="theme-action-button theme-action-button-secondary inline-flex items-center rounded-xl px-4 py-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <FileArchive className="mr-2 h-4 w-4" />
                {downloadingJobId === job.id ? "Preparing ZIP..." : "Download Applicant CVs"}
              </button>
              <button
                type="button"
                onClick={() => onTogglePublish(job)}
                className={job.isPublished
                  ? "theme-action-button theme-action-button-soft inline-flex items-center rounded-xl px-4 py-2"
                  : "theme-btn-primary theme-action-button inline-flex items-center rounded-xl px-4 py-2"}
              >
                {job.isPublished ? "Unpublish Job" : "Publish Job"}
              </button>
              <button
                type="button"
                onClick={() => onDelete(job.id)}
                className="theme-action-button theme-action-button-danger inline-flex items-center rounded-xl px-4 py-2"
              >
                Delete Job
              </button>
            </div>
          </div>
        </article>
      ))}
    </div>
  );
}
