"use client";

import { FormEvent, useState } from "react";
import { COMPANY_SIZES, EXPECTED_USERS } from "../../lib/org-registration";
import type { CompanySize, ExpectedUsers } from "../../lib/org-registration";
import { LoadingOverlay } from "./LoadingOverlay";
import { useToast } from "./ToastProvider";

type Props = {
  onCancel: () => void;
};

export function OrganizationRegistrationForm({ onCancel }: Props) {
  const { showToast } = useToast();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orgName, setOrgName] = useState("");
  const [ownerEmail, setOwnerEmail] = useState("");
  const [companySize, setCompanySize] = useState<CompanySize | "">("");
  const [expectedUsers, setExpectedUsers] = useState<ExpectedUsers | "">("");

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    let shouldKeepSubmittingState = false;

    try {
      const response = await fetch("/api/org-registration", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orgName, ownerEmail, companySize, expectedUsers }),
      });

      const payload = await response
        .json()
        .catch(() => ({ message: "Failed to register organization." }));

      if (!response.ok) {
        showToast(payload.message || "Failed to register organization.", "error");
        return;
      }

      const fallbackPath = typeof payload.slug === "string" && payload.slug
        ? `/o/${payload.slug}`
        : "/";
      const baseRedirectPath = typeof payload.redirectPath === "string"
        ? payload.redirectPath
        : fallbackPath;
      const separator = baseRedirectPath.includes("?") ? "&" : "?";
      const redirectPath = `${baseRedirectPath}${separator}email=${encodeURIComponent(ownerEmail.trim().toLowerCase())}`;

      showToast(payload.message || "Organization registered. Continue with portal login OTP.");
      shouldKeepSubmittingState = true;
      window.location.assign(redirectPath);
    } catch {
      showToast("Something went wrong. Please try again.", "error");
    } finally {
      if (!shouldKeepSubmittingState) {
        setIsSubmitting(false);
      }
    }
  };

  const inputClass =
    "h-12 w-full rounded-2xl border border-[var(--color-border)] bg-[var(--color-panel)] px-4 text-sm text-[var(--color-ink)] outline-none transition focus:border-[var(--color-brand-strong)] focus:ring-4 focus:ring-[var(--color-focus-ring)]";
  const selectClass =
    "h-12 w-full rounded-2xl border border-[var(--color-border)] bg-[var(--color-panel)] px-4 text-sm text-[var(--color-ink)] outline-none transition focus:border-[var(--color-brand-strong)] focus:ring-4 focus:ring-[var(--color-focus-ring)]";
  const labelClass = "block text-sm font-medium text-[var(--color-ink)]";

  return (
    <div className="w-full max-w-md">
      {isSubmitting && (
        <LoadingOverlay
          title="Creating organization"
          message="Preparing your organization portal and redirecting to login."
        />
      )}

      <div className="mb-6">
        <p className="text-sm font-medium uppercase tracking-[0.28em] text-[var(--color-brand-strong)]">
          New Organization
        </p>
        <h2 className="mt-1 text-3xl font-semibold tracking-[-0.04em] text-[var(--color-ink)] sm:text-4xl">
          Register your organization
        </h2>
        <p className="mt-3 text-sm leading-6 text-[var(--color-muted)]">
          We will create your organization first, then take you to your portal
          login where you can request a one-time password.
        </p>
      </div>

      <form className="space-y-4" onSubmit={handleSubmit}>
        <div className="space-y-1">
          <label htmlFor="reg-org-name" className={labelClass}>
            Organization name
          </label>
          <input
            id="reg-org-name"
            type="text"
            required
            minLength={2}
            maxLength={80}
            placeholder="Acme Corp"
            value={orgName}
            onChange={(e) => setOrgName(e.target.value)}
            className={inputClass}
          />
        </div>

        <div className="space-y-1">
          <label htmlFor="reg-owner-email" className={labelClass}>
            Work email
          </label>
          <input
            id="reg-owner-email"
            type="email"
            required
            placeholder="jane@acmecorp.com"
            value={ownerEmail}
            onChange={(e) => setOwnerEmail(e.target.value)}
            className={inputClass}
          />
        </div>

        <div className="space-y-1">
          <label htmlFor="reg-company-size" className={labelClass}>
            Company size
          </label>
          <select
            id="reg-company-size"
            required
            value={companySize}
            onChange={(e) => setCompanySize(e.target.value as CompanySize)}
            className={selectClass}
          >
            <option value="">Select company size</option>
            {COMPANY_SIZES.map((size) => (
              <option key={size} value={size}>
                {size} employees
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1">
          <label htmlFor="reg-expected-users" className={labelClass}>
            Expected hiring volume
          </label>
          <select
            id="reg-expected-users"
            required
            value={expectedUsers}
            onChange={(e) => setExpectedUsers(e.target.value as ExpectedUsers)}
            className={selectClass}
          >
            <option value="">Select expected volume</option>
            {EXPECTED_USERS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>

        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={onCancel}
            className="theme-action-button theme-action-button-secondary flex h-12 flex-1 items-center justify-center rounded-2xl text-sm font-medium"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="theme-btn-primary flex h-12 flex-1 items-center justify-center rounded-2xl text-sm font-medium disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isSubmitting ? "Creating..." : "Create organization"}
          </button>
        </div>
      </form>
    </div>
  );
}
