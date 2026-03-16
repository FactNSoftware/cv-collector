# ATS Evaluation

Related docs:

- [Job Management](./job-management.md)
- [Application Lifecycle](./application-lifecycle.md)
- [Admin Operations And Audit](./admin-operations.md)

## Purpose

This feature area scores submitted resumes against job-level ATS criteria without blocking the candidate submission flow.

## Implemented Features

- Job-level ATS enablement
- Required and preferred keyword matching
- Minimum years of experience checks
- Education and certification checks
- OpenAI-assisted extraction when `OPENAI_API_KEY` is configured
- Rules-based fallback when AI is unavailable
- Background queue processing for ATS work
- ATS status tracking on each application
- ATS recalculation for eligible pending applications
- ATS ranking and detail views in admin screens

## ATS Workflow

1. Candidate submits an application for a job with ATS enabled.
2. The application is saved immediately.
3. A queue record is created in Azure Table Storage.
4. Queue processing downloads the stored resume PDF.
5. Resume text is extracted.
6. The system evaluates the resume with AI or rules-based logic.
7. ATS results are saved back to the application record.

## Status Values

- `none`
- `queued`
- `processing`
- `success`
- `failed`

## Scoring Behavior

- Scores range from `0` to `100` when scoring is applicable.
- Required criteria have higher weight than preferred criteria.
- If no effective ATS criteria exist, the application is treated as not scored.
- Decision bands include:
  - `best_match`
  - `strong_match`
  - `qualified`
  - `needs_review`
  - `low_match`
  - `not_scored`

## Stored ATS Fields

Applications can store:

- ATS score, status, method, decision band
- summary and candidate summary
- confidence notes and confidence score
- text preview
- normalized skills, relevant roles, education, certifications, domains, seniority
- years of experience
- required and preferred matches/misses
- requirement checks for experience, education, and certifications
- evaluation timestamp
- ATS config signature

## Processing Model

- Queue jobs are stored in Table Storage.
- Queue processing is triggered opportunistically by submission and admin page loads.
- The queue worker processes a small number of pending items per trigger.
- Failures mark the application ATS state as failed and keep the application itself intact.

## Admin Controls

- ATS details modal on application review surfaces
- ATS-based sorting and badges in candidate lists
- Manual recalculation through `POST /api/admin/applications/[id]`

Recalculation is limited to:

- existing applications
- jobs with ATS enabled
- jobs with effective ATS criteria
- applications still in `pending`

## Main Files

- `lib/ats.ts`
- `lib/ats-queue.ts`
- `lib/ats-recalculation.ts`
- `app/components/AtsDetailsModal.tsx`
- `app/api/admin/applications/[id]/route.ts`

## Dependencies

- Uses job criteria from [Job Management](./job-management.md).
- Persists results on submissions described in [Application Lifecycle](./application-lifecycle.md).
