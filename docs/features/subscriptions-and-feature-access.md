# Subscriptions And Feature Access

Related docs:

- [Project Overview](../project-overview.md)
- [Multi-Tenancy Architecture](../multi-tenancy-architecture.md)
- [Authentication And Access](./authentication-and-access.md)
- [Feature Security And Authorization](./feature-security-and-authorization.md)
- [Job Management](./job-management.md)
- [Application Lifecycle](./application-lifecycle.md)
- [ATS Evaluation](./ats-evaluation.md)
- [Chat And Messaging](./chat-and-messaging.md)
- [Admin Operations And Audit](./admin-operations.md)

## Purpose

This document defines the planned subscription system for the multi-tenant platform.

The goal is to let super admins:

- define platform features centrally
- create custom subscriptions
- decide whether a subscription is publicly selectable or restricted
- assign one subscription to many organizations
- assign organization-specific subscriptions when needed
- enforce feature access in both UI and backend

If an organization does not have access to a feature, the application must:

- not render the related UI
- not allow the related API or server action
- not allow direct URL access to protected pages

## Why This Feature Exists

The current platform already has multiple functional areas, but every tenant effectively gets the same product surface.

The subscription system is intended to support:

- public self-serve plans
- private enterprise plans
- organization-specific commercial agreements
- phased rollout of premium features
- backend-safe feature enforcement instead of UI-only hiding

## Current Product Capability Inventory

This is the current functional surface that should be classified into subscription-managed features.

### Public And Candidate Capabilities

- OTP login
- candidate profile management
- published job browsing
- direct public job pages
- CV submission
- application history
- application withdrawal
- accepted-application chat access

### Organization Workspace Capabilities

- organization dashboard
- organization jobs list
- create job
- edit job
- publish and unpublish job
- delete job
- candidate directory
- candidate detail and review
- application review
- organization settings
- organization branding
- custom domain setup
- custom email domain setup
- administrator management
- root owner transfer

### Recruiting Intelligence And Automation

- ATS-enabled jobs
- ATS queue processing
- ATS score display
- ATS recalculation
- ATS rule and AI evaluation

### Communication Features

- admin chat inbox
- candidate chat inbox
- application-specific chat
- chat provisioning on accepted applications
- chat moderation and deletion markers

### Access And Governance

- admin account management
- super admin account management
- organization creation
- organization activation and suspension
- organization branding inspection
- audit logs
- system analytics

## Subscription-Managed Feature Catalog

The subscription system should not gate pages directly by route name. It should gate stable feature keys.

Recommended first-pass feature keys:

- `public_job_board`
- `candidate_profiles`
- `candidate_applications`
- `candidate_chat`
- `tenant_dashboard`
- `tenant_jobs`
- `tenant_job_publish`
- `tenant_candidates`
- `tenant_application_review`
- `tenant_admin_management`
- `tenant_branding`
- `custom_domain`
- `custom_email_domain`
- `ats`
- `ats_recalculation`
- `chat`
- `audit_logs`
- `system_analytics`

These keys should be stored as global system features so subscriptions can reference them consistently.

## Subscription Model

### Main Concepts

#### Feature

A feature is a single capability key managed by super admin.

Examples:

- ATS
- chat
- custom domain
- audit logs

#### Subscription

A subscription is a named bundle of feature keys.

Examples:

- Starter
- Growth
- Enterprise
- Custom ATS + Domain Package

#### Organization Subscription Assignment

An organization should resolve to one effective subscription at a time.

The effective subscription may come from:

- a public subscription selected during signup
- a direct super-admin assignment
- a private custom subscription created only for specific organizations

### Subscription Visibility

Each subscription should support a visibility mode:

- `public`
- `private`
- `internal`

Meaning:

- `public`: visible during public organization registration or self-serve upgrade flow
- `private`: assignable only by super admin
- `internal`: operational/testing subscription not visible to customers

### Organization Scope

One subscription can be assigned to multiple organizations.

The system must also support:

- one-off custom subscription for a single organization
- migration of an organization from one subscription to another
- future support for historical subscription audit records

## Functional Requirements

### Super Admin Requirements

Super admins must be able to:

- define feature records
- enable or disable features globally
- create subscriptions
- update subscriptions
- archive subscriptions
- mark subscriptions as public or private
- assign many features to a subscription
- assign a subscription to one or more organizations
- inspect which organizations are using a subscription
- inspect which subscription an organization currently has

### Public Registration Requirements

Public registration should support:

- no-plan registration when a default public subscription exists
- explicit subscription selection when multiple public subscriptions exist
- validation that only public subscriptions can be selected by public users

The registration flow should store the selected subscription with the created organization.

### Organization Runtime Requirements

At runtime, the app must:

- resolve the organization
- resolve its effective subscription
- resolve enabled feature keys
- expose those feature keys to page guards, UI components, and APIs

### UI Enforcement Requirements

If a feature is not enabled:

