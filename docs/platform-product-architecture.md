# Platform Product Architecture

Related docs:

- [Project Overview](./project-overview.md)
- [Multi-Tenancy Architecture](./multi-tenancy-architecture.md)
- [Subscriptions And Feature Access](./features/subscriptions-and-feature-access.md)
- [Authentication And Access](./features/authentication-and-access.md)
- [Candidate Experience](./features/candidate-experience.md)
- [Job Management](./features/job-management.md)
- [Application Lifecycle](./features/application-lifecycle.md)
- [ATS Evaluation](./features/ats-evaluation.md)
- [Chat And Messaging](./features/chat-and-messaging.md)
- [Admin Operations And Audit](./features/admin-operations.md)
- [Feature Security And Authorization](./features/feature-security-and-authorization.md)

## Purpose

This document defines the target product shape for the platform.

The intent is to build a product in the same general business space as workforce and hiring platforms, but with a narrower and more practical strategy:

- lower operating cost
- stronger tenant customization
- more direct user interaction
- simpler adoption path for small and mid-sized organizations
- modular subscriptions instead of one oversized package

This document is not a clone specification for any existing product.

It is a platform design based on:

- what the current system already does well
- what adjacent workforce products typically bundle
- where a lower-cost and more interactive product can differentiate

## Product Positioning

The platform should evolve into a modular workforce operations suite with a recruiting-first entry point.

Recommended product thesis:

- start with hiring because that is already implemented
- add lightweight workforce operations only where they create a strong continuity after hiring
- prioritize user interaction and operational visibility over deep enterprise back-office complexity
- package capabilities as subscriptions so customers can buy only what they need

In practical terms, the product should be:

- easier to adopt than a full HR suite
- cheaper to operate than enterprise-heavy platforms
- more conversational and collaborative than spreadsheet-driven internal tooling

## Core Product Principles

### 1. Recruiting Is The Entry Product

The current system already has:

- candidate login
- jobs
- applications
- ATS
- chat
- admin workflows
- super admin multi-tenant controls

That is the strongest foundation. The broader platform should be built outward from this layer.

### 2. Interaction Is A Product Feature

The product should not feel like a passive record system.

It should actively support:

- candidate communication
- admin collaboration
- guided workflows
- live status visibility
- task-driven operations

### 3. Subscription Boundaries Must Be Real

A feature not included in a subscription must be blocked in:

- navigation
- page rendering
- API access
- background processing

### 4. Operational Cost Must Stay Low

The architecture should avoid expensive assumptions by default.

That means:

- shared multi-tenant infrastructure first
- event-driven or opportunistic background work where possible
- simple storage models
- feature modules that can be enabled incrementally
- AI usage only where it creates real product value

## Analysis Of The Current System

The current codebase is already a strong base for the `Hire` domain.

### Current Strengths

- multi-portal foundation
- OTP-based authentication
- organization-aware routing
- super admin and tenant admin separation
- recruiting workflow already implemented
- ATS processing already implemented
- candidate-admin chat already implemented
- branding and custom-domain support already implemented
- admin audit and analytics foundation already implemented

### Current Gaps Relative To A Broader Platform

- no subscription-aware feature access
- no product packaging model
- no workflow categories beyond recruiting
- no employee lifecycle after hiring
- no team scheduling or roster model
- no leave/time tracking
- no review/performance layer
- no internal communication/task layer outside application chat

### Strategic Conclusion

The system should not jump directly into a full payroll or enterprise HR suite.

Instead, it should grow in this order:

1. hiring and recruiting platform
2. post-hire employee operations
3. engagement and retention workflows
4. only then, optional integrations into payroll or external HR systems

## Proposed Product Modules

The platform should be organized into modules rather than one monolithic app.

Recommended module families:

- `Hire`
- `Engage`
- `Manage`
- `Retain`
- `Platform Core`

## Module 1: Hire

This is the current strongest module and should remain the foundation.

### Purpose

Help organizations publish roles, receive applications, evaluate candidates, and move people to hire decisions.

### Features

- public career page
- job publishing
- candidate profiles
- application submission
- candidate pipeline
- application review
- interview stage management
- ATS scoring
- recruiter-candidate chat
- rejection and retry handling
- talent pool visibility
- hiring analytics

### Advanced Hire Features

These should exist as higher-tier or optional features:

- knockout questions
- interview scorecards
- team review workflows
- requisition approval
- talent tagging and shortlists
- bulk candidate actions
- candidate campaigns
- offer workflow

### Notes For This Codebase

Already partially implemented:

