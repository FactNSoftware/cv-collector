# Multi-Tenancy Architecture

Related docs:

- [Project Overview](./project-overview.md)
- [Authentication And Access](./features/authentication-and-access.md)
- [Admin Operations And Audit](./features/admin-operations.md)

## Purpose

This document defines the target architecture for turning CV Collector into a multi-tenant recruiting platform where each organization manages its own workspace, branding, users, jobs, applications, and settings.

It also records the current recommendation for data isolation, role design, routing, and tenant-aware theme delivery.

## Goals

- Support multiple organizations in one deployed product
- Allow each organization to have multiple owners
- Allow owners to assign organization admins
- Introduce a global super admin role for platform operations
- Ensure all organization data is isolated by tenant context
- Allow each organization to configure product branding and theme tokens
- Keep the migration from the current single-tenant app incremental

## Target Roles

### Super Admin

Global system role.

- Manages organizations
- Can create, suspend, or recover organizations
- Can manage super admins
- Can support tenant recovery flows
- Must be audited for all cross-tenant actions

### Organization Owner

Organization-scoped role.

- Full control over one organization
- Multiple owners are allowed
- Can manage organization settings and theme
- Can assign and remove admins
- Can promote admins to owners
- Cannot remove the last remaining owner

### Organization Admin

Organization-scoped operational role.

- Manages jobs, applications, candidate review, and daily recruiting work
- Does not have unrestricted control over owner membership unless explicitly granted later

## Role Model

The access model should be split into:

- global platform access
  - `super_admin`
- organization memberships
  - `owner`
  - `admin`

This separation is cleaner than keeping one shared admin table with mixed responsibilities.

## Recommended Tenancy Model

Use a shared storage account and shared logical database, with strict tenant partitioning inside the existing Azure Table Storage model.

In practical terms, this means:

- one shared Azure Table for application entities
- one shared Azure Blob container set, but tenant-prefixed paths
- every business record carries `organizationId`
- partition keys and row keys are designed to make tenant boundaries explicit

### Why This Is The Best Fit Here

This codebase already uses:

- a single Azure Table via [`lib/azure-tables.ts`](/Users/factnsoftware/Documents/cv-collector/lib/azure-tables.ts)
- logical record scopes in libraries such as [`lib/jobs.ts`](/Users/factnsoftware/Documents/cv-collector/lib/jobs.ts), [`lib/candidate-profile.ts`](/Users/factnsoftware/Documents/cv-collector/lib/candidate-profile.ts), and [`lib/audit-log.ts`](/Users/factnsoftware/Documents/cv-collector/lib/audit-log.ts)

Moving to database-per-tenant right now would add a lot of operational complexity:

- tenant provisioning and storage creation
- connection management
- migrations across many tenant stores
- harder cross-tenant admin tooling
- more expensive support and monitoring

For the current product stage, shared storage with strong tenant partitioning is the better default.

## Alternative: Database Per Tenant

Database-per-tenant is usually better when:

- tenant count is low
- each tenant is very large
- strong contractual isolation is required
- customers demand dedicated infrastructure
- regulatory requirements force physical separation

It is not the best first move for this application because the app is still moving from single-tenant to multi-tenant and needs a simpler migration path.

## Decision

Recommended now:

- shared multi-tenant storage
- strict row-level tenant partitioning
- tenant-aware authorization on every page and API
- tenant-aware blob paths and asset access

Possible future upgrade:

- introduce dedicated storage for selected enterprise tenants if the product later needs higher isolation tiers

## Tenant Resolution

The application should resolve tenant context from organization slug in the route.

Recommended route base:

- `/o/[slug]`

Examples:

- `/o/[slug]/admin`
- `/o/[slug]/admin/settings`
- `/o/[slug]/apply`
- `/o/[slug]/jobs/[jobId]`
- `/o/[slug]/applications`

Later, custom domains can be added as an alternative tenant resolver, but slug-based routing should come first.

## Storage Strategy

### Azure Table Storage

Every tenant-owned entity must include:

- `organizationId`
- tenant-aware `partitionKey`
- tenant-aware `rowKey`

Recommended partition shape:

- `org:{organizationId}:memberships`
- `org:{organizationId}:jobs`
- `org:{organizationId}:applications`
- `org:{organizationId}:candidate-profiles`
- `org:{organizationId}:audit`
- `org:{organizationId}:chat`
- `org:{organizationId}:settings`

Recommended global partitions:

- `system:super-admins`
- `system:organizations`
- `system:auth`
- `system:bootstrap`

This keeps tenant data grouped while preserving room for global platform records.

### Azure Blob Storage

Blob paths should also be tenant-prefixed.

Examples:

- `org/{organizationId}/cvs/{submissionId}.pdf`
- `org/{organizationId}/job-assets/{assetId}`
- `org/{organizationId}/branding/logo.svg`

This allows support tooling, cleanup jobs, and access checks to stay tenant-aware.

