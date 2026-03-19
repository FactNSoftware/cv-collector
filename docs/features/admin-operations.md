# Admin Operations And Audit

Related docs:

- [Authentication And Access](./authentication-and-access.md)
- [Job Management](./job-management.md)
- [Application Lifecycle](./application-lifecycle.md)
- [ATS Evaluation](./ats-evaluation.md)
- [Chat And Messaging](./chat-and-messaging.md)

## Purpose

This feature area covers the admin workspace: dashboards, candidate and job review screens, admin account management, auditing, and retention cleanup.

## Implemented Features

- Admin dashboard summary
- Job management and candidate review views
- Candidate directory and candidate detail pages
- Admin chat inboxes
- Admin account creation, update, and soft deletion
- Immutable admin audit event recording
- Audited access to sensitive resume downloads and exports
- Soft-delete cleanup support

## Admin Workspace Pages

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

## Dashboard Capabilities

The admin landing page aggregates:

- admin count
- candidate count
- job count
- application count
- quick links into core admin workflows
- recent candidate activity

## Admin Account Management

Admins can:

- list admin accounts
- create a new admin account
- change an existing admin email
- soft-delete an admin account

Rules:

- the current admin cannot delete their own admin account
- admin creation ensures a candidate profile exists for that email
- soft-deleted admin accounts are excluded from normal admin checks

Bootstrap and day-2 access flow:

- first-admin bootstrap uses `POST /api/admin/register` and requires `ADMIN_PERMISSION_TOKEN`
- bootstrap is intentionally disabled after the first active admin account exists
- after bootstrap, new admins are created from the authenticated admin portal
- all admin account lifecycle changes are written to audit logs

## Audit Logging

Audit events capture:

- actor email
- action
- target type and ID
- human-readable summary
- request method and path
- user agent
- optional details payload
- timestamp

Audited actions include:

- admin account changes
- job creation, update, publish, unpublish, and delete
- application review actions
- ATS recalculation requests
- chat provisioning outcomes
- admin resume downloads and job CV exports
- admin bootstrap registration

## Maintenance And Retention

Soft-deleted records are permanently purged by cleanup after retention:

- jobs
- applications
- admin accounts

The cleanup entry points are:

- `lib/soft-delete-cleanup.ts`
- `scripts/run-soft-delete-cleanup.ts`
- `npm run cleanup:soft-deleted`

Retention is currently 30 days.

## APIs

- `GET /api/admin/users`
- `GET /api/admin/admins`
- `POST /api/admin/admins`
- `PATCH /api/admin/admins/[email]`
- `DELETE /api/admin/admins/[email]`
- `GET /api/admin/audit`
- `POST /api/admin/register`
- admin job, application, resume, and chat APIs used by other feature areas

## Main Files

- `app/components/AdminPortal.tsx`
- `app/components/AdminJobsIndex.tsx`
- `app/components/AdminJobCandidates.tsx`
- `app/components/AdminCandidatesIndex.tsx`
- `app/components/AdminCandidateDetail.tsx`
- `app/components/AdminSettingsPortal.tsx`
- `app/components/AdminAuditPortal.tsx`
- `lib/admin-access.ts`
- `lib/audit-log.ts`
- `lib/soft-delete-cleanup.ts`
