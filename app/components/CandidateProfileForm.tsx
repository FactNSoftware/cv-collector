"use client";

import { FormEvent, useState } from "react";
import type { CandidateProfile } from "../../lib/candidate-profile";
import { useToast } from "./ToastProvider";

type CandidateProfileFormProps = {
  initialProfile: CandidateProfile;
};

export function CandidateProfileForm({
  initialProfile,
}: CandidateProfileFormProps) {
  const [values, setValues] = useState(initialProfile);
  const [isSaving, setIsSaving] = useState(false);
  const { showToast } = useToast();

  const updateValue = (
    field: "firstName" | "lastName" | "phone" | "idOrPassportNumber",
    value: string,
  ) => {
    setValues((current) => ({ ...current, [field]: value }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
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
        showToast(payload.message || "Failed to update profile.", "error");
        return;
      }

      setValues(payload.item ?? values);
      showToast(payload.message || "Profile updated successfully.");
    } catch {
      showToast("Something went wrong while updating your profile.", "error");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form className="grid gap-5 md:grid-cols-2" onSubmit={handleSubmit}>
      <div className="space-y-2 md:col-span-2">
        <label className="text-sm font-semibold text-slate-700">Email</label>
        <input
          value={values.email}
          disabled
          className="h-12 w-full rounded-lg border border-slate-200 bg-slate-100 px-3 text-sm text-slate-600"
        />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-semibold text-slate-700">First Name</label>
        <input
          value={values.firstName}
          onChange={(event) => updateValue("firstName", event.target.value)}
          className="h-12 w-full rounded-lg border border-slate-200 px-3 text-sm text-slate-900 outline-none focus:border-[#d38133] focus:ring-4 focus:ring-[#f3d8bc]"
        />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-semibold text-slate-700">Last Name</label>
        <input
          value={values.lastName}
          onChange={(event) => updateValue("lastName", event.target.value)}
          className="h-12 w-full rounded-lg border border-slate-200 px-3 text-sm text-slate-900 outline-none focus:border-[#d38133] focus:ring-4 focus:ring-[#f3d8bc]"
        />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-semibold text-slate-700">Phone</label>
        <input
          value={values.phone}
          onChange={(event) => updateValue("phone", event.target.value)}
          className="h-12 w-full rounded-lg border border-slate-200 px-3 text-sm text-slate-900 outline-none focus:border-[#d38133] focus:ring-4 focus:ring-[#f3d8bc]"
        />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-semibold text-slate-700">ID or Passport Number</label>
        <input
          value={values.idOrPassportNumber}
          onChange={(event) => updateValue("idOrPassportNumber", event.target.value)}
          className="h-12 w-full rounded-lg border border-slate-200 px-3 text-sm text-slate-900 outline-none focus:border-[#d38133] focus:ring-4 focus:ring-[#f3d8bc]"
        />
      </div>

      <div className="md:col-span-2">
        <button
          type="submit"
          disabled={isSaving}
          className="rounded-lg bg-[#01371B] px-4 py-2 text-sm font-medium text-[#A3E42F] disabled:opacity-70"
        >
          {isSaving ? "Saving..." : "Save Personal Info"}
        </button>
      </div>
    </form>
  );
}
