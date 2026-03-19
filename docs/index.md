# Project Documentation

This documentation set breaks the application into linked feature areas so the project can be understood by workflow instead of only by source folder.

## Start Here

- [Project Overview](./project-overview.md)
- [Platform Product Architecture](./platform-product-architecture.md)
- [Deployment Credentials And Environments](./deployment-credentials-and-environments.md)
- [Multi-Tenancy Architecture](./multi-tenancy-architecture.md)
- [Authentication And Access](./features/authentication-and-access.md)
- [Candidate Experience](./features/candidate-experience.md)
- [Job Management](./features/job-management.md)
- [Application Lifecycle](./features/application-lifecycle.md)
- [ATS Evaluation](./features/ats-evaluation.md)
- [Chat And Messaging](./features/chat-and-messaging.md)
- [Admin Operations And Audit](./features/admin-operations.md)
- [Subscriptions And Feature Access](./features/subscriptions-and-feature-access.md)
- [Feature Security And Authorization](./features/feature-security-and-authorization.md)
- [Chat Integration Design](./chat-integration.md)

## Suggested Reading Order

1. Read [Project Overview](./project-overview.md) for the system map.
2. Read [Platform Product Architecture](./platform-product-architecture.md) for the intended long-term product shape.
3. Read [Deployment Credentials And Environments](./deployment-credentials-and-environments.md) if you manage environments, credentials, and deployments.
4. Read [Multi-Tenancy Architecture](./multi-tenancy-architecture.md) for the target platform direction.
5. Read [Authentication And Access](./features/authentication-and-access.md) to understand portals and route protection.
6. Follow either the [Candidate Experience](./features/candidate-experience.md) or [Admin Operations And Audit](./features/admin-operations.md) path.
7. Use [Application Lifecycle](./features/application-lifecycle.md), [ATS Evaluation](./features/ats-evaluation.md), and [Chat And Messaging](./features/chat-and-messaging.md) for cross-cutting behavior.
8. Read [Subscriptions And Feature Access](./features/subscriptions-and-feature-access.md) before building tenant feature gating or packaging.
9. Read [Feature Security And Authorization](./features/feature-security-and-authorization.md) before implementing new gated APIs or future feature modules.

## Feature Map

- Authentication provides OTP login, sessions, and role-based redirects.
- Platform product architecture defines the target module strategy, package direction, and long-term system boundaries.
- Candidate experience covers profile management, job browsing, applying, history, and accepted-application chat entry points.
- Job management covers public job publishing plus admin creation, editing, previewing, and soft deletion.
- Application lifecycle covers CV upload, duplicate prevention, retry limits, admin review, withdrawals, and resume access.
- ATS evaluation covers background scoring, queue processing, job-level ATS settings, and recalculation.
- Chat and messaging covers Azure Communication Services thread provisioning, inboxes, read state, and moderation.
- Admin operations and audit covers dashboard views, access management, audit logs, and maintenance routines.
- Subscriptions and feature access defines how super admins package, assign, and enforce tenant capabilities.
- Feature security and authorization defines the capability model, implementation lifecycle, and API-level enforcement strategy for current and upcoming modules.
