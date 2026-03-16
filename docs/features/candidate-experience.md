# Candidate Experience

Related docs:

- [Authentication And Access](./authentication-and-access.md)
- [Job Management](./job-management.md)
- [Application Lifecycle](./application-lifecycle.md)
- [Chat And Messaging](./chat-and-messaging.md)

## Purpose

This feature area covers everything a candidate can do after login: profile management, browsing jobs, applying, tracking status, and opening chat for accepted applications.

## Candidate Portal Areas

- `/applications`: landing page after candidate login
- `/apply`: published job list for authenticated candidates
- `/apply/[jobId]`: job details plus application flow
- `/applications/history`: application history with status and rejection details
- `/applications/chat`: accepted-application inbox
- `/applications/chat/[id]`: application-specific conversation
- `/account`: editable candidate profile

## Implemented Features

- Automatic candidate profile creation on first authenticated access
- Candidate profile editing with validation
- Published job browsing
- Public job detail view at `/jobs/[id]`
- Authenticated application flow from `/apply/[jobId]`
- Inline CV upload for PDF resumes
- Existing-application prevention
- Retry limits after rejection, based on job settings
- Application withdrawal
- History view with review status and rejection reason
- Chat access after acceptance

## Profile Management

Candidate profiles store:

- email
- first name
- last name
- phone
- ID or passport number
- last update timestamp

Profile validation is implemented in `lib/candidate-profile-validation.ts` and used before CV submission.

## Job Discovery

- Public users can open published job pages at `/jobs/[id]`.
- Signed-in candidates can browse all published jobs at `/apply`.
- The application workspace shows if a user already has an active submission for a job.
- Rejected attempts remain visible for reference when reapplying is allowed.

## Application Entry Rules

- The candidate must be signed in.
- The submission email must match the signed-in account.
- The target job must be published.
- A PDF resume is required.
- Profile fields must pass validation.
- A candidate cannot create another active application for the same job.
- Reapplications are limited by `job.maxRetryAttempts + 1` total rejected attempts.

## History And Status Tracking

Candidates can see:

- pending, accepted, or rejected state
- rejection reason
- submission date
- links to download their stored resume
- chat availability for accepted applications

## Main Files

- `app/components/CandidatePortal.tsx`
- `app/components/CandidateApplyWorkspace.tsx`
- `app/components/CandidateJobApplyView.tsx`
- `app/components/CandidateApplicationsHistory.tsx`
- `app/components/CandidateAccountView.tsx`
- `app/components/CandidateProfileForm.tsx`
- `app/api/candidate-profile/route.ts`
- `app/api/cv/route.ts`
- `app/api/cv/[id]/route.ts`

## Dependencies

- Uses login/session rules from [Authentication And Access](./authentication-and-access.md).
- Uses published jobs from [Job Management](./job-management.md).
- Uses submission rules from [Application Lifecycle](./application-lifecycle.md).
- Uses accepted-application chat from [Chat And Messaging](./chat-and-messaging.md).
