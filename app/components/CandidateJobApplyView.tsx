"use client";

import { FileUp } from "lucide-react";
import { ChangeEvent, FormEvent, useRef, useState } from "react";
import type { CandidateProfile } from "../../lib/candidate-profile";
import { candidateProfileSchema } from "../../lib/candidate-profile-validation";
import type { CvSubmissionRecord } from "../../lib/cv-storage";
import type { JobRecord } from "../../lib/jobs";
import { CandidateCvPreviewModal } from "./CandidateCvPreviewModal";
import { ConfirmDialog } from "./ConfirmDialog";
import { JobDetailContent } from "./JobDetailContent";
import { LoadingOverlay } from "./LoadingOverlay";
import { useToast } from "./ToastProvider";

type CandidateJobApplyViewProps = {
  sessionEmail: string;
  initialProfile: CandidateProfile;
  job: JobRecord;
  existingSubmission: CvSubmissionRecord | null;
  rejectedAttempts: CvSubmissionRecord[];
};

type ProfileValues = {
  firstName: string;
  lastName: string;
  phone: string;
  idOrPassportNumber: string;
};

const toProfileValues = (profile: CandidateProfile): ProfileValues => ({
  firstName: profile.firstName,
  lastName: profile.lastName,
  phone: profile.phone,
  idOrPassportNumber: profile.idOrPassportNumber,
});

const isProfileComplete = (values: ProfileValues) => {
  return Boolean(
    values.firstName.trim()
      && values.lastName.trim()
      && values.phone.trim()
      && values.idOrPassportNumber.trim(),
  );
};

