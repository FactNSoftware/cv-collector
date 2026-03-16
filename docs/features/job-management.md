# Job Management

Related docs:

- [Candidate Experience](./candidate-experience.md)
- [Application Lifecycle](./application-lifecycle.md)
- [ATS Evaluation](./ats-evaluation.md)
- [Admin Operations And Audit](./admin-operations.md)

## Purpose

This feature area manages the lifecycle of job postings, including public visibility, structured job data, ATS configuration, retry limits, and admin authoring tools.

## Implemented Features

- Job creation and editing
- Auto-generated job codes in the `JN###` format
- Rich HTML job descriptions with sanitization
- Job preview for admins
- Draft versus published state
- Public published job pages
- ATS criteria configuration per job
- Rejected-application retry limits per job
- Image upload support for job descriptions
- Soft deletion for jobs

## Job Data Model

Jobs include:

- title, summary, description HTML
- department and location
- employment type, workplace type, experience level
- salary currency and range
- vacancies
- max retry attempts
- ATS enablement and criteria
- closing date, requirements, benefits
- published state
- soft-delete metadata

## Admin Pages

- `/admin/jobs`
- `/admin/jobs/new`
- `/admin/jobs/[id]/edit`
- `/admin/jobs/[id]/preview`
- `/admin/jobs/[id]/candidates`

## Public Pages

- `/jobs/[id]`
- `/apply`
- `/apply/[jobId]`

## Authoring Rules

- Title is required.
- Description HTML is sanitized before storage and rendering.
- Allowed rich content is constrained to a safe subset.
- Uploaded job images are served through `/api/job-assets/...`.
- Jobs must be published to appear in public and candidate browsing flows.

## Retry Configuration

Each job has `maxRetryAttempts`. The effective total number of rejected submissions allowed for a candidate is `maxRetryAttempts + 1`.

Examples:

- `0` means one rejected attempt total, with no second try.
- `2` means three rejected attempts total.

This setting directly affects [Candidate Experience](./candidate-experience.md) and [Application Lifecycle](./application-lifecycle.md).

## ATS Configuration

Jobs can store:

- required ATS keywords
- preferred ATS keywords
- minimum years of experience
- required education entries
- required certifications

These values are normalized and included in the job ATS config signature. See [ATS Evaluation](./ats-evaluation.md).

## APIs

- `GET /api/jobs`
- `GET /api/admin/jobs`
- `POST /api/admin/jobs`
- `PATCH /api/admin/jobs/[id]`
- `DELETE /api/admin/jobs/[id]`
- `POST /api/admin/job-assets`
- `GET /api/job-assets/[...path]`

## Main Files

- `lib/jobs.ts`
- `app/components/JobEditorForm.tsx`
- `app/components/JobDescriptionEditor.tsx`
- `app/components/JobDetailContent.tsx`
- `app/api/jobs/route.ts`
- `app/api/admin/jobs/route.ts`
- `app/api/admin/jobs/[id]/route.ts`
- `app/api/admin/job-assets/route.ts`
