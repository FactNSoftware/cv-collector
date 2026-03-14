"use client";

import { FileUp } from "lucide-react";
import { ChangeEvent, FormEvent, useRef, useState } from "react";
import type { CandidateProfile } from "../../lib/candidate-profile";
import { useToast } from "./ToastProvider";

const JOB_OPENINGS = [
  "Frontend Developer",
  "Backend Engineer",
  "UI/UX Designer",
  "QA Engineer",
  "Project Manager",
];

type FormValues = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  idOrPassportNumber: string;
  jobOpening: string;
  resume: File | null;
};

type CvSubmissionFormProps = {
  sessionEmail: string;
  initialProfile: CandidateProfile;
};

const INITIAL_VALUES: FormValues = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  idOrPassportNumber: "",
  jobOpening: JOB_OPENINGS[0],
  resume: null,
};

const toInitialValues = (
  sessionEmail: string,
  profile: CandidateProfile,
): FormValues => ({
  ...INITIAL_VALUES,
  firstName: profile.firstName,
  lastName: profile.lastName,
  email: sessionEmail,
  phone: profile.phone,
  idOrPassportNumber: profile.idOrPassportNumber,
});

export function CvSubmissionForm({
  sessionEmail,
  initialProfile,
}: CvSubmissionFormProps) {
  const [values, setValues] = useState<FormValues>(
    toInitialValues(sessionEmail, initialProfile),
  );
  const [isDragging, setIsDragging] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { showToast } = useToast();

  const updateValue = (
    field: Exclude<keyof FormValues, "resume">,
    value: string,
  ) => {
    setValues((current) => ({ ...current, [field]: value }));
  };

  const updateResume = (file: File | null) => {
    setValues((current) => ({ ...current, resume: file }));
  };

  const handleFileSelection = (event: ChangeEvent<HTMLInputElement>) => {
    updateResume(event.target.files?.[0] ?? null);
  };

  const handleFormSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!values.resume) {
      showToast("CV is required. Please upload your resume as a PDF.", "warning");
      return;
    }

    setIsSubmitting(true);

    try {
      const formData = new FormData();
      formData.append("firstName", values.firstName.trim());
      formData.append("lastName", values.lastName.trim());
      formData.append("email", values.email.trim());
      formData.append("phone", values.phone.trim());
      formData.append("idOrPassportNumber", values.idOrPassportNumber.trim());
      formData.append("jobOpening", values.jobOpening);
      formData.append("resume", values.resume);

      const response = await fetch("/api/cv", {
        method: "POST",
        body: formData,
      });

      const payload = await response
        .json()
        .catch(() => ({ message: "Failed to submit application." }));

      if (!response.ok) {
        showToast(payload.message || "Failed to submit application.", "error");
        return;
      }

      setValues((current) => ({
        ...current,
        email: sessionEmail,
        resume: null,
      }));
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      showToast("Application submitted successfully.");
    } catch {
      showToast("Something went wrong while submitting. Please try again.", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="mx-auto max-w-4xl border rounded-lg border-slate-200 bg-white p-8">
      <div className="text-center">
        <p className="text-sm font-medium uppercase tracking-[0.28em] text-[#01371B]">
          Candidate Portal
        </p>
        <h1 className="mt-1 text-4xl font-semibold tracking-[-0.04em] text-[#171717]">
          Apply for this job
        </h1>
      </div>

      <form
        className="mt-10 grid gap-8 lg:grid-cols-[0.95fr_1.35fr] lg:items-start"
        onSubmit={handleFormSubmit}
      >
        <div className="space-y-6">
          <div className="space-y-3">
            <label
              htmlFor="jobOpening"
              className="block text-sm font-semibold text-[#4d4d4d]"
            >
              Job Opening <span className="text-[#d24a43]">*</span>
            </label>
            <select
              id="jobOpening"
              value={values.jobOpening}
              onChange={(event) =>
                updateValue("jobOpening", event.target.value)
              }
              className="w-full py-3 px-2 rounded-lg border border-[#d9d2c7] text-sm text-[#171717] outline-none transition focus:border-[#d38133] focus:ring-4 focus:ring-[#f3d8bc]"
            >
              {JOB_OPENINGS.map((opening) => (
                <option key={opening} value={opening}>
                  {opening}
                </option>
              ))}
            </select>
          </div>

          <div className="grid gap-6 sm:grid-cols-2">
            <div className="space-y-3">
              <label
                htmlFor="firstName"
                className="block text-sm font-semibold text-[#4d4d4d]"
              >
                First Name <span className="text-[#d24a43]">*</span>
              </label>
              <input
                id="firstName"
                type="text"
                required
                value={values.firstName}
                onChange={(event) =>
                  updateValue("firstName", event.target.value)
                }
                className="w-full py-3 px-2 rounded-lg border border-[#d9d2c7] text-sm text-[#171717] outline-none transition focus:border-[#d38133] focus:ring-4 focus:ring-[#f3d8bc]"
              />
            </div>

            <div className="space-y-3">
              <label
                htmlFor="lastName"
                className="block text-sm font-semibold text-[#4d4d4d]"
              >
                Last Name <span className="text-[#d24a43]">*</span>
              </label>
              <input
                id="lastName"
                type="text"
                required
                value={values.lastName}
                onChange={(event) =>
                  updateValue("lastName", event.target.value)
                }
                className="w-full py-3 px-2 rounded-lg border border-[#d9d2c7] text-sm text-[#171717] outline-none transition focus:border-[#d38133] focus:ring-4 focus:ring-[#f3d8bc]"
              />
            </div>
          </div>

          <div className="space-y-3">
            <label
              htmlFor="email"
              className="block text-sm font-semibold text-[#4d4d4d]"
            >
              Email <span className="text-[#d24a43]">*</span>
            </label>
            <input
              id="email"
              type="email"
              required
              value={values.email}
              disabled
              className="w-full py-3 px-2 rounded-lg border border-[#d9d2c7] bg-slate-100 text-sm text-slate-600 outline-none"
            />
          </div>

          <div className="space-y-3">
            <label
              htmlFor="phone"
              className="block text-sm font-semibold text-[#4d4d4d]"
            >
              Phone Number <span className="text-[#d24a43]">*</span>
            </label>
            <div className="flex overflow-hidden rounded-lg border border-[#d9d2c7]">
              <div className="flex items-center border-r border-[#d9d2c7] px-4 text-2xl">
                🇱🇰
              </div>
              <input
                id="phone"
                type="tel"
                required
                value={values.phone}
                onChange={(event) => updateValue("phone", event.target.value)}
                placeholder="+94"
                className="w-full py-3 px-2 bg-transparent text-base text-[#171717] outline-none"
              />
            </div>
            <p className="text-sm text-[#7c7c7c]">
              The hiring team may use this number to contact you about this job.
            </p>
          </div>

          <div className="space-y-3">
            <label
              htmlFor="idOrPassportNumber"
              className="block text-sm font-semibold text-[#4d4d4d]"
            >
              ID or Passport Number <span className="text-[#d24a43]">*</span>
            </label>
            <input
              id="idOrPassportNumber"
              type="text"
              required
              value={values.idOrPassportNumber}
              onChange={(event) =>
                updateValue("idOrPassportNumber", event.target.value)
              }
              className="w-full py-3 px-2 rounded-lg border border-[#d9d2c7] text-sm text-[#171717] outline-none transition focus:border-[#d38133] focus:ring-4 focus:ring-[#f3d8bc]"
            />
          </div>
        </div>

        <div className="space-y-3">
          <label className="block text-sm font-semibold text-[#4d4d4d]">
            Resume/CV <span className="text-[#d24a43]">*</span>
          </label>
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
            className={`flex min-h-80 w-full flex-col items-center justify-center rounded-lg border border-dashed px-6 text-center transition ${
              isDragging
                ? "border-[#2f67c8] bg-[#eef4ff]"
                : "border-[#d9d2c7] bg-[white]"
            }`}
          >
            <FileUp className="mb-5 h-12 w-12 text-[#01371B]" strokeWidth={2} />
            <p className="text-lg font-medium tracking-[-0.03em] text-[#262626]">
              Click or drag file to upload your Resume
            </p>
            <p className="mt-1 text-sm text-[#7c7c7c]">
              {values.resume
                ? values.resume.name
                : "CV is required. Please make sure to upload a PDF"}
            </p>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf"
            required
            onChange={handleFileSelection}
            className="hidden"
          />
        </div>

        <div>
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex h-12 w-full cursor-pointer items-center justify-center rounded-lg bg-[#01371B] text-base font-medium text-[#A3E42F] transition hover:bg-[#262626] focus:outline-none focus:ring-4 focus:ring-[#d9d9d9]"
          >
            {isSubmitting ? "Submitting..." : "Submit Application"}
          </button>
        </div>

        <p className="text-xs  text-[#777777]">
          By clicking &apos;Submit Application&apos;, you agree to receive job
          application updates via text and/or WhatsApp. Message frequency may
          vary. Reply STOP to unsubscribe at any time. Message and data rates
          may apply.
        </p>
      </form>
    </section>
  );
}
