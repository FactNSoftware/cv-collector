"use client";

import Link from "next/link";
import { Briefcase, Eye, Pencil, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import type { JobRecord } from "../../lib/jobs";
import { ConfirmDialog } from "./ConfirmDialog";
import { PortalShell } from "./PortalShell";
import { useToast } from "./ToastProvider";

type Props = {
  sessionEmail: string;
  organizationSlug: string;
  tenantFeatureKeys: string[];
  jobs: JobRecord[];
  isOwnerOrAdmin: boolean;
};

const JobStatusBadge = ({ isPublished }: { isPublished: boolean }) => (
  <span
    className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
      isPublished
        ? "bg-emerald-100 text-emerald-800"
        : "bg-amber-100 text-amber-800"
    }`}
  >
    {isPublished ? "Published" : "Draft"}
  </span>
);

export function TenantJobsPortal({
  sessionEmail,
  organizationSlug,
  tenantFeatureKeys,
  jobs: initialJobs,
  isOwnerOrAdmin,
}: Props) {
  const { showToast } = useToast();
  const [jobs, setJobs] = useState(initialJobs);
  const [searchQuery, setSearchQuery] = useState("");
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const filtered = jobs.filter((job) => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return true;
    return (
      job.title.toLowerCase().includes(q) ||
      job.code.toLowerCase().includes(q) ||
      job.department.toLowerCase().includes(q)
    );
  });

  const handleTogglePublish = async (job: JobRecord) => {
    setTogglingId(job.id);
    try {
      const response = await fetch(
        `/api/tenant/${organizationSlug}/jobs/${job.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ isPublished: !job.isPublished }),
        },
      );
      const payload = await response
        .json()
        .catch(() => ({ message: "Failed to update." }));
      if (!response.ok) {
        showToast(payload.message || "Failed to update job.", "error");
        return;
      }
      setJobs((prev) =>
        prev.map((j) =>
          j.id === job.id ? { ...j, isPublished: !j.isPublished } : j,
        ),
      );
      showToast(
        job.isPublished ? "Job unpublished." : "Job published.",
      );
    } finally {
      setTogglingId(null);
    }
  };

  const handleDelete = async (id: string) => {
    const response = await fetch(
      `/api/tenant/${organizationSlug}/jobs/${id}`,
      { method: "DELETE" },
    );
    if (!response.ok) {
      showToast("Failed to delete job.", "error");
      return;
    }
    setJobs((prev) => prev.filter((j) => j.id !== id));
    showToast("Job deleted.");
    setPendingDeleteId(null);
  };

  return (
    <PortalShell
      portal="tenant"
      organizationSlug={organizationSlug}
      tenantFeatureKeys={tenantFeatureKeys}
      sessionEmail={sessionEmail}
      eyebrow="Jobs"
      title="Job postings"
      subtitle="Manage your open positions and job listings."
    >
      <ConfirmDialog
        isOpen={!!pendingDeleteId}
        title="Delete job?"
        message="This will soft-delete the job posting. Existing applications will not be affected."
        confirmLabel="Delete"
        onConfirm={() => {
          if (pendingDeleteId) {
            return handleDelete(pendingDeleteId);
          }
        }}
        onCancel={() => setPendingDeleteId(null)}
      />

      <section className="rounded-[28px] border border-[var(--color-border-strong)] bg-[var(--color-panel)] p-6 shadow-[var(--shadow-soft)]">
        <div className="mb-5 flex flex-wrap items-center gap-3">
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by title, code, or department"
            className="h-11 flex-1 rounded-2xl border border-[var(--color-border)] bg-white px-4 text-sm text-[var(--color-ink)] outline-none focus:border-[var(--color-brand-strong)] focus:ring-4 focus:ring-[var(--color-focus-ring)]"
          />
          {isOwnerOrAdmin && (
            <Link
              href={`/o/${organizationSlug}/jobs/new`}
              className="theme-btn-primary inline-flex h-11 items-center gap-2 rounded-2xl px-4 text-sm font-medium"
            >
              <Plus className="h-4 w-4" />
              New job
            </Link>
          )}
        </div>

        {filtered.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-16 text-center">
            <Briefcase className="h-10 w-10 text-[var(--color-muted)]" />
            <p className="text-base font-medium text-[var(--color-ink)]">
              {jobs.length === 0 ? "No jobs yet" : "No jobs match your search"}
            </p>
            {jobs.length === 0 && isOwnerOrAdmin && (
              <Link
                href={`/o/${organizationSlug}/jobs/new`}
                className="theme-btn-primary mt-2 inline-flex h-10 items-center gap-2 rounded-xl px-4 text-sm font-medium"
              >
                <Plus className="h-4 w-4" />
                Create your first job
              </Link>
            )}
          </div>
        ) : (
          <div className="divide-y divide-[var(--color-border)]">
            {filtered.map((job) => (
              <div
                key={job.id}
                className="flex flex-wrap items-center gap-3 py-4 first:pt-0 last:pb-0"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs text-[var(--color-muted)]">
                      {job.code}
                    </span>
                    <JobStatusBadge isPublished={job.isPublished} />
                  </div>
                  <p className="mt-0.5 truncate text-sm font-semibold text-[var(--color-ink)]">
                    {job.title}
                  </p>
                  <p className="text-xs text-[var(--color-muted)]">
                    {[job.department, job.location, job.employmentType]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <Link
                    href={`/admin/jobs/${job.id}/preview`}
                    className="inline-flex h-8 items-center gap-1.5 rounded-xl border border-[var(--color-border)] px-3 text-xs font-medium text-[var(--color-ink)] transition hover:bg-[var(--color-panel-strong)]"
                  >
                    <Eye className="h-3.5 w-3.5" />
                    Preview
                  </Link>

                  {isOwnerOrAdmin && (
                    <>
                      <Link
                        href={`/o/${organizationSlug}/jobs/${job.id}/edit`}
                        className="inline-flex h-8 items-center gap-1.5 rounded-xl border border-[var(--color-border)] px-3 text-xs font-medium text-[var(--color-ink)] transition hover:bg-[var(--color-panel-strong)]"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                        Edit
                      </Link>
                      <button
                        type="button"
                        disabled={togglingId === job.id}
                        onClick={() => handleTogglePublish(job)}
                        className="inline-flex h-8 items-center rounded-xl border border-[var(--color-border)] px-3 text-xs font-medium text-[var(--color-ink)] transition hover:bg-[var(--color-panel-strong)] disabled:opacity-60"
                      >
                        {job.isPublished ? "Unpublish" : "Publish"}
                      </button>
                      <button
                        type="button"
                        onClick={() => setPendingDeleteId(job.id)}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-[var(--color-border)] text-[var(--color-muted)] transition hover:border-red-300 hover:bg-red-50 hover:text-red-600"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </PortalShell>
  );
}
