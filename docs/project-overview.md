# Project Overview

## Summary

CV Collector is a full-stack Next.js application for managing hiring workflows on Azure. Candidates authenticate with email OTP, maintain a personal profile, browse published jobs, submit CVs, and chat with admins after acceptance. Admins manage jobs, review applications, use ATS scoring, manage admin access, and inspect audit logs.

See also:

- [Platform Product Architecture](./platform-product-architecture.md)
- [Deployment Credentials And Environments](./deployment-credentials-and-environments.md)
- [Authentication And Access](./features/authentication-and-access.md)
- [Candidate Experience](./features/candidate-experience.md)
- [Job Management](./features/job-management.md)
- [Application Lifecycle](./features/application-lifecycle.md)
- [ATS Evaluation](./features/ats-evaluation.md)
- [Chat And Messaging](./features/chat-and-messaging.md)
- [Admin Operations And Audit](./features/admin-operations.md)
- [Subscriptions And Feature Access](./features/subscriptions-and-feature-access.md)
- [Feature Security And Authorization](./features/feature-security-and-authorization.md)

## Primary User Roles

- Candidate: logs in, maintains profile data, browses published jobs, submits and withdraws applications, views status history, and uses accepted-application chat.
- Admin: logs in through the same OTP system, gets routed into the admin portal, manages jobs and applications, provisions chats by accepting applications, manages admin accounts, and reviews audit events.

## Main User Journeys

### Candidate Journey

1. Open `/` and request an OTP.
2. Verify the OTP and receive a server-side session.
3. Complete the profile if required.
4. Browse published jobs through `/apply` or open a direct public job page.
5. Submit a PDF CV for a published job.
6. Track application status in `/applications` and `/applications/history`.
7. Enter chat after the application is accepted.

### Admin Journey

1. Log in with the same OTP flow.
2. Get routed to `/admin`.
3. Create or update jobs, including ATS criteria and retry limits.
4. Review pending applications from candidate detail pages or job candidate lists.
5. Accept or reject applications, optionally with a rejection reason.
6. Use ATS details and recalculate ATS when needed.
7. Manage admins and inspect audit logs.

## Technical Architecture

### Frontend

- Next.js App Router under `app/`
- React client components for interactive portals, forms, tables, and chat
- Shared shell and navigation components in `app/components/`

### Backend

- Route handlers under `app/api/`
- Domain logic under `lib/`
- Azure Table Storage for metadata, auth, audit, queue records, and chat state
- Azure Blob Storage for CV PDFs and job assets
- Azure Communication Services for email OTP and chat
- OpenAI-backed ATS analysis with rules fallback

### Key Domain Modules

- `lib/auth-otp.ts`: OTP issue and verification
- `lib/auth-session.ts`: session creation, lookup, and deletion
- `lib/auth-guards.ts`: page and API access control
- `lib/candidate-profile.ts`: candidate profile persistence
- `lib/jobs.ts`: job records, publication state, ATS config, and soft deletion
- `lib/cv-storage.ts`: application storage, review state, ATS persistence, and retry rules
- `lib/ats.ts`: resume evaluation
- `lib/ats-queue.ts`: background ATS queue processing
- `lib/acs-chat.ts`: chat identities, thread access, inboxes, read state, and moderation
- `lib/admin-access.ts`: admin bootstrap and account management
- `lib/audit-log.ts`: admin audit trail

## Storage Model

- Azure Table Storage stores:
  - OTP records
  - auth sessions
  - candidate profiles
  - admin accounts
  - jobs
  - CV submission metadata
  - ATS queue jobs
  - chat identities, chat mappings, read state, and moderated message markers
  - admin audit events
- Azure Blob Storage stores:
  - candidate CV PDFs
  - uploaded job description assets

## Operational Notes

- ATS processing is asynchronous. Applications are saved first and scored after queue processing.
- Jobs, applications, and admin accounts use soft deletion.
- A cleanup script permanently purges soft-deleted records after retention.
- Chat is only available for accepted applications.

## Route Groups

- Public:
  - `/`
  - `/jobs/[id]`
- Candidate:
  - `/apply`
  - `/apply/[jobId]`
  - `/applications`
  - `/applications/history`
  - `/applications/chat`
  - `/applications/chat/[id]`
  - `/account`
- Admin:
  - `/admin`
  - `/admin/jobs`
  - `/admin/jobs/new`
  - `/admin/jobs/[id]/edit`
  - `/admin/jobs/[id]/preview`
  - `/admin/jobs/[id]/candidates`
  - `/admin/candidates`
  - `/admin/candidates/[email]`
  - `/admin/chat`
  - `/admin/chat/[id]`
  - `/admin/chat/user/[email]`
  - `/admin/settings`
  - `/admin/audit`