export function CandidateJobApplyView({
  sessionEmail,
  initialProfile,
  job,
  existingSubmission,
  rejectedAttempts,
}: CandidateJobApplyViewProps) {
  const savedProfileValues = toProfileValues(initialProfile);
  const [profileValues, setProfileValues] = useState<ProfileValues>(toProfileValues(initialProfile));
  const [resume, setResume] = useState<File | null>(null);
  const [submission, setSubmission] = useState<CvSubmissionRecord | null>(existingSubmission);
  const [isCvPreviewOpen, setIsCvPreviewOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isWithdrawing, setIsWithdrawing] = useState(false);
  const [isWithdrawConfirmOpen, setIsWithdrawConfirmOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [hasAttemptedProfileSave, setHasAttemptedProfileSave] = useState(false);
  const [profileTouchedFields, setProfileTouchedFields] = useState<Record<string, boolean>>({});
  const [profileServerFieldErrors, setProfileServerFieldErrors] = useState<Record<string, string[]>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { showToast } = useToast();
  const profileDraftValidation = candidateProfileSchema.safeParse(profileValues);
  const profileClientFieldErrors = profileDraftValidation.success
    ? {}
    : profileDraftValidation.error.flatten().fieldErrors;

  const updateProfileValue = (field: keyof ProfileValues, value: string) => {
    setProfileTouchedFields((current) => ({ ...current, [field]: true }));
    setProfileServerFieldErrors((current) => ({ ...current, [field]: [] }));
    setProfileValues((current) => ({ ...current, [field]: value }));
  };

  const getProfileFieldError = (field: keyof ProfileValues) => {
    const serverMessage = profileServerFieldErrors[field]?.[0];

    if (serverMessage) {
      return serverMessage;
    }

    if (!hasAttemptedProfileSave && !profileTouchedFields[field]) {
      return "";
    }

    return profileClientFieldErrors[field]?.[0] ?? "";
  };

  const updateResume = (file: File | null) => {
    setResume(file);
  };

  const handleFileSelection = (event: ChangeEvent<HTMLInputElement>) => {
    updateResume(event.target.files?.[0] ?? null);
  };

  const submitApplication = async (profile: ProfileValues) => {
    const formData = new FormData();
    formData.append("firstName", profile.firstName.trim());
    formData.append("lastName", profile.lastName.trim());
    formData.append("email", sessionEmail);
    formData.append("phone", profile.phone.trim());
    formData.append("idOrPassportNumber", profile.idOrPassportNumber.trim());
    formData.append("jobId", job.id);
    formData.append("resume", resume as File);

    const response = await fetch("/api/cv", {
      method: "POST",
      body: formData,
    });

    const payload = await response
      .json()
      .catch(() => ({ message: "Failed to submit application." }));

    if (!response.ok) {
      showToast(payload.message || "Failed to submit application.", "error");
      return false;
    }

    setResume(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    setSubmission(payload.item ?? null);
    showToast(payload.message || "Application submitted successfully.");
    return true;
  };

  const handleCancelProfileModal = () => {
    setProfileValues(savedProfileValues);
    setHasAttemptedProfileSave(false);
    setProfileTouchedFields({});
    setProfileServerFieldErrors({});
    setIsProfileModalOpen(false);
  };

  const handleContinueWithProfile = async () => {
    setHasAttemptedProfileSave(true);

    if (!profileDraftValidation.success) {
      showToast(profileDraftValidation.error.issues[0]?.message || "Profile details are invalid.", "warning");
      return;
    }

    if (!resume) {
      showToast("CV is required. Please upload your resume as a PDF.", "warning");
      return;
    }

    setIsSubmitting(true);

    try {
      const nextProfileValues = {
        firstName: profileDraftValidation.data.firstName,
        lastName: profileDraftValidation.data.lastName,
        phone: profileDraftValidation.data.phone,
        idOrPassportNumber: profileDraftValidation.data.idOrPassportNumber,
      };

      setProfileValues(nextProfileValues);
      setHasAttemptedProfileSave(false);
      setProfileTouchedFields({});
      setProfileServerFieldErrors({});
      setIsProfileModalOpen(false);

      await submitApplication(nextProfileValues);
    } catch {
      showToast("Something went wrong while submitting. Please try again.", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!isProfileComplete(savedProfileValues)) {
      showToast("Basic details are required before you can apply.", "warning");
      setProfileValues(savedProfileValues);
      setIsProfileModalOpen(true);
      return;
    }

    if (submission) {
      showToast("You have already applied for this job. Withdraw the current application to apply again.", "warning");
      return;
    }

    if (hasReachedRejectedAttemptLimit) {
      showToast(attemptLimitMessage, "warning");
      return;
    }

    if (!resume) {
      showToast("CV is required. Please upload your resume as a PDF.", "warning");
      return;
    }

    setIsSubmitting(true);

    try {
      await submitApplication(savedProfileValues);
    } catch {
      showToast("Something went wrong while submitting. Please try again.", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleWithdraw = async () => {
    if (!submission) {
      return;
    }

    setIsWithdrawing(true);

    try {
      const response = await fetch(`/api/cv/${submission.id}`, {
        method: "DELETE",
      });
      const payload = await response
        .json()
        .catch(() => ({ message: "Failed to withdraw application." }));

      if (!response.ok) {
        showToast(payload.message || "Failed to withdraw application.", "error");
        return;
      }

      setSubmission(null);
      setResume(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      showToast(payload.message || "Application withdrawn successfully.");
    } catch {
      showToast("Something went wrong while withdrawing the application.", "error");
    } finally {
      setIsWithdrawing(false);
    }
  };

  const savedProfileComplete = isProfileComplete(savedProfileValues);
  const isProfileDraftComplete = profileDraftValidation.success;
  const hasProfileDraftChanges = (
    profileValues.firstName !== savedProfileValues.firstName
    || profileValues.lastName !== savedProfileValues.lastName
    || profileValues.phone !== savedProfileValues.phone
    || profileValues.idOrPassportNumber !== savedProfileValues.idOrPassportNumber
  );
  const firstNameError = getProfileFieldError("firstName");
  const lastNameError = getProfileFieldError("lastName");
  const phoneError = getProfileFieldError("phone");
  const idOrPassportNumberError = getProfileFieldError("idOrPassportNumber");
  const maxRejectedAttempts = (job.maxRetryAttempts ?? 0) + 1;
  const hasReachedRejectedAttemptLimit = rejectedAttempts.length >= maxRejectedAttempts;
  const attemptLimitMessage = maxRejectedAttempts <= 1
    ? "This job does not allow reapplying after a rejection."
    : `You have reached the maximum of ${maxRejectedAttempts} rejected attempts for this job.`;

  return (
    <>
      {isSubmitting && (
        <LoadingOverlay
          title={submission ? "Updating application" : "Submitting application"}
          message="Uploading your CV and saving your application."
        />
      )}
      <div className="grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
      <section className="rounded-[28px] border border-[var(--color-border-strong)] bg-[var(--color-panel)] p-6 shadow-[var(--shadow-soft)]">
        <JobDetailContent job={job} />
      </section>

      <form
        onSubmit={handleSubmit}
        className="h-fit rounded-[28px] border border-[var(--color-border-strong)] bg-[var(--color-panel)] p-6 shadow-[var(--shadow-soft)]"
      >
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--color-brand-strong)]">
          Apply For This Job
        </p>
        <h3 className="mt-2 text-2xl font-semibold text-[var(--color-ink)]">
          Submit your application
        </h3>
        <p className="mt-2 text-sm leading-6 text-[var(--color-muted)]">
          If your account details are already available, you can apply directly. Otherwise, we will ask for the missing basics before submission.
        </p>

        {submission && (
          <div className="mt-5 rounded-[24px] border border-emerald-200 bg-emerald-50 p-5">
            <p className="text-sm font-semibold text-emerald-900">Application already submitted</p>
            <p className="mt-2 text-sm leading-6 text-emerald-800">
              You already applied for this job on {new Date(submission.submittedAt).toLocaleString()}.
              Withdraw this application if you want to apply again with an updated CV.
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <a
                href="#"
                onClick={(event) => {
                  event.preventDefault();
                  setIsCvPreviewOpen(true);
                }}
                className="rounded-2xl border border-emerald-300 px-4 py-2 text-sm font-medium text-emerald-900"
              >
                View CV
              </a>
              <button
                type="button"
                onClick={() => setIsWithdrawConfirmOpen(true)}
                disabled={isWithdrawing}
                className="rounded-2xl border border-rose-300 px-4 py-2 text-sm font-medium text-rose-700 disabled:opacity-70"
              >
                {isWithdrawing ? "Withdrawing..." : "Withdraw Application"}
              </button>
            </div>
          </div>
        )}

        {!submission && rejectedAttempts.length > 0 && (
          <div className="mt-5 rounded-[24px] border border-rose-200 bg-rose-50 p-5">
            <p className="text-sm font-semibold text-rose-900">Previous rejected attempts</p>
            <p className="mt-2 text-sm leading-6 text-rose-800">
              {hasReachedRejectedAttemptLimit
                ? `${attemptLimitMessage} New applications are no longer allowed.`
                : "You can apply again for this job. Your previous rejected submissions are shown below for reference."}
            </p>
            <div className="mt-4 space-y-3">
              {rejectedAttempts.map((attempt) => (
                <div key={attempt.id} className="rounded-2xl border border-rose-200 bg-white px-4 py-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-rose-100 px-2.5 py-1 text-xs font-semibold text-rose-800">
                      Rejected
                    </span>
                    {attempt.reviewedAt ? (
                      <span className="text-xs text-[var(--color-muted)]">
                        Reviewed on {new Date(attempt.reviewedAt).toLocaleString()}
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-2 text-sm text-[var(--color-muted)]">
                    Submitted on {new Date(attempt.submittedAt).toLocaleString()}
                  </p>
                  <p className="mt-1 text-sm text-[var(--color-muted)]">{attempt.resumeOriginalName}</p>
                  {attempt.rejectionReason ? (
                    <p className="mt-2 text-sm text-rose-800">
                      <span className="font-medium">Reason:</span> {attempt.rejectionReason}
                    </p>
                  ) : null}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="mt-6 rounded-[24px] border border-[var(--color-border)] bg-white p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-[var(--color-ink)]">Application details</p>
              <p className="mt-1 text-sm text-[var(--color-muted)]">
                {savedProfileComplete
                  ? "Your saved account details will be attached automatically."
                  : "Your basic details are missing. We will collect them in a quick confirmation modal before applying."}
              </p>
            </div>
            <div className="rounded-full border border-[var(--color-border)] bg-[var(--color-panel)] px-3 py-1 text-xs font-semibold text-[var(--color-ink)]">
              {savedProfileComplete ? "Profile Ready" : "Details Needed"}
            </div>
          </div>
          <div className="mt-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-panel)] px-4 py-3">
            <p className="text-xs uppercase tracking-[0.18em] text-[var(--color-muted)]">Email</p>
            <p className="mt-1 text-sm font-medium text-[var(--color-ink)]">{sessionEmail}</p>
          </div>
        </div>

        <div className="mt-5 rounded-[24px] border border-[var(--color-border)] bg-white p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-[var(--color-ink)]">
                Resume / CV <span className="text-rose-600">*</span>
              </p>
              <p className="mt-1 text-sm text-[var(--color-muted)]">
                Upload your latest resume as a PDF. This step is required.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(event) => {
              event.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={(event) => {
              event.preventDefault();
              setIsDragging(false);
              updateResume(event.dataTransfer.files?.[0] ?? null);
            }}
            className={`mt-4 flex min-h-56 w-full flex-col items-center justify-center rounded-[24px] border border-dashed px-6 text-center transition ${
              isDragging
                ? "border-[var(--color-brand)] bg-[rgba(165,235,46,0.08)]"
                : "border-[var(--color-border)] bg-[var(--color-panel)]"
            }`}
          >
            <FileUp className="mb-4 h-10 w-10 text-[var(--color-sidebar-accent)]" strokeWidth={2} />
            <p className="text-base font-medium text-[var(--color-ink)]">
              {resume ? resume.name : "Click or drag your CV here"}
            </p>
            <p className="mt-2 text-sm text-[var(--color-muted)]">
              PDF only. This field is required before submission.
            </p>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,application/pdf"
            onChange={handleFileSelection}
            className="sr-only"
          />
        </div>

        <button
          type="submit"
          disabled={isSubmitting || Boolean(submission) || !resume || hasReachedRejectedAttemptLimit}
          className="theme-btn-primary mt-5 flex h-12 w-full items-center justify-center rounded-2xl text-sm font-medium disabled:opacity-70"
        >
          {submission
            ? "Already Applied"
            : hasReachedRejectedAttemptLimit
              ? "Reapply Not Available"
              : isSubmitting
                ? "Submitting..."
                : `Apply for ${job.code}`}
        </button>

        <p className="mt-4 text-xs leading-5 text-[var(--color-muted)]">
          By submitting, you agree to receive hiring updates related to this application.
        </p>
      </form>

      {isProfileModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(5,20,10,0.48)] px-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="candidate-profile-modal-title"
            className="w-full max-w-2xl rounded-[28px] border border-[var(--color-border-strong)] bg-[var(--color-panel)] p-6 shadow-[var(--shadow-soft)]"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--color-brand-strong)]">
                  Basic Details Required
                </p>
                <h3 id="candidate-profile-modal-title" className="mt-2 text-2xl font-semibold text-[var(--color-ink)]">
                  Confirm your profile before applying
                </h3>
                <p className="mt-2 text-sm leading-6 text-[var(--color-muted)]">
                  We only need your basic details once. After this, future applications can be submitted directly.
                </p>
              </div>
            </div>

            <div className="mt-5 rounded-2xl border border-[var(--color-border)] bg-white px-4 py-3">
              <p className="text-xs uppercase tracking-[0.18em] text-[var(--color-muted)]">Email</p>
              <p className="mt-1 text-sm font-medium text-[var(--color-ink)]">{sessionEmail}</p>
            </div>

            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <label className="space-y-2">
                <span className="text-sm font-semibold text-[var(--color-ink)]">
                  First Name <span className="text-rose-600">*</span>
                </span>
                <input
                  required
                  value={profileValues.firstName}
                  onChange={(event) => updateProfileValue("firstName", event.target.value)}
                  className={`h-12 w-full rounded-2xl border bg-white px-4 text-sm text-[var(--color-ink)] outline-none focus:ring-4 ${
                    firstNameError
                      ? "border-rose-300 focus:border-rose-500 focus:ring-[rgba(244,63,94,0.14)]"
                      : "border-[var(--color-border)] focus:border-[var(--color-brand)] focus:ring-[rgba(165,235,46,0.16)]"
                  }`}
                />
                {firstNameError && <p className="text-xs font-medium text-rose-700">{firstNameError}</p>}
              </label>
              <label className="space-y-2">
                <span className="text-sm font-semibold text-[var(--color-ink)]">
                  Last Name <span className="text-rose-600">*</span>
                </span>
                <input
                  required
                  value={profileValues.lastName}
                  onChange={(event) => updateProfileValue("lastName", event.target.value)}
                  className={`h-12 w-full rounded-2xl border bg-white px-4 text-sm text-[var(--color-ink)] outline-none focus:ring-4 ${
                    lastNameError
                      ? "border-rose-300 focus:border-rose-500 focus:ring-[rgba(244,63,94,0.14)]"
                      : "border-[var(--color-border)] focus:border-[var(--color-brand)] focus:ring-[rgba(165,235,46,0.16)]"
                  }`}
                />
                {lastNameError && <p className="text-xs font-medium text-rose-700">{lastNameError}</p>}
              </label>
              <label className="space-y-2">
                <span className="text-sm font-semibold text-[var(--color-ink)]">
                  Phone <span className="text-rose-600">*</span>
                </span>
                <input
                  required
                  value={profileValues.phone}
                  onChange={(event) => updateProfileValue("phone", event.target.value)}
                  placeholder="0771234567 or +94771234567"
                  className={`h-12 w-full rounded-2xl border bg-white px-4 text-sm text-[var(--color-ink)] outline-none focus:ring-4 ${
                    phoneError
                      ? "border-rose-300 focus:border-rose-500 focus:ring-[rgba(244,63,94,0.14)]"
                      : "border-[var(--color-border)] focus:border-[var(--color-brand)] focus:ring-[rgba(165,235,46,0.16)]"
                  }`}
                />
                {phoneError && <p className="text-xs font-medium text-rose-700">{phoneError}</p>}
              </label>
              <label className="space-y-2">
                <span className="text-sm font-semibold text-[var(--color-ink)]">
                  ID or Passport Number <span className="text-rose-600">*</span>
                </span>
                <input
                  required
                  value={profileValues.idOrPassportNumber}
                  onChange={(event) => updateProfileValue("idOrPassportNumber", event.target.value)}
                  placeholder="NIC or passport number"
                  className={`h-12 w-full rounded-2xl border bg-white px-4 text-sm text-[var(--color-ink)] outline-none focus:ring-4 ${
                    idOrPassportNumberError
                      ? "border-rose-300 focus:border-rose-500 focus:ring-[rgba(244,63,94,0.14)]"
                      : "border-[var(--color-border)] focus:border-[var(--color-brand)] focus:ring-[rgba(165,235,46,0.16)]"
                  }`}
                />
                {idOrPassportNumberError && <p className="text-xs font-medium text-rose-700">{idOrPassportNumberError}</p>}
              </label>
            </div>

            <div className="mt-4 rounded-[24px] border border-[var(--color-border)] bg-white p-4 text-sm leading-6 text-[var(--color-muted)]">
              Required details must be valid before you can continue. Use a Sri Lankan mobile number and a valid NIC or passport number.
            </div>

            <div className="mt-6 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={handleContinueWithProfile}
                disabled={isSubmitting || !isProfileDraftComplete || !hasProfileDraftChanges}
                className="theme-btn-primary rounded-2xl px-4 py-2 text-sm font-medium disabled:opacity-70"
              >
                {isSubmitting ? "Submitting..." : "Continue And Apply"}
              </button>
              <button
                type="button"
                onClick={handleCancelProfileModal}
                disabled={isSubmitting}
                className="rounded-2xl border border-[var(--color-border)] px-4 py-2 text-sm font-medium text-[var(--color-ink)] disabled:opacity-70"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
      <ConfirmDialog
        isOpen={isWithdrawConfirmOpen}
        title="Withdraw application?"
        message="This removes your current application for this job and lets you apply again with a different CV."
        confirmLabel="Withdraw"
        isLoading={isWithdrawing}
        onConfirm={async () => {
          await handleWithdraw();
          setIsWithdrawConfirmOpen(false);
        }}
        onCancel={() => setIsWithdrawConfirmOpen(false)}
      />
      <CandidateCvPreviewModal
        title={submission?.jobTitle || submission?.jobOpening || "CV Preview"}
        resumeName={submission?.resumeOriginalName || ""}
        cvUrl={submission ? `/api/cv/${submission.id}/resume?disposition=inline` : ""}
        downloadUrl={submission ? `/api/cv/${submission.id}/resume` : null}
        isOpen={Boolean(submission && isCvPreviewOpen)}
        onClose={() => setIsCvPreviewOpen(false)}
      />
      </div>
    </>
  );
}
