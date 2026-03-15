"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { BriefcaseBusiness, MapPin, Sparkles } from "lucide-react";
import {
  EMPLOYMENT_TYPES,
  EXPERIENCE_LEVELS,
  SALARY_CURRENCIES,
  type JobRecord,
  WORKPLACE_TYPES,
} from "../../lib/jobs";
import {
  getJobPreviewStorageKey,
  type JobPreviewDraft,
} from "../../lib/job-preview";
import { PortalShell } from "./PortalShell";
import { useToast } from "./ToastProvider";
import { JobDescriptionEditor } from "./JobDescriptionEditor";
import { LoadingOverlay } from "./LoadingOverlay";

type JobEditorFormProps = {
  sessionEmail: string;
  mode: "create" | "edit";
  initialJob?: JobRecord | null;
};

type JobFormState = JobPreviewDraft;

const EMPTY_JOB_FORM: JobFormState = {
  title: "",
  summary: "",
  descriptionHtml: "<p>Start with a clear role summary, responsibilities, and candidate expectations.</p>",
  department: "",
  location: "",
  employmentType: "Full-time",
  workplaceType: "On-site",
  experienceLevel: "Mid level",
  salaryCurrency: "LKR",
  salaryRange: "",
  vacancies: "1",
  maxRetryAttempts: "0",
  atsEnabled: false,
  atsRequiredKeywords: "",
  atsPreferredKeywords: "",
  atsMinimumYearsExperience: "0",
  atsRequiredEducation: "",
  atsRequiredCertifications: "",
  closingDate: "",
  requirements: "",
  benefits: "",
  isPublished: false,
};

const toJobFormState = (job: JobRecord): JobFormState => ({
  title: job.title,
  summary: job.summary,
  descriptionHtml: job.descriptionHtml,
  department: job.department,
  location: job.location,
  employmentType: job.employmentType,
  workplaceType: job.workplaceType,
  experienceLevel: job.experienceLevel,
  salaryCurrency: job.salaryCurrency,
  salaryRange: job.salaryRange,
  vacancies: job.vacancies ? String(job.vacancies) : "1",
  maxRetryAttempts: String(job.maxRetryAttempts ?? 0),
  atsEnabled: job.atsEnabled,
  atsRequiredKeywords: job.atsRequiredKeywords.join("\n"),
  atsPreferredKeywords: job.atsPreferredKeywords.join("\n"),
  atsMinimumYearsExperience: String(job.atsMinimumYearsExperience ?? 0),
  atsRequiredEducation: job.atsRequiredEducation.join("\n"),
  atsRequiredCertifications: job.atsRequiredCertifications.join("\n"),
  closingDate: job.closingDate,
  requirements: job.requirements,
  benefits: job.benefits,
  isPublished: job.isPublished,
});

