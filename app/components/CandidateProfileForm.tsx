"use client";

import { FormEvent, useState } from "react";
import type { CandidateProfile } from "../../lib/candidate-profile";
import { candidateProfileSchema } from "../../lib/candidate-profile-validation";
import { LoadingOverlay } from "./LoadingOverlay";
import { useToast } from "./ToastProvider";

type CandidateProfileFormProps = {
  initialProfile: CandidateProfile;
};

export function CandidateProfileForm({
  initialProfile,
}: CandidateProfileFormProps) {
  const [values, setValues] = useState(initialProfile);
  const [isSaving, setIsSaving] = useState(false);
  const [hasAttemptedSubmit, setHasAttemptedSubmit] = useState(false);
  const [touchedFields, setTouchedFields] = useState<Record<string, boolean>>({});
  const [serverFieldErrors, setServerFieldErrors] = useState<Record<string, string[]>>({});
  const { showToast } = useToast();
  const validation = candidateProfileSchema.safeParse({
    firstName: values.firstName,
    lastName: values.lastName,
    phone: values.phone,
    idOrPassportNumber: values.idOrPassportNumber,
  });
  const clientFieldErrors = validation.success ? {} : validation.error.flatten().fieldErrors;
  const hasChanges = (
    values.firstName !== initialProfile.firstName
    || values.lastName !== initialProfile.lastName
    || values.phone !== initialProfile.phone
    || values.idOrPassportNumber !== initialProfile.idOrPassportNumber
  );

  const updateValue = (
    field: "firstName" | "lastName" | "phone" | "idOrPassportNumber",
    value: string,
  ) => {
    setTouchedFields((current) => ({ ...current, [field]: true }));
    setServerFieldErrors((current) => ({ ...current, [field]: [] }));
    setValues((current) => ({ ...current, [field]: value }));
  };

  const getFieldError = (field: "firstName" | "lastName" | "phone" | "idOrPassportNumber") => {
    const serverMessage = serverFieldErrors[field]?.[0];

    if (serverMessage) {
      return serverMessage;
    }

    if (!hasAttemptedSubmit && !touchedFields[field]) {
      return "";
    }

    return clientFieldErrors[field]?.[0] ?? "";
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setHasAttemptedSubmit(true);

    if (!validation.success) {
      showToast(validation.error.issues[0]?.message || "Profile details are invalid.", "warning");
      return;
    }

    setIsSaving(true);

    try {
      const response = await fetch("/api/candidate-profile", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          firstName: values.firstName,
          lastName: values.lastName,
          phone: values.phone,
          idOrPassportNumber: values.idOrPassportNumber,
        }),
      });

      const payload = await response
        .json()
        .catch(() => ({ message: "Failed to update profile." }));

      if (!response.ok) {
        setServerFieldErrors((payload.fieldErrors as Record<string, string[]>) ?? {});
        showToast(payload.message || "Failed to update profile.", "error");
        return;
      }

      setValues(payload.item ?? values);
      setServerFieldErrors({});
      showToast(payload.message || "Profile updated successfully.");
    } catch {
      showToast("Something went wrong while updating your profile.", "error");
    } finally {
      setIsSaving(false);
    }
  };

  const firstNameError = getFieldError("firstName");
  const lastNameError = getFieldError("lastName");
  const phoneError = getFieldError("phone");
  const idOrPassportNumberError = getFieldError("idOrPassportNumber");

  return (
    <>
      {isSaving && (
        <LoadingOverlay
          title="Saving profile"
          message="Updating your candidate details."
        />
      )}
      <form className="grid gap-5 md:grid-cols-2" onSubmit={handleSubmit}>
      <div className="space-y-2 md:col-span-2">
        <label className="text-sm font-semibold text-[var(--color-ink)]">Email</label>
        <input
          value={values.email}
          disabled
          className="h-12 w-full rounded-2xl border border-[var(--color-border)] bg-white px-4 text-sm text-[var(--color-muted)]"
        />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-semibold text-[var(--color-ink)]">
          First Name <span className="text-rose-600">*</span>
        </label>
        <input
          value={values.firstName}
          onChange={(event) => updateValue("firstName", event.target.value)}
          className={`h-12 w-full rounded-2xl border bg-white px-4 text-sm text-[var(--color-ink)] outline-none focus:ring-4 ${
            firstNameError
              ? "border-rose-300 focus:border-rose-500 focus:ring-[rgba(244,63,94,0.14)]"
              : "border-[var(--color-border)] focus:border-[var(--color-brand)] focus:ring-[rgba(212,138,57,0.16)]"
          }`}
        />
        {firstNameError && <p className="text-xs font-medium text-rose-700">{firstNameError}</p>}
      </div>

      <div className="space-y-2">
        <label className="text-sm font-semibold text-[var(--color-ink)]">
          Last Name <span className="text-rose-600">*</span>
        </label>
        <input
          value={values.lastName}
          onChange={(event) => updateValue("lastName", event.target.value)}
          className={`h-12 w-full rounded-2xl border bg-white px-4 text-sm text-[var(--color-ink)] outline-none focus:ring-4 ${
            lastNameError
              ? "border-rose-300 focus:border-rose-500 focus:ring-[rgba(244,63,94,0.14)]"
              : "border-[var(--color-border)] focus:border-[var(--color-brand)] focus:ring-[rgba(212,138,57,0.16)]"
          }`}
        />
        {lastNameError && <p className="text-xs font-medium text-rose-700">{lastNameError}</p>}
      </div>

      <div className="space-y-2">
        <label className="text-sm font-semibold text-[var(--color-ink)]">
          Mobile Number <span className="text-rose-600">*</span>
        </label>
        <input
          value={values.phone}
          onChange={(event) => updateValue("phone", event.target.value)}
          placeholder="0771234567 or +94771234567"
          className={`h-12 w-full rounded-2xl border bg-white px-4 text-sm text-[var(--color-ink)] outline-none focus:ring-4 ${
            phoneError
              ? "border-rose-300 focus:border-rose-500 focus:ring-[rgba(244,63,94,0.14)]"
              : "border-[var(--color-border)] focus:border-[var(--color-brand)] focus:ring-[rgba(212,138,57,0.16)]"
          }`}
        />
        {phoneError && <p className="text-xs font-medium text-rose-700">{phoneError}</p>}
      </div>

      <div className="space-y-2">
        <label className="text-sm font-semibold text-[var(--color-ink)]">
          NIC or Passport Number <span className="text-rose-600">*</span>
        </label>
        <input
          value={values.idOrPassportNumber}
          onChange={(event) => updateValue("idOrPassportNumber", event.target.value)}
          placeholder="NIC or passport number"
          className={`h-12 w-full rounded-2xl border bg-white px-4 text-sm text-[var(--color-ink)] outline-none focus:ring-4 ${
            idOrPassportNumberError
              ? "border-rose-300 focus:border-rose-500 focus:ring-[rgba(244,63,94,0.14)]"
              : "border-[var(--color-border)] focus:border-[var(--color-brand)] focus:ring-[rgba(212,138,57,0.16)]"
          }`}
        />
        {idOrPassportNumberError && <p className="text-xs font-medium text-rose-700">{idOrPassportNumberError}</p>}
      </div>

      <div className="md:col-span-2 rounded-[24px] border border-[var(--color-border)] bg-white p-4 text-sm leading-6 text-[var(--color-muted)]">
        Basic details are required. Use a Sri Lankan mobile number and a valid NIC or passport number.
      </div>

      <div className="md:col-span-2">
        <button
          type="submit"
          disabled={isSaving || !validation.success || !hasChanges}
          className="rounded-2xl bg-[var(--color-sidebar-accent)] px-5 py-3 text-sm font-medium text-[var(--color-sidebar-accent-ink)] disabled:opacity-70"
        >
          {isSaving ? "Saving..." : "Save Personal Info"}
        </button>
      </div>
      </form>
    </>
  );
}
