# Project Documentation

This documentation set breaks the application into linked feature areas so the project can be understood by workflow instead of only by source folder.

## Start Here

- [Project Overview](./project-overview.md)
- [Deployment Credentials And Environments](./deployment-credentials-and-environments.md)
- [Authentication And Access](./features/authentication-and-access.md)
- [Candidate Experience](./features/candidate-experience.md)
- [Job Management](./features/job-management.md)
- [Application Lifecycle](./features/application-lifecycle.md)
- [ATS Evaluation](./features/ats-evaluation.md)
- [Chat And Messaging](./features/chat-and-messaging.md)
- [Admin Operations And Audit](./features/admin-operations.md)
- [Chat Integration Design](./chat-integration.md)

## Suggested Reading Order

1. Read [Project Overview](./project-overview.md) for the system map.
2. Read [Deployment Credentials And Environments](./deployment-credentials-and-environments.md) if you manage environments, credentials, and deployments.
3. Read [Authentication And Access](./features/authentication-and-access.md) to understand portals and route protection.
4. Follow either the [Candidate Experience](./features/candidate-experience.md) or [Admin Operations And Audit](./features/admin-operations.md) path.
5. Use [Application Lifecycle](./features/application-lifecycle.md), [ATS Evaluation](./features/ats-evaluation.md), and [Chat And Messaging](./features/chat-and-messaging.md) for cross-cutting behavior.

## Feature Map

- Authentication provides OTP login, sessions, and role-based redirects.
- Candidate experience covers profile management, job browsing, applying, history, and accepted-application chat entry points.
- Job management covers public job publishing plus admin creation, editing, previewing, and soft deletion.
- Application lifecycle covers CV upload, duplicate prevention, retry limits, admin review, withdrawals, and resume access.
- ATS evaluation covers background scoring, queue processing, job-level ATS settings, and recalculation.
- Chat and messaging covers Azure Communication Services thread provisioning, inboxes, read state, and moderation.
- Admin operations and audit covers dashboard views, access management, audit logs, and maintenance routines.
