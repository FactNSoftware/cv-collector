"use client";

import type { CvSubmissionRecord } from "../../lib/cv-storage";

type AtsDetailsModalProps = {
  submission: CvSubmissionRecord | null;
  isOpen: boolean;
  onClose: () => void;
};

const getMethodLabel = (method: CvSubmissionRecord["atsMethod"]) => {
  if (method === "ai") {
    return "AI-assisted analysis";
  }

  if (method === "rules") {
    return "Rules-based analysis";
  }

  return "Not configured";
};

const getBandLabel = (band: CvSubmissionRecord["atsDecisionBand"]) => {
  switch (band) {
    case "best_match":
      return "Best match";
    case "strong_match":
      return "Strong match";
    case "qualified":
      return "Qualified";
    case "needs_review":
      return "Needs review";
    case "low_match":
      return "Low match";
    default:
      return "Not scored";
  }
};

const getStatusBadge = (submission: CvSubmissionRecord) => {
  if (submission.atsStatus === "queued") {
    return <span className="rounded-full bg-sky-100 px-3 py-1.5 text-sm font-semibold text-sky-800">ATS queued</span>;
  }

  if (submission.atsStatus === "processing") {
    return <span className="rounded-full bg-amber-100 px-3 py-1.5 text-sm font-semibold text-amber-800">ATS processing</span>;
  }

  if (submission.atsStatus === "failed") {
    return <span className="rounded-full bg-rose-100 px-3 py-1.5 text-sm font-semibold text-rose-800">ATS failed</span>;
  }

  if (submission.atsScore !== null) {
    return (
      <span className="rounded-full bg-[var(--color-panel-strong)] px-3 py-1.5 text-sm font-semibold text-[var(--color-brand-strong)]">
        ATS {submission.atsScore}%
      </span>
    );
  }

  return (
    <span className="rounded-full bg-slate-100 px-3 py-1.5 text-sm font-semibold text-slate-600">
      ATS unavailable
    </span>
  );
};

