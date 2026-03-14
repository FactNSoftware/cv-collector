"use client";

import { startTransition, useEffect, useMemo, useState } from "react";
import { JobDetailContent } from "./JobDetailContent";
import { PortalShell } from "./PortalShell";
import {
  getJobPreviewStorageKey,
  mergeJobPreviewDraft,
  type JobPreviewDraft,
} from "../../lib/job-preview";
import type { JobRecord } from "../../lib/jobs";
import { PublicJobActions } from "./PublicJobActions";

type AdminJobPreviewClientProps = {
  sessionEmail: string;
  job: JobRecord;
};

export function AdminJobPreviewClient({
  sessionEmail,
  job,
}: AdminJobPreviewClientProps) {
  const [draftJob, setDraftJob] = useState<JobRecord | null>(null);

  useEffect(() => {
    const storageKey = getJobPreviewStorageKey(job.id);
    const rawDraft = window.sessionStorage.getItem(storageKey);

    if (!rawDraft) {
      startTransition(() => {
        setDraftJob(null);
      });
      return;
    }

    try {
      const parsedDraft = JSON.parse(rawDraft) as JobPreviewDraft;
      startTransition(() => {
        setDraftJob(mergeJobPreviewDraft(job, parsedDraft));
      });
    } catch {
      startTransition(() => {
        setDraftJob(null);
      });
    }
  }, [job]);

  const previewJob = draftJob ?? job;
  const subtitle = useMemo(() => {
    return draftJob
      ? "Previewing your current unsaved edits before publishing."
      : "Preview how this role appears before publishing.";
  }, [draftJob]);

  return (
    <PortalShell
      portal="admin"
      sessionEmail={sessionEmail}
      eyebrow="Job Preview"
      title={previewJob.title}
      subtitle={subtitle}
      primaryActionHref={`/admin/jobs/${previewJob.id}/edit`}
      primaryActionLabel="Back to Edit"
    >
      <section className="space-y-4 px-1 py-2">
        {previewJob.isPublished && (
          <div className="flex justify-end">
            <PublicJobActions jobId={previewJob.id} />
          </div>
        )}
        <JobDetailContent job={previewJob} showStatus />
      </section>
    </PortalShell>
  );
}