## Core Entities

### Global Entities

- `super_admin_account`
  - `email`
  - `createdAt`
  - `createdBy`
- `organization`
  - `id`
  - `slug`
  - `name`
  - `status`
  - `createdAt`
  - `createdBy`

### Organization Entities

- `organization_membership`
  - `organizationId`
  - `email`
  - `role`
  - `createdAt`
  - `createdBy`
- `organization_theme`
  - `organizationId`
  - `appName`
  - `logoUrl`
  - `color tokens`
  - `updatedAt`
- tenant-owned business data
  - jobs
  - applications
  - chat mappings
  - audit logs
  - asset records

## Theme Delivery

The current app already uses CSS custom properties in [`app/globals.css`](/Users/factnsoftware/Documents/cv-collector/app/globals.css). That is the correct base for multi-tenant branding.

Plan:

- store theme tokens per organization
- load organization theme in the root tenant layout
- inject CSS variables server-side
- keep existing component styling based on `var(--color-...)`

This minimizes UI churn while allowing organization-level branding across the product.

## Authentication And Authorization Direction

Authentication remains shared:

- one OTP login system
- one session cookie

Authorization changes:

- session identifies the user
- tenant context is resolved from route
- access is determined by organization membership plus global super-admin role

Required guard types:

- `requireSuperAdminPageSession`
- `requireOrganizationOwnerPageSession`
- `requireOrganizationAdminPageSession`
- `requireOrganizationAccessApiSession`

Super admins should be allowed to enter organization management screens in a controlled and audited way.

## Bootstrap Direction

The existing bootstrap-token approach should be retained, but only for super admin creation.

Recommended bootstrap flow:

1. If no super admin exists, allow `SUPER_ADMIN_PERMISSION_TOKEN` bootstrap.
2. Create the first super admin.
3. After that, super admins manage other super admins and organizations in-app.

Organization owners and admins should not use token bootstrap after this. They should be created through normal organization management flows.

## Migration Strategy

Use an incremental migration path.

### Phase 1

- add super admin model
- add organization model
- add organization memberships
- add organization theme model
- add tenant-aware guards

### Phase 2

- migrate jobs to tenant-aware storage
- migrate applications and CV records
- migrate audit logs and chat state
- migrate blob paths

### Phase 3

- build system portal for super admins
- build organization settings for owners
- apply tenant-aware metadata and Open Graph assets

### Phase 4

- tenant switcher for users in multiple organizations
- support and recovery tooling
- optional enterprise isolation tiers

## Architecture Diagram

```mermaid
flowchart TD
    U[User]
    OTP[OTP Login]
    S[Session Cookie]
    R[Route Tenant Resolver<br/>slug or domain]
    A[Authorization Layer]

    subgraph Platform
      SA[Super Admin Portal<br/>/system]
      ORG[Organization Registry]
      SMA[Super Admin Accounts]
    end

    subgraph TenantWorkspace[Organization Workspace]
      OA[Owner and Admin Portal<br/>/o/[slug]/admin]
      CA[Candidate Portal<br/>/o/[slug]/applications]
      TH[Organization Theme]
      JOB[Jobs]
      APP[Applications and CVs]
      CHAT[Chat]
      AUDIT[Audit Logs]
    end

    subgraph Storage
      TAB[Azure Table Storage<br/>shared multi-tenant partitions]
      BLOB[Azure Blob Storage<br/>tenant-prefixed paths]
      ACS[Azure Communication Services]
    end

    U --> OTP
    OTP --> ACS
    OTP --> S
    U --> R
    S --> A
    R --> A
    A --> SA
    A --> OA
    A --> CA
    OA --> TH
    OA --> JOB
    OA --> APP
    OA --> CHAT
    OA --> AUDIT
    CA --> APP
    CA --> CHAT
    SA --> ORG
    SA --> SMA
    ORG --> TAB
    SMA --> TAB
    TH --> TAB
    JOB --> TAB
    APP --> TAB
    CHAT --> TAB
    AUDIT --> TAB
    APP --> BLOB
    OA --> BLOB
```

## Key Rules

- Every tenant-owned read or write must require `organizationId`.
- Every page and API must resolve tenant context before business logic runs.
- Every destructive membership change must protect against removing the last owner.
- Every super admin action affecting another tenant must be audited.
- No new feature should be added using global admin assumptions.

## Open Decisions

These can be finalized before implementation:

- whether candidate profiles remain global by email or become organization-scoped
- whether one user can hold memberships in multiple organizations at launch
- whether super admins can impersonate tenant admins or only manage via dedicated system tools
- whether custom domains are phase 1 or later

## Current Recommendation Summary

The best solution for this product now is:

- multi-tenant in one shared storage layer
- strict tenant partitioning by `organizationId`
- global super admins
- multi-owner organizations
- CSS-variable based organization theming

This is the best balance of:

- implementation speed
- operational simplicity
- migration safety
- future extensibility