export function AtsDetailsModal({
  submission,
  isOpen,
  onClose,
}: AtsDetailsModalProps) {
  if (!isOpen || !submission) {
    return null;
  }

  const title = submission.jobTitle || submission.jobOpening || "ATS Details";
  const hasDetails = submission.atsScore !== null
    || Boolean(submission.atsSummary)
    || submission.atsMethod !== "none"
    || submission.atsStatus === "queued"
    || submission.atsStatus === "processing"
    || submission.atsStatus === "failed";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(5,20,10,0.48)] px-4 py-6">
      <div
        role="dialog"
        aria-modal="true"
        className="w-full max-w-3xl rounded-[28px] border border-[var(--color-border-strong)] bg-[var(--color-panel)] p-6 shadow-[var(--shadow-soft)]"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--color-brand-strong)]">
              ATS Details
            </p>
            <h3 className="mt-2 text-2xl font-semibold text-[var(--color-ink)]">{title}</h3>
            <p className="mt-2 text-sm text-[var(--color-muted)]">
              {[submission.firstName, submission.lastName].filter(Boolean).join(" ") || submission.email}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="theme-action-button theme-action-button-secondary rounded-2xl px-4 py-2"
          >
            Close
          </button>
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          {getStatusBadge(submission)}
          <span className="rounded-full bg-slate-100 px-3 py-1.5 text-sm font-medium text-slate-700">
            {getMethodLabel(submission.atsMethod)}
          </span>
          <span className="rounded-full bg-slate-100 px-3 py-1.5 text-sm font-medium text-slate-700">
            {getBandLabel(submission.atsDecisionBand)}
          </span>
          {submission.atsYearsOfExperience !== null ? (
            <span className="rounded-full bg-slate-100 px-3 py-1.5 text-sm font-medium text-slate-700">
              {submission.atsYearsOfExperience} years
            </span>
          ) : null}
          {submission.atsConfidenceScore !== null ? (
            <span className="rounded-full bg-slate-100 px-3 py-1.5 text-sm font-medium text-slate-700">
              Confidence {submission.atsConfidenceScore}%
            </span>
          ) : null}
        </div>

        <div className="mt-5 rounded-2xl bg-white p-5 text-sm text-slate-700">
          {hasDetails ? (
            <div className="space-y-3">
              <p className="font-medium text-slate-900">
                {submission.atsStatus === "queued"
                  ? "ATS analysis is queued and will run in the background."
                  : submission.atsStatus === "processing"
                    ? "ATS analysis is currently processing in the background."
                    : submission.atsSummary || "ATS details unavailable."}
              </p>
              {submission.atsCandidateSummary ? <p>{submission.atsCandidateSummary}</p> : null}
              {submission.atsConfidenceNotes ? <p>{submission.atsConfidenceNotes}</p> : null}
              {(submission.atsExperienceRequirementMet !== null || submission.atsEducationRequirementMet !== null || submission.atsCertificationRequirementMet !== null) ? (
                <div className="grid gap-2 sm:grid-cols-3">
                  {submission.atsExperienceRequirementMet !== null ? (
                    <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-panel)] px-3 py-2">
                      <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Experience requirement</p>
                      <p className="mt-1 font-medium text-slate-900">
                        {submission.atsExperienceRequirementMet ? "Met" : "Not met"}
                      </p>
                    </div>
                  ) : null}
                  {submission.atsEducationRequirementMet !== null ? (
                    <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-panel)] px-3 py-2">
                      <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Education requirement</p>
                      <p className="mt-1 font-medium text-slate-900">
                        {submission.atsEducationRequirementMet ? "Met" : "Not met"}
                      </p>
                    </div>
                  ) : null}
                  {submission.atsCertificationRequirementMet !== null ? (
                    <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-panel)] px-3 py-2">
                      <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Certification requirement</p>
                      <p className="mt-1 font-medium text-slate-900">
                        {submission.atsCertificationRequirementMet ? "Met" : "Not met"}
                      </p>
                    </div>
                  ) : null}
                </div>
              ) : null}
              {submission.atsNormalizedSkills.length > 0 ? (
                <p><span className="font-medium text-slate-900">Skills:</span> {submission.atsNormalizedSkills.join(", ")}</p>
              ) : null}
              {submission.atsRelevantRoles.length > 0 ? (
                <p><span className="font-medium text-slate-900">Relevant roles:</span> {submission.atsRelevantRoles.join(", ")}</p>
              ) : null}
              {submission.atsEducation.length > 0 ? (
                <p><span className="font-medium text-slate-900">Education:</span> {submission.atsEducation.join(", ")}</p>
              ) : null}
              {submission.atsCertifications.length > 0 ? (
                <p><span className="font-medium text-slate-900">Certifications:</span> {submission.atsCertifications.join(", ")}</p>
              ) : null}
              {submission.atsDomains.length > 0 ? (
                <p><span className="font-medium text-slate-900">Domains:</span> {submission.atsDomains.join(", ")}</p>
              ) : null}
              {submission.atsSeniority ? (
                <p><span className="font-medium text-slate-900">Seniority:</span> {submission.atsSeniority}</p>
              ) : null}
              {submission.atsRequiredMatched.length > 0 ? (
                <p><span className="font-medium text-slate-900">Matched required:</span> {submission.atsRequiredMatched.join(", ")}</p>
              ) : null}
              {submission.atsRequiredMissing.length > 0 ? (
                <p><span className="font-medium text-slate-900">Missing required:</span> {submission.atsRequiredMissing.join(", ")}</p>
              ) : null}
              {submission.atsPreferredMatched.length > 0 ? (
                <p><span className="font-medium text-slate-900">Matched preferred:</span> {submission.atsPreferredMatched.join(", ")}</p>
              ) : null}
              {submission.atsPreferredMissing.length > 0 ? (
                <p><span className="font-medium text-slate-900">Missing preferred:</span> {submission.atsPreferredMissing.join(", ")}</p>
              ) : null}
              {submission.atsEvaluatedAt ? (
                <p className="text-xs text-slate-500">
                  Evaluated on {new Date(submission.atsEvaluatedAt).toLocaleString()}
                </p>
              ) : null}
            </div>
          ) : (
            <p className="text-slate-500">No ATS result is available for this application.</p>
          )}
        </div>
      </div>
    </div>
  );
}