export function JobEditorForm({
  sessionEmail,
  mode,
  initialJob,
}: JobEditorFormProps) {
  const cancelHref = mode === "edit" && initialJob
    ? `/admin/jobs/${initialJob.id}/candidates`
    : "/admin/jobs";
  const previewHref = mode === "edit" && initialJob
    ? `/admin/jobs/${initialJob.id}/preview`
    : null;
  const [jobForm, setJobForm] = useState<JobFormState>(
    initialJob ? toJobFormState(initialJob) : EMPTY_JOB_FORM,
  );
  const [isSaving, setIsSaving] = useState(false);
  const [isPreviewNavigating, setIsPreviewNavigating] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const { showToast } = useToast();

  const previewStorageKey = initialJob
    ? getJobPreviewStorageKey(initialJob.id)
    : null;

  const saveJob = async () => {
    try {
      const response = await fetch(
        mode === "edit" && initialJob ? `/api/admin/jobs/${initialJob.id}` : "/api/admin/jobs",
        {
          method: mode === "edit" ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...jobForm,
            vacancies: Number(jobForm.vacancies) || 1,
            maxRetryAttempts: Math.max(0, Number(jobForm.maxRetryAttempts) || 0),
            atsEnabled: Boolean(jobForm.atsEnabled),
            atsRequiredKeywords: jobForm.atsRequiredKeywords,
            atsPreferredKeywords: jobForm.atsPreferredKeywords,
            atsMinimumYearsExperience: Math.max(0, Number(jobForm.atsMinimumYearsExperience) || 0),
            atsRequiredEducation: jobForm.atsRequiredEducation,
            atsRequiredCertifications: jobForm.atsRequiredCertifications,
          }),
        },
      );

      const payload = await response
        .json()
        .catch(() => ({ message: "Failed to save job." }));

      if (!response.ok) {
        showToast(payload.message || "Failed to save job.", "error");
        return null;
      }

      return payload.item as JobRecord;
    } catch {
      showToast("Something went wrong while saving the job.", "error");
      return null;
    }
  };

  const handlePreview = async () => {
    if (!previewHref || !previewStorageKey || !initialJob || mode !== "edit") {
      return;
    }

    setIsPreviewNavigating(true);

    const savedJob = await saveJob();

    if (savedJob) {
      window.sessionStorage.removeItem(previewStorageKey);
      window.location.href = `/admin/jobs/${savedJob.id}/preview`;
      return;
    }

    setIsPreviewNavigating(false);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSaving(true);

    const savedJob = await saveJob();

    if (savedJob) {
      if (previewStorageKey) {
        window.sessionStorage.removeItem(previewStorageKey);
      }
      showToast("Job saved successfully.");
      window.location.href = `/admin/jobs/${savedJob.id}/edit`;
      return;
    }

    setIsSaving(false);
  };

  const handleImageUpload = async (file: File): Promise<string | null> => {
    setIsUploadingImage(true);

    try {
      const formData = new FormData();
      formData.append("image", file);

      const response = await fetch("/api/admin/job-assets", {
        method: "POST",
        body: formData,
      });

      const payload = await response
        .json()
        .catch(() => ({ message: "Failed to upload image." }));

      if (!response.ok) {
        showToast(payload.message || "Failed to upload image.", "error");
        return null;
      }

      const url = payload.item?.url as string;

      if (!url) {
        showToast("Image upload returned no URL.", "error");
        return null;
      }

      showToast("Image uploaded.");
      return url;
    } catch {
      showToast("Something went wrong while uploading the image.", "error");
      return null;
    } finally {
      setIsUploadingImage(false);
    }
  };

  return (
    <PortalShell
      portal="admin"
      sessionEmail={sessionEmail}
      eyebrow={mode === "edit" && initialJob ? initialJob.code : "New Job"}
      title={mode === "edit" ? `Edit ${initialJob?.title ?? "job"}` : "Create a new job"}
      subtitle="Structured role details, rich description content, and publishing controls."
      primaryActionHref={initialJob ? `/admin/jobs/${initialJob.id}/candidates` : "/admin/jobs"}
      primaryActionLabel={initialJob ? "View Applicants" : "Back to Jobs"}
    >
      <section className="rounded-[28px] border border-[var(--color-border-strong)] bg-[var(--color-panel)] p-6 shadow-[var(--shadow-soft)]">
          <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-sm text-slate-600">
                Job code is auto-generated on first save. Use structured details so candidates can understand the role before applying.
              </p>
            </div>
            <div className="rounded-2xl bg-[#f5f7ef] px-4 py-3 text-sm text-slate-700">
              {initialJob
                ? `Last updated ${new Date(initialJob.updatedAt).toLocaleString()}`
                : "Ready to create a new job record."}
            </div>
          </div>

          <form className="space-y-6" onSubmit={handleSubmit}>
            <div className="grid gap-5 md:grid-cols-2">
              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-slate-800">Job title</span>
                <input
                  value={jobForm.title}
                  onChange={(event) => setJobForm((current) => ({ ...current, title: event.target.value }))}
                  placeholder="Senior Software Engineer"
                  className="h-12 w-full rounded-xl border border-[var(--color-border)] bg-white px-4 text-sm outline-none focus:border-[var(--color-brand-strong)] focus:ring-4 focus:ring-[rgba(165,235,46,0.18)]"
                />
              </label>
              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-slate-800">Department</span>
                <input
                  value={jobForm.department}
                  onChange={(event) => setJobForm((current) => ({ ...current, department: event.target.value }))}
                  placeholder="Engineering"
                  className="h-12 w-full rounded-xl border border-[var(--color-border)] bg-white px-4 text-sm outline-none focus:border-[var(--color-brand-strong)] focus:ring-4 focus:ring-[rgba(165,235,46,0.18)]"
                />
              </label>
              <label className="block md:col-span-2">
                <span className="mb-2 block text-sm font-semibold text-slate-800">Short summary</span>
                <textarea
                  value={jobForm.summary}
                  onChange={(event) => setJobForm((current) => ({ ...current, summary: event.target.value }))}
                  rows={3}
                  placeholder="A concise overview candidates will see before opening the full role details."
                  className="w-full rounded-xl border border-[var(--color-border)] bg-white px-4 py-3 text-sm outline-none focus:border-[var(--color-brand-strong)] focus:ring-4 focus:ring-[rgba(165,235,46,0.18)]"
                />
              </label>
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-slate-800">Employment type</span>
                <select value={jobForm.employmentType} onChange={(event) => setJobForm((current) => ({ ...current, employmentType: event.target.value }))} className="h-12 w-full rounded-xl border border-[var(--color-border)] bg-white px-4 text-sm outline-none focus:border-[var(--color-brand-strong)] focus:ring-4 focus:ring-[rgba(165,235,46,0.18)]">
                  {EMPLOYMENT_TYPES.map((item) => <option key={item} value={item}>{item}</option>)}
                </select>
              </label>
              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-slate-800">Workplace type</span>
                <select value={jobForm.workplaceType} onChange={(event) => setJobForm((current) => ({ ...current, workplaceType: event.target.value }))} className="h-12 w-full rounded-xl border border-[var(--color-border)] bg-white px-4 text-sm outline-none focus:border-[var(--color-brand-strong)] focus:ring-4 focus:ring-[rgba(165,235,46,0.18)]">
                  {WORKPLACE_TYPES.map((item) => <option key={item} value={item}>{item}</option>)}
                </select>
              </label>
              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-slate-800">Experience level</span>
                <select value={jobForm.experienceLevel} onChange={(event) => setJobForm((current) => ({ ...current, experienceLevel: event.target.value }))} className="h-12 w-full rounded-xl border border-[var(--color-border)] bg-white px-4 text-sm outline-none focus:border-[var(--color-brand-strong)] focus:ring-4 focus:ring-[rgba(165,235,46,0.18)]">
                  {EXPERIENCE_LEVELS.map((item) => <option key={item} value={item}>{item}</option>)}
                </select>
              </label>
              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-slate-800">Location</span>
                <input value={jobForm.location} onChange={(event) => setJobForm((current) => ({ ...current, location: event.target.value }))} placeholder="Colombo, Sri Lanka" className="h-12 w-full rounded-xl border border-[var(--color-border)] bg-white px-4 text-sm outline-none focus:border-[var(--color-brand-strong)] focus:ring-4 focus:ring-[rgba(165,235,46,0.18)]" />
              </label>
              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-slate-800">Salary range</span>
                <div className="grid grid-cols-[110px_minmax(0,1fr)] gap-2">
                  <select
                    value={jobForm.salaryCurrency}
                    onChange={(event) => setJobForm((current) => ({ ...current, salaryCurrency: event.target.value }))}
                    className="h-12 w-full rounded-xl border border-[var(--color-border)] bg-white px-4 text-sm outline-none focus:border-[var(--color-brand-strong)] focus:ring-4 focus:ring-[rgba(165,235,46,0.18)]"
                  >
                    {SALARY_CURRENCIES.map((item) => <option key={item} value={item}>{item}</option>)}
                  </select>
                  <input value={jobForm.salaryRange} onChange={(event) => setJobForm((current) => ({ ...current, salaryRange: event.target.value }))} placeholder="250,000 - 350,000 / month" className="h-12 w-full rounded-xl border border-[var(--color-border)] bg-white px-4 text-sm outline-none focus:border-[var(--color-brand-strong)] focus:ring-4 focus:ring-[rgba(165,235,46,0.18)]" />
                </div>
              </label>
              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-slate-800">Open positions</span>
                <input type="number" min={1} value={jobForm.vacancies} onChange={(event) => setJobForm((current) => ({ ...current, vacancies: event.target.value }))} className="h-12 w-full rounded-xl border border-[var(--color-border)] bg-white px-4 text-sm outline-none focus:border-[var(--color-brand-strong)] focus:ring-4 focus:ring-[rgba(165,235,46,0.18)]" />
              </label>
              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-slate-800">Retry attempts after rejection</span>
                <input
                  type="number"
                  min={0}
                  value={jobForm.maxRetryAttempts}
                  onChange={(event) => setJobForm((current) => ({ ...current, maxRetryAttempts: event.target.value }))}
                  className="h-12 w-full rounded-xl border border-[var(--color-border)] bg-white px-4 text-sm outline-none focus:border-[var(--color-brand-strong)] focus:ring-4 focus:ring-[rgba(165,235,46,0.18)]"
                />
                <p className="mt-2 text-xs leading-5 text-slate-500">
                  Default is 0. If this job is rejected once, the candidate cannot apply again unless you allow retries here.
                </p>
              </label>
              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-slate-800">Closing date</span>
                <input type="date" value={jobForm.closingDate} onChange={(event) => setJobForm((current) => ({ ...current, closingDate: event.target.value }))} className="h-12 w-full rounded-xl border border-[var(--color-border)] bg-white px-4 text-sm outline-none focus:border-[var(--color-brand-strong)] focus:ring-4 focus:ring-[rgba(165,235,46,0.18)]" />
              </label>
            </div>

            <div className="space-y-5">
              <label className="flex items-center gap-3 rounded-2xl border border-[var(--color-border)] bg-[var(--color-panel-strong)] px-4 py-3 text-sm text-[var(--color-ink)]">
                <input
                  type="checkbox"
                  checked={jobForm.atsEnabled}
                  onChange={(event) => setJobForm((current) => ({
                    ...current,
                    atsEnabled: event.target.checked,
                    atsRequiredKeywords: event.target.checked ? current.atsRequiredKeywords : "",
                    atsPreferredKeywords: event.target.checked ? current.atsPreferredKeywords : "",
                    atsMinimumYearsExperience: event.target.checked ? current.atsMinimumYearsExperience : "0",
                    atsRequiredEducation: event.target.checked ? current.atsRequiredEducation : "",
                    atsRequiredCertifications: event.target.checked ? current.atsRequiredCertifications : "",
                  }))}
                />
                Enable ATS analysis for this job
              </label>
              {jobForm.atsEnabled ? (
                <>
                  <label className="block">
                    <span className="mb-2 block text-sm font-semibold text-slate-800">Required ATS keywords</span>
                    <textarea
                      value={jobForm.atsRequiredKeywords}
                      onChange={(event) => setJobForm((current) => ({ ...current, atsRequiredKeywords: event.target.value }))}
                      rows={4}
                      placeholder={"One keyword or phrase per line.\nExample:\nReact\nTypeScript\nNext.js"}
                      className="w-full rounded-xl border border-[var(--color-border)] bg-white px-4 py-3 text-sm outline-none focus:border-[var(--color-brand-strong)] focus:ring-4 focus:ring-[rgba(165,235,46,0.18)]"
                    />
                    <p className="mt-2 text-xs leading-5 text-slate-500">
                      Required keywords carry most of the ATS score weight.
                    </p>
                  </label>
                  <label className="block">
                    <span className="mb-2 block text-sm font-semibold text-slate-800">Preferred ATS keywords</span>
                    <textarea
                      value={jobForm.atsPreferredKeywords}
                      onChange={(event) => setJobForm((current) => ({ ...current, atsPreferredKeywords: event.target.value }))}
                      rows={4}
                      placeholder={"Optional bonus keywords.\nExample:\nAzure\nCI/CD\nFigma"}
                      className="w-full rounded-xl border border-[var(--color-border)] bg-white px-4 py-3 text-sm outline-none focus:border-[var(--color-brand-strong)] focus:ring-4 focus:ring-[rgba(165,235,46,0.18)]"
                    />
                  </label>
                  <div className="grid gap-4 md:grid-cols-3">
                    <label className="block">
                      <span className="mb-2 block text-sm font-semibold text-slate-800">Minimum years</span>
                      <input
                        type="number"
                        min={0}
                        value={jobForm.atsMinimumYearsExperience}
                        onChange={(event) => setJobForm((current) => ({ ...current, atsMinimumYearsExperience: event.target.value }))}
                        className="h-12 w-full rounded-xl border border-[var(--color-border)] bg-white px-4 text-sm outline-none focus:border-[var(--color-brand-strong)] focus:ring-4 focus:ring-[rgba(165,235,46,0.18)]"
                      />
                    </label>
                    <label className="block md:col-span-2">
                      <span className="mb-2 block text-sm font-semibold text-slate-800">Required education</span>
                      <textarea
                        value={jobForm.atsRequiredEducation}
                        onChange={(event) => setJobForm((current) => ({ ...current, atsRequiredEducation: event.target.value }))}
                        rows={3}
                        placeholder={"One required education signal per line.\nExample:\nBSc Computer Science\nSoftware Engineering degree"}
                        className="w-full rounded-xl border border-[var(--color-border)] bg-white px-4 py-3 text-sm outline-none focus:border-[var(--color-brand-strong)] focus:ring-4 focus:ring-[rgba(165,235,46,0.18)]"
                      />
                    </label>
                  </div>
                  <label className="block">
                    <span className="mb-2 block text-sm font-semibold text-slate-800">Required certifications</span>
                    <textarea
                      value={jobForm.atsRequiredCertifications}
                      onChange={(event) => setJobForm((current) => ({ ...current, atsRequiredCertifications: event.target.value }))}
                      rows={3}
                      placeholder={"One required certification per line.\nExample:\nAWS Cloud Practitioner\nScrum Master"}
                      className="w-full rounded-xl border border-[var(--color-border)] bg-white px-4 py-3 text-sm outline-none focus:border-[var(--color-brand-strong)] focus:ring-4 focus:ring-[rgba(165,235,46,0.18)]"
                    />
                    <p className="mt-2 text-xs leading-5 text-slate-500">
                      These requirements are stored separately so admins can review missing hard signals clearly.
                    </p>
                  </label>
                </>
              ) : (
                <p className="text-sm text-slate-500">
                  ATS scoring is off for this job. Applications will be saved without ATS analysis.
                </p>
              )}
            </div>

              <section className="rounded-[28px] border border-[var(--color-border)] bg-[var(--color-panel-strong)] p-5">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900">Rich description</h3>
                  <p className="text-sm text-slate-600">Add formatted sections, bullet points, and uploaded images.</p>
                </div>
                  <div className="inline-flex items-center rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-[var(--color-muted)]">
                  <Sparkles className="mr-1.5 h-4 w-4 text-[var(--color-brand)]" />
                  {isUploadingImage ? "Uploading image..." : "Rich editor ready"}
                </div>
              </div>
              <JobDescriptionEditor
                value={jobForm.descriptionHtml}
                onChange={(value) => setJobForm((current) => ({ ...current, descriptionHtml: value }))}
                onUploadImage={handleImageUpload}
                disabled={isUploadingImage}
              />
            </section>

            <div className="grid gap-5 md:grid-cols-2">
              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-slate-800">Requirements</span>
                <textarea value={jobForm.requirements} onChange={(event) => setJobForm((current) => ({ ...current, requirements: event.target.value }))} rows={6} placeholder={"List must-have qualifications, tools, and experience.\nExample:\n- 3+ years of React experience\n- Strong TypeScript fundamentals"} className="w-full rounded-xl border border-[var(--color-border)] bg-white px-4 py-3 text-sm outline-none focus:border-[var(--color-brand-strong)] focus:ring-4 focus:ring-[rgba(165,235,46,0.18)]" />
              </label>
              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-slate-800">Benefits and perks</span>
                <textarea value={jobForm.benefits} onChange={(event) => setJobForm((current) => ({ ...current, benefits: event.target.value }))} rows={6} placeholder={"Capture what candidates get.\nExample:\n- Health insurance\n- Flexible hybrid schedule"} className="w-full rounded-xl border border-[var(--color-border)] bg-white px-4 py-3 text-sm outline-none focus:border-[var(--color-brand-strong)] focus:ring-4 focus:ring-[rgba(165,235,46,0.18)]" />
              </label>
            </div>

            <label className="flex items-center gap-3 rounded-2xl border border-[var(--color-border)] bg-[var(--color-panel-strong)] px-4 py-3 text-sm text-[var(--color-ink)]">
              <input type="checkbox" checked={jobForm.isPublished} onChange={(event) => setJobForm((current) => ({ ...current, isPublished: event.target.checked }))} />
              Publish this job immediately after saving
            </label>

            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap gap-2 text-sm text-slate-600">
                <span className="inline-flex items-center rounded-full bg-[var(--color-panel-strong)] px-3 py-1.5 font-medium text-[var(--color-brand-strong)]">
                  <BriefcaseBusiness className="mr-1.5 h-4 w-4" />
                  Structured job schema
                </span>
                <span className="inline-flex items-center rounded-full bg-[#edf4ff] px-3 py-1.5 font-medium text-[#0c5db3]">
                  <MapPin className="mr-1.5 h-4 w-4" />
                  Candidate-friendly job details
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {previewHref && (
                  <button
                    type="button"
                    onClick={handlePreview}
                    disabled={isSaving || isPreviewNavigating}
                    className="rounded-xl border border-[var(--color-border)] px-5 py-3 text-sm font-medium text-[var(--color-ink)]"
                  >
                    Preview Job
                  </button>
                )}
                <Link
                  href={cancelHref}
                  className="rounded-xl border border-[var(--color-border)] px-5 py-3 text-sm font-medium text-[var(--color-ink)]"
                >
                  Cancel
                </Link>
                <button type="submit" disabled={isSaving} className="theme-btn-primary h-12 rounded-xl px-5 text-sm font-medium disabled:opacity-70">
                  {isSaving ? "Saving..." : mode === "edit" ? "Update Job" : "Create Job"}
                </button>
              </div>
            </div>
          </form>
        </section>
      {isPreviewNavigating && (
        <LoadingOverlay
          title="Opening preview"
          message="Saving current changes..."
        />
      )}
    </PortalShell>
  );
}