- jobs
- applications
- ATS
- candidate communication
- admin review

Needs future expansion:

- customizable pipeline stages
- job requisitions
- structured interview flows
- candidate tags and campaigns

## Module 2: Engage

This module should focus on lightweight employee interaction after hire.

### Purpose

Keep new and existing workers connected through structured communication and basic engagement workflows.

### Features

- onboarding workflow
- employee directory
- internal announcements
- employee-admin messaging
- survey and pulse check tools
- recognition and feedback
- document acknowledgment
- organization notices

### Why This Matters

A lower-cost platform can stand out by making employee interaction feel built-in instead of requiring separate tools.

This aligns with the stated goal of more user interaction.

## Module 3: Manage

This module should cover operational workforce management without turning the platform into an overbuilt ERP.

### Purpose

Support day-to-day employee operations once a candidate becomes part of the workforce.

### Features

- employee profile records
- department and team assignment
- role and employment metadata
- roster and shift scheduling
- attendance and time tracking
- leave requests and approvals
- manager approvals
- mobile-friendly self-service
- basic workforce reporting

### Features To Avoid In Early Phases

- full payroll engine
- tax rules engine
- country-specific compliance engine
- accounting-grade ledger logic

Instead, the system should prefer:

- payroll export support
- payroll integration hooks
- attendance summaries
- scheduling reports

## Module 4: Retain

This module should focus on keeping employees engaged and improving workforce continuity.

### Purpose

Provide lightweight performance and retention tooling that is practical for smaller organizations.

### Features

- review cycles
- check-ins
- goal tracking
- development plans
- performance notes
- manager feedback
- retention risk indicators
- engagement insights

### Product Differentiation Opportunity

A low-cost product can win by making retention tooling:

- easy to start
- less bureaucratic
- tightly connected to communication and workforce operations

## Module 5: Platform Core

This is the shared system layer across all product modules.

### Purpose

Provide the platform services that every module depends on.

### Features

- authentication
- sessions
- role and membership model
- organizations and tenant resolution
- branding and custom domains
- subscription and feature access
- analytics
- audit logging
- notifications
- file storage
- workflow events
- API authorization

## Proposed Packaging Strategy

The product should package modules in a way that feels familiar to buyers but remains flexible internally.

Recommended packaging direction:

### Hire

Entry recruiting package.

Includes:

- jobs
- applications
- candidate directory
- pipeline review
- basic communication

Optional upgrades:

- ATS
- requisitions
- advanced pipeline workflows
- interview tooling

### Hire Plus

Stronger recruiting package for teams with larger hiring operations.

Includes:

- all Hire features
- ATS
- advanced candidate workflows
- bulk actions
- collaborative review tools
- interview support

### Manage

Operational workforce module.

Includes:

- employee records
- roster management
- leave management
- attendance tracking
- manager approvals

### Retain

Performance and engagement module.

Includes:

- reviews
- goals
- check-ins
- feedback
- engagement insights

### Important Design Note

The product should not hard-code these commercial package names into the system model.

Internally the system should model:

- features
- subscriptions
- feature bundles

Commercial packages can then be assembled from those internal feature bundles.

## Feature Definition Framework

Each product capability should be defined as one of these categories:

### Core Access Feature

Controls whether a whole module area is available.

Examples:

- `hire_core`
- `manage_core`
- `retain_core`

### Workflow Feature

Controls whether a specific workflow exists.

Examples:

- `ats`
- `candidate_chat`
- `shift_scheduling`
- `leave_management`
- `performance_reviews`

### Enhancement Feature

Controls advanced capability within an active workflow.

Examples:

- `ats_recalculation`
- `bulk_candidate_actions`
- `advanced_pipeline_stages`
- `goal_tracking`

### Integration Feature

Controls optional connectors and external sync.

Examples:

- `payroll_exports`
- `calendar_sync`
- `email_domain`
- `custom_domain`

## Recommended Feature Catalog For This Platform

### Hire Features

- `hire_core`
- `public_job_board`
- `candidate_profiles`
- `candidate_applications`
- `candidate_pipeline`
- `interview_management`
- `candidate_chat`
- `bulk_candidate_actions`
- `knockout_questions`
- `job_requisitions`
- `ats`
- `ats_recalculation`

### Manage Features

- `manage_core`
- `employee_records`
- `team_structure`
- `shift_scheduling`
- `attendance_tracking`
- `leave_management`
- `manager_approvals`
- `mobile_self_service`

### Retain Features

- `retain_core`
- `employee_reviews`
- `goal_tracking`
- `check_ins`
- `feedback_notes`
- `engagement_surveys`

