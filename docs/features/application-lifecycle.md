# Application Lifecycle

Related docs:

- [Candidate Experience](./candidate-experience.md)
- [Job Management](./job-management.md)
- [ATS Evaluation](./ats-evaluation.md)
- [Chat And Messaging](./chat-and-messaging.md)
- [Admin Operations And Audit](./admin-operations.md)

## Purpose

This feature area covers how CV submissions are created, stored, reviewed, updated, withdrawn, and deleted.

## Implemented Features

- CV submission with PDF validation and blob storage
- Duplicate active-application prevention
- Rejected-attempt retry limits per job
- Review states: `pending`, `accepted`, `rejected`
- Optional rejection reason
- ATS metadata stored on the application record
- Candidate withdrawal
- Admin soft deletion
- Resume download endpoints for candidates and admins
- Admin review actions from multiple pages

## Submission Flow

1. Candidate submits profile details, job ID, and PDF resume to `POST /api/cv`.
2. The API checks the authenticated session and validates that the email matches the session.
3. The API verifies the job is published.
4. The resume is validated and stored.
5. A submission record is created in Azure Table Storage.
6. If ATS is enabled for the job, ATS is queued asynchronously.

## Duplicate And Retry Rules

- A candidate cannot create a second active application for the same job.
- Rejected applications do not block reapplication unless the retry limit has been reached.
- Retry limits are computed from the job setting `maxRetryAttempts`.

## Review State Rules

- New applications start as `pending`.
- Admins can mark a pending application as `accepted` or `rejected`.
- Once accepted, the review state cannot be changed back.
- Once rejected, the review state cannot be changed back.
- Reject actions may include a rejection reason shown to the candidate.

## Withdrawals And Deletion

- Candidates can withdraw their own applications through `DELETE /api/cv/[id]`.
- Admins can soft-delete applications through `DELETE /api/admin/applications/[id]`.
- Soft-deleted records are hidden from normal listing APIs and can later be purged permanently by maintenance cleanup.

## Resume Access

- Candidates can download their own resumes from `/api/cv/[id]/resume`.
- Admins can download any candidate resume from `/api/admin/cv/[id]/resume`.
- Job-specific admin exports are available through `/api/admin/jobs/[id]/cvs`.

## Admin Review Operations

Admin review is exposed through:

- job candidate view
- candidate detail view
- application-specific actions

Supported actions:

- accept application
- reject application
- recalculate ATS for eligible pending applications
- delete application

## APIs

- `GET /api/cv`
- `POST /api/cv`
- `DELETE /api/cv/[id]`
- `GET /api/cv/[id]/resume`
- `PATCH /api/admin/applications/[id]`
- `POST /api/admin/applications/[id]`
- `DELETE /api/admin/applications/[id]`
- `GET /api/admin/cv/[id]/resume`
- `GET /api/admin/jobs/[id]/cvs`

## Main Files

- `lib/cv-storage.ts`
- `lib/cv-file-service.ts`
- `app/api/cv/route.ts`
- `app/api/cv/[id]/route.ts`
- `app/api/admin/applications/[id]/route.ts`
- `app/components/CandidateJobApplyView.tsx`
- `app/components/CandidateApplicationsHistory.tsx`
- `app/components/AdminJobCandidates.tsx`
- `app/components/AdminCandidateDetail.tsx`