- the related navigation item should not render
- the related buttons and actions should not render
- related settings blocks should not render
- related dashboard cards should not render when they depend on gated capability

Examples:

- no `tenant_jobs` means hide jobs navigation and job management actions
- no `tenant_candidates` means hide candidate pages and candidate navigation
- no `ats` means hide ATS settings, ATS scores, and recalculation controls
- no `custom_domain` means hide custom domain settings
- no `chat` means hide chat entry points

### Backend Enforcement Requirements

If a feature is not enabled:

- API routes must reject access
- page loaders must reject access
- server-side actions must reject access
- background jobs must not execute gated functionality for that organization

Examples:

- no `ats` means ATS queue creation and recalculation must reject
- no `chat` means chat provisioning and token APIs must reject
- no `tenant_admin_management` means membership mutation APIs must reject
- no `custom_domain` means domain settings APIs must reject

## Proposed Enforcement Layers

The subscription system should be enforced in four layers.

### 1. Feature Catalog

Global system data:

- feature key
- feature name
- description
- status

### 2. Subscription Definitions

Global system data:

- subscription ID
- name
- code
- description
- visibility
- active status

Plus a join set of feature keys included in that subscription.

### 3. Organization Subscription Assignment

Tenant-linked data:

- organization ID
- subscription ID
- assigned at
- assigned by

### 4. Runtime Guard Helpers

Shared library helpers should answer:

- what subscription does this organization have
- what features are enabled
- does this organization have feature X

These helpers should be reusable in:

- page guards
- route handlers
- UI composition
- background processing

## Initial Feature Grouping Recommendation

To keep rollout practical, features should be grouped into a few meaningful tiers first.

### Core Recruiting

- `public_job_board`
- `candidate_profiles`
- `candidate_applications`
- `tenant_dashboard`
- `tenant_jobs`
- `tenant_candidates`
- `tenant_application_review`

### Collaboration

- `chat`
- `candidate_chat`
- `tenant_admin_management`

### Branding

- `tenant_branding`
- `custom_domain`
- `custom_email_domain`

### Intelligence

- `ats`
- `ats_recalculation`

### Governance

- `audit_logs`
- `system_analytics`

## Suggested First Release Scope

The first implementation should prioritize structural correctness over billing complexity.

Recommended phase 1:

1. Create system feature catalog.
2. Create subscription records and subscription-feature mapping.
3. Add organization-subscription assignment.
4. Gate tenant navigation and core APIs.
5. Gate ATS, chat, and domain settings.
6. Add public subscription visibility and registration selection.

Recommended phase 1 exclusions:

- billing integration
- invoices
- metering
- proration
- trial periods
- payment webhooks

## Data Model Direction

Recommended global entities:

- `subscription_feature`
- `subscription_plan`
- `subscription_plan_feature`
- `organization_subscription_assignment`

Suggested fields:

### `subscription_feature`

- `key`
- `name`
- `description`
- `status`
- `createdAt`
- `updatedAt`

### `subscription_plan`

- `id`
- `code`
- `name`
- `description`
- `visibility`
- `isActive`
- `createdAt`
- `createdBy`
- `updatedAt`
- `updatedBy`

### `subscription_plan_feature`

- `subscriptionId`
- `featureKey`
- `enabled`

### `organization_subscription_assignment`

- `organizationId`
- `subscriptionId`
- `assignedAt`
- `assignedBy`
- `source`

Possible sources:

- `public_registration`
- `super_admin_assignment`
- `migration`

## Admin UX Requirements

### System Area

The system portal should eventually include:

- feature catalog management
- subscription management
- organization subscription assignment
- subscription usage overview

### Organization Detail Area

Each organization detail page should eventually show:

- current subscription
- included features
- assignment source
- assignment timestamp

## Security Rules

- Only super admins can mutate global features and subscriptions.
- Public users can only select subscriptions marked `public`.
- Organization owners and admins cannot self-enable gated features unless future rules explicitly allow it.
- Direct URL access must not bypass subscription checks.
- Background tasks must verify feature access before executing organization-scoped work.

## Audit Requirements

The following actions should be audited:

- feature creation
- feature update
- subscription creation
- subscription update
- subscription archive
- organization subscription assignment
- organization subscription change

## Open Questions

- Should an organization ever have more than one active subscription at once, or only one effective subscription with multiple feature bundles merged before runtime?
- Should there be a default fallback public subscription for all self-registered organizations?
- Should feature gating affect candidate-facing routes immediately when a plan changes, or only for new actions after the change?
- Should suspended organizations keep their subscription assignment unchanged for later restoration?
- Should plan changes be versioned for historical audit and reporting?

## Implementation Note

This document defines the product and architecture requirements first.

Implementation should follow this order:

1. feature and subscription data model
2. super admin management flows
3. organization assignment flow
4. runtime feature-resolution helpers
5. backend enforcement
6. UI gating
7. public registration plan selection
