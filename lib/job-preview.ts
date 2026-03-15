import {
  EMPLOYMENT_TYPES,
  EXPERIENCE_LEVELS,
  type JobRecord,
  WORKPLACE_TYPES,
} from "./jobs";

export type JobPreviewDraft = {
  title: string;
  summary: string;
  descriptionHtml: string;
  department: string;
  location: string;
  employmentType: string;
  workplaceType: string;
  experienceLevel: string;
  salaryCurrency: string;
  salaryRange: string;
  vacancies: string;
  maxRetryAttempts: string;
  atsEnabled: boolean;
  atsRequiredKeywords: string;
  atsPreferredKeywords: string;
  closingDate: string;
  requirements: string;
  benefits: string;
  isPublished: boolean;
};

export const getJobPreviewStorageKey = (jobId: string) => `job-preview:${jobId}`;

export const mergeJobPreviewDraft = (
  savedJob: JobRecord,
  draft: JobPreviewDraft,
): JobRecord => {
  const vacancies = Number.parseInt(draft.vacancies, 10);

  return {
    ...savedJob,
    title: draft.title,
    summary: draft.summary,
    descriptionHtml: draft.descriptionHtml,
    department: draft.department,
    location: draft.location,
    employmentType: EMPLOYMENT_TYPES.includes(draft.employmentType as (typeof EMPLOYMENT_TYPES)[number])
      ? draft.employmentType as JobRecord["employmentType"]
      : savedJob.employmentType,
    workplaceType: WORKPLACE_TYPES.includes(draft.workplaceType as (typeof WORKPLACE_TYPES)[number])
      ? draft.workplaceType as JobRecord["workplaceType"]
      : savedJob.workplaceType,
    experienceLevel: EXPERIENCE_LEVELS.includes(draft.experienceLevel as (typeof EXPERIENCE_LEVELS)[number])
      ? draft.experienceLevel as JobRecord["experienceLevel"]
      : savedJob.experienceLevel,
    salaryCurrency: draft.salaryCurrency === "USD" ? "USD" : "LKR",
    salaryRange: draft.salaryRange,
    vacancies: Number.isFinite(vacancies) && vacancies > 0 ? vacancies : null,
    maxRetryAttempts: Math.max(0, Number.parseInt(draft.maxRetryAttempts, 10) || 0),
    atsEnabled: Boolean(draft.atsEnabled),
    atsRequiredKeywords: draft.atsEnabled
      ? draft.atsRequiredKeywords
        .split(/\r?\n|,/)
        .map((item) => item.trim())
        .filter(Boolean)
      : [],
    atsPreferredKeywords: draft.atsEnabled
      ? draft.atsPreferredKeywords
        .split(/\r?\n|,/)
        .map((item) => item.trim())
        .filter(Boolean)
      : [],
    closingDate: draft.closingDate,
    requirements: draft.requirements,
    benefits: draft.benefits,
    isPublished: Boolean(draft.isPublished),
  };
};