### Platform Features

- `tenant_branding`
- `custom_domain`
- `custom_email_domain`
- `tenant_admin_management`
- `audit_logs`
- `advanced_analytics`

## Architecture Direction

The architecture should be modular, tenant-aware, and feature-gated at every layer.

## Logical Architecture

### 1. Experience Layer

User-facing portals:

- public portal
- candidate portal
- tenant admin portal
- employee portal
- manager portal
- super admin system portal

This layer should only render features allowed by the organization's subscription.

### 2. Application Layer

Business workflows:

- hiring workflows
- employee operations workflows
- retention workflows
- communication workflows
- analytics workflows

This layer coordinates feature rules and domain actions.

### 3. Access And Subscription Layer

Shared runtime guard layer:

- organization resolution
- role resolution
- subscription resolution
- feature checks

This layer must be used by:

- page loaders
- route handlers
- server actions
- queue processors

### 4. Domain Layer

Domain services grouped by product module:

- recruiting domain
- workforce domain
- retention domain
- platform domain

Recommended future library split:

- `lib/recruiting/*`
- `lib/workforce/*`
- `lib/retention/*`
- `lib/platform/*`

### 5. Persistence Layer

Shared multi-tenant persistence:

- Azure Table Storage for metadata and workflow records
- Azure Blob Storage for files and documents
- optional queue/event tables for background jobs

## Tenant Architecture

Each tenant should resolve to:

- organization
- branding
- subscription
- enabled feature set

Recommended runtime resolution order:

1. resolve tenant from host or slug
2. load organization
3. load subscription assignment
4. load enabled features
5. construct runtime feature context
6. enforce feature access before rendering or mutating data

## Data Architecture

Recommended platform entities:

### Platform Core

- organizations
- organization memberships
- super admin accounts
- branding settings
- feature catalog
- subscriptions
- subscription-feature mappings
- organization-subscription assignments
- audit logs

### Hire Domain

- jobs
- applications
- pipeline stage definitions
- interview records
- requisitions
- candidate conversations

### Manage Domain

- employee records
- teams
- schedules
- shifts
- attendance records
- leave requests

### Retain Domain

- review cycles
- review templates
- review submissions
- goals
- check-ins
- survey responses

## Enforcement Architecture

Feature access must be enforced in four places.

### UI

Hide unavailable navigation, pages, cards, forms, buttons, and actions.

### Route Guards

Reject access to gated pages even if the URL is visited directly.

### APIs

Reject requests for gated capabilities even if the client bypasses the UI.

### Background Jobs

Do not process gated workflows for organizations without the required feature.

Examples:

- no `ats` means do not queue ATS jobs
- no `candidate_chat` means do not provision chat
- no `shift_scheduling` means no schedule mutation APIs or pages

## Interaction Architecture

Because user interaction is a core differentiator, the platform should use a shared interaction model across modules.

Recommended interaction primitives:

- threaded conversations
- task and approval items
- activity feeds
- notifications
- comments on workflow objects
- status changes with visible history

This allows the product to feel consistent across:

- hiring
- scheduling
- leave approvals
- reviews

## Low-Cost Architecture Strategy

To stay low cost, the platform should prefer:

- shared multi-tenant infrastructure
- modular feature rollout
- async processing only for expensive workflows
- AI usage only in high-value areas like ATS or summarization
- reuse of shared UI patterns and shared authorization helpers

The platform should avoid early investment in:

- country-specific payroll engines
- heavy workflow engines
- enterprise compliance modules before real demand
- module duplication across portals

## Recommended Implementation Phases

### Phase 1: Product Foundation

- feature catalog
- subscription model
- organization subscription assignment
- runtime feature enforcement
- Hire package definition

### Phase 2: Hire Expansion

- advanced pipeline stages
- interview workflows
- knockout questions
- requisitions
- stronger analytics

### Phase 3: Manage Foundation

- employee records
- scheduling
- leave
- attendance

### Phase 4: Retain Foundation

- review cycles
- goal tracking
- check-ins
- engagement workflows

### Phase 5: Integrations

- payroll exports
- calendar sync
- communication integrations
- reporting exports

## Strategic Recommendation

The platform should be built as:

- a recruiting-first multi-tenant SaaS
- with modular workforce operations added around it
- using subscription-gated features
- and a strong interaction layer as the main differentiator

The first commercial story should be:

- affordable hiring platform
- customizable by tenant
- collaborative by default
- extensible into workforce management over time

That is a much stronger fit for this system than trying to immediately replicate a full enterprise workforce suite.
