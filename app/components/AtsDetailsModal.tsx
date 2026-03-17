"use client";

import { useEffect } from "react";
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

const DetailChips = ({ items }: { items: string[] }) => {
  return (
    <div className="flex flex-wrap gap-2">
      {items.map((item) => (
        <span
          key={item}
          className="rounded-full border border-[var(--color-border)] bg-white px-3 py-1.5 text-xs font-medium text-slate-700"
        >
          {item}
        </span>
      ))}
    </div>
  );
};

const DetailSection = ({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) => {
  return (
    <section className="space-y-3 rounded-2xl border border-[var(--color-border)] bg-white p-4">
      <h4 className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{title}</h4>
      {children}
    </section>
  );
};

export function AtsDetailsModal({
  submission,
  isOpen,
  onClose,
}: AtsDetailsModalProps) {
  useEffect(() => {
    if (!isOpen || !submission) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen, submission]);

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
    <div className="fixed inset-0 z-50 overflow-hidden bg-[var(--color-dialog-overlay)] px-3 py-4 sm:px-4 sm:py-6">
      <div
        role="dialog"
        aria-modal="true"
        className="mx-auto flex h-full max-h-[calc(100vh-2rem)] w-full max-w-4xl flex-col rounded-[28px] border border-[var(--color-border-strong)] bg-[var(--color-panel)] shadow-[var(--shadow-soft)] sm:max-h-[calc(100vh-3rem)]"
      >
        <div className="flex items-start justify-between gap-4 border-b border-[var(--color-border)] px-5 py-5 sm:px-6">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--color-brand-strong)]">
              ATS Details
            </p>
            <h3 className="mt-2 text-xl font-semibold text-[var(--color-ink)] sm:text-2xl">{title}</h3>
            <p className="mt-2 text-sm text-[var(--color-muted)]">
              {[submission.firstName, submission.lastName].filter(Boolean).join(" ") || submission.email}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="theme-action-button theme-action-button-secondary shrink-0 rounded-2xl px-4 py-2"
          >
            Close
          </button>
        </div>

        <div className="max-h-[calc(100vh-9rem)] overflow-y-auto px-5 py-5 sm:px-6">
          <div className="flex flex-wrap gap-2">
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

          <div className="mt-5 space-y-4 text-sm text-slate-700">
          {hasDetails ? (
            <div className="space-y-4">
              <DetailSection title="Summary">
                <p className="font-medium leading-7 text-slate-900">
                {submission.atsStatus === "queued"
                  ? "ATS analysis is queued and will run in the background."
                  : submission.atsStatus === "processing"
                    ? "ATS analysis is currently processing in the background."
                    : submission.atsSummary || "ATS details unavailable."}
                </p>
                {submission.atsCandidateSummary ? (
                  <p className="leading-7 text-slate-600">{submission.atsCandidateSummary}</p>
                ) : null}
                {submission.atsConfidenceNotes ? (
                  <p className="leading-7 text-slate-600">{submission.atsConfidenceNotes}</p>
                ) : null}
              </DetailSection>

              {(submission.atsExperienceRequirementMet !== null || submission.atsEducationRequirementMet !== null || submission.atsCertificationRequirementMet !== null) ? (
                <div className="grid gap-3 md:grid-cols-3">
                  {submission.atsExperienceRequirementMet !== null ? (
                    <div className="rounded-2xl border border-[var(--color-border)] bg-white px-4 py-3">
                      <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Experience requirement</p>
                      <p className="mt-1 font-medium text-slate-900">
                        {submission.atsExperienceRequirementMet ? "Met" : "Not met"}
                      </p>
                    </div>
                  ) : null}
                  {submission.atsEducationRequirementMet !== null ? (
                    <div className="rounded-2xl border border-[var(--color-border)] bg-white px-4 py-3">
                      <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Education requirement</p>
                      <p className="mt-1 font-medium text-slate-900">
                        {submission.atsEducationRequirementMet ? "Met" : "Not met"}
                      </p>
                    </div>
                  ) : null}
                  {submission.atsCertificationRequirementMet !== null ? (
                    <div className="rounded-2xl border border-[var(--color-border)] bg-white px-4 py-3">
                      <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Certification requirement</p>
                      <p className="mt-1 font-medium text-slate-900">
                        {submission.atsCertificationRequirementMet ? "Met" : "Not met"}
                      </p>
                    </div>
                  ) : null}
                </div>
              ) : null}

              {(submission.atsNormalizedSkills.length > 0
                || submission.atsRelevantRoles.length > 0
                || submission.atsEducation.length > 0
                || submission.atsCertifications.length > 0
                || submission.atsDomains.length > 0
                || submission.atsSeniority) ? (
                <div className="grid gap-4 lg:grid-cols-2">
                  {submission.atsNormalizedSkills.length > 0 ? (
                    <DetailSection title="Skills">
                      <DetailChips items={submission.atsNormalizedSkills} />
                    </DetailSection>
                  ) : null}
                  {submission.atsRelevantRoles.length > 0 ? (
                    <DetailSection title="Relevant Roles">
                      <DetailChips items={submission.atsRelevantRoles} />
                    </DetailSection>
                  ) : null}
                  {submission.atsEducation.length > 0 ? (
                    <DetailSection title="Education">
                      <DetailChips items={submission.atsEducation} />
                    </DetailSection>
                  ) : null}
                  {submission.atsCertifications.length > 0 ? (
                    <DetailSection title="Certifications">
                      <DetailChips items={submission.atsCertifications} />
                    </DetailSection>
                  ) : null}
                  {submission.atsDomains.length > 0 ? (
                    <DetailSection title="Domains">
                      <DetailChips items={submission.atsDomains} />
                    </DetailSection>
                  ) : null}
                  {submission.atsSeniority ? (
                    <DetailSection title="Seniority">
                      <p className="font-medium text-slate-900">{submission.atsSeniority}</p>
                    </DetailSection>
                  ) : null}
                </div>
              ) : null}

              {(submission.atsRequiredMatched.length > 0
                || submission.atsRequiredMissing.length > 0
                || submission.atsPreferredMatched.length > 0
                || submission.atsPreferredMissing.length > 0) ? (
                <div className="grid gap-4 lg:grid-cols-2">
                  {submission.atsRequiredMatched.length > 0 ? (
                    <DetailSection title="Matched Required">
                      <DetailChips items={submission.atsRequiredMatched} />
                    </DetailSection>
                  ) : null}
                  {submission.atsRequiredMissing.length > 0 ? (
                    <DetailSection title="Missing Required">
                      <DetailChips items={submission.atsRequiredMissing} />
                    </DetailSection>
                  ) : null}
                  {submission.atsPreferredMatched.length > 0 ? (
                    <DetailSection title="Matched Preferred">
                      <DetailChips items={submission.atsPreferredMatched} />
                    </DetailSection>
                  ) : null}
                  {submission.atsPreferredMissing.length > 0 ? (
                    <DetailSection title="Missing Preferred">
                      <DetailChips items={submission.atsPreferredMissing} />
                    </DetailSection>
                  ) : null}
                </div>
              ) : null}

              {submission.atsEvaluatedAt ? (
                <p className="text-xs text-slate-500">
                  Evaluated on {new Date(submission.atsEvaluatedAt).toLocaleString()}
                </p>
              ) : null}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-[var(--color-border)] bg-white p-6 text-slate-500">
              No ATS result is available for this application.
            </div>
          )}
          </div>
        </div>
      </div>
    </div>
  );
}
