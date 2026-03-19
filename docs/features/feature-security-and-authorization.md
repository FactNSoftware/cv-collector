# Feature Security And Authorization

Related docs:

- [Project Overview](../project-overview.md)
- [Platform Product Architecture](../platform-product-architecture.md)
- [Authentication And Access](./authentication-and-access.md)
- [Subscriptions And Feature Access](./subscriptions-and-feature-access.md)
- [Admin Operations And Audit](./admin-operations.md)

## Purpose

This document defines the security strategy for feature-based authorization across pages, APIs, background jobs, and UI.

The platform will be implemented feature by feature over time. Because of that, authorization must not depend on ad hoc route checks or one-off conditions.

Instead, every present or future capability should follow one system:

- define the feature
- classify its status
- map it to permissions and subscription access
- enforce it in UI and backend
- keep upcoming features documented but disabled until implemented

This is the foundation that allows the product to grow safely without rewriting access control every time a new module is added.

## Core Principle

Authorization should be based on stable capability keys, not page names.

The main unit of access control should be:

- `feature`

Each feature can contain:

- one or more user-facing functionalities
- one or more API operations
- one or more background jobs
- one or more navigation or settings entry points

Example:

- feature: `chat`
- functionalities:
  - admin chat inbox
  - candidate chat inbox
  - accepted application thread access
  - message moderation
- protected APIs:
  - chat token issuance
  - thread access lookups
  - read state updates
  - moderation actions

## Why This Strategy Is Needed

The product direction already includes modular subscriptions and future modules such as:

- Hire
- Engage
- Manage
- Retain

Not all of them will be implemented at the same time.

To keep the platform predictable:

- implemented features must be enforceable immediately
- planned features must be documentable before code exists
- incomplete features must stay hidden and blocked
- organization-level access must be easy to reason about

## Feature Model

Each feature should be registered in a global feature catalog.

Recommended feature fields:

- `key`
- `name`
- `module`
- `category`
- `description`
- `status`
- `visibility`
- `defaultAccess`
- `securityLevel`
- `dependencies`
- `functionalities`
- `protectedRoutes`
- `protectedApis`
- `protectedJobs`

### Field Definitions

#### `key`

Stable machine-readable identifier.

Examples:

- `tenant_jobs`
- `tenant_candidates`
- `ats`
- `chat`
- `custom_domain`
- `employee_directory`
- `time_tracking`

#### `module`

Top-level business module.

Examples:

- `hire`
- `engage`
- `manage`
- `retain`
- `platform_core`

#### `category`

Grouping used for product planning and admin management.

Examples:

- `core`
- `communication`
- `automation`
- `branding`
- `analytics`
- `workforce_operations`

#### `status`

Implementation lifecycle state.

Recommended values:

- `implemented`
- `beta`
- `planned`
- `upcoming`
- `deprecated`
- `internal_only`

Meaning:

- `implemented`: production feature that can be assigned and enforced
- `beta`: usable with controlled rollout and explicit warnings
- `planned`: approved in architecture but not yet available for customers
- `upcoming`: visible in roadmap documentation but not assignable yet
- `deprecated`: still supported temporarily but being removed
- `internal_only`: system or operational feature not for customer selection

#### `visibility`

How the feature appears in subscription management.

Recommended values:

- `public`
- `private`
- `internal`

#### `defaultAccess`

How access behaves before explicit plan assignment.

Recommended values:

- `none`
- `included_by_default`
- `system_required`

#### `securityLevel`

Risk level used to define enforcement strictness.

Recommended values:

- `low`
- `standard`
- `sensitive`
- `critical`

Examples:

- `tenant_dashboard`: `low`
- `chat`: `standard`
- `tenant_admin_management`: `sensitive`
- `billing_management`: `critical`

#### `dependencies`

Other features required before this one can be enabled.

Examples:

- `ats_recalculation` depends on `ats`
- `candidate_chat` depends on `chat`
- `custom_email_domain` depends on `tenant_branding`

#### `functionalities`

Human-readable list of actual behaviors covered by the feature.

This is important because a feature is broader than one button or route.

Example for `tenant_jobs`:

- list jobs
- create job
- edit job
- preview job
- publish or unpublish job
- soft delete job

## Feature Lifecycle Strategy

The platform should support feature-by-feature implementation without exposing incomplete functionality.

### Implemented Features

Implemented features:

- may be included in subscriptions
- may render UI
- may expose APIs
- must have backend authorization

### Upcoming Features

Upcoming features:

- should be documented in the feature catalog
- should appear in planning docs and super admin planning views if needed
- must not be active for tenants
- must not expose navigation
- must not expose public or tenant APIs

This allows product planning before engineering delivery.

### Beta Features

Beta features:

- should still use the same authorization path
- may require feature flags in addition to subscription access
- should be assignable only intentionally

### Deprecated Features

Deprecated features:

- may remain readable temporarily
- should block new enablement where possible
- should have an explicit migration path

## Separation Of Concerns

The system should keep these concepts separate:

- authentication: who the user is
- role authorization: what role the user has
- tenant authorization: which organization the request belongs to
- feature authorization: which capabilities that organization can use
- action authorization: whether the specific operation is allowed

Example:

An authenticated tenant admin may still be denied because:

- their organization does not have the `ats` feature
- the feature is still `upcoming`
- the API operation requires owner-level permission

## Authorization Layers

Every feature should be enforced at multiple layers.

UI hiding alone is not security.

### 1. Navigation Layer

Do not show navigation items for unavailable features.

Examples:

- hide ATS menu if `ats` is unavailable
- hide custom domain settings if `custom_domain` is unavailable
- hide employee directory if `employee_directory` is unavailable

### 2. Page Access Layer

Page loaders and layouts should validate feature availability before rendering the page.

If unauthorized:

- return `notFound()` for hidden modules when discovery should be minimized
- or return an explicit forbidden state for known authenticated users

### 3. Component Action Layer

Buttons, forms, and action panels should be hidden or disabled when the feature is unavailable.

This improves UX but is not the final security boundary.

### 4. API Layer

Every route handler and server action for a gated capability must check feature access before doing work.

This is the real protection against:

- direct HTTP requests
- stale client state
- hidden-UI bypass attempts

### 5. Background Job Layer

Workers, queue processors, cron routines, and async tasks must check feature access before execution.

Examples:

- ATS queue processing must stop if `ats` is disabled
- chat provisioning must stop if `chat` is disabled
- future survey or employee review jobs must stop if the feature is unavailable

### 6. Data Access Layer

Where possible, core domain functions should accept a resolved authorization context rather than raw tenant identifiers alone.

That reduces the chance of calling privileged operations without checks.

## API-Level Security Strategy

Every protected API should authorize in this order:

1. authenticate session
2. resolve actor and role
3. resolve tenant or system scope
4. resolve effective subscription and feature set
5. validate feature status
6. validate action permission
7. execute domain logic
8. write audit event when needed

Recommended decision model:

- `401` when unauthenticated
- `403` when authenticated but forbidden
- `404` when resource existence should be concealed
- `409` when feature state or dependency prevents the action

### API Guard Shape

Recommended internal guard contract:

```ts
type AuthorizationContext = {
  actorId: string;
  actorType: "candidate" | "tenant_admin" | "tenant_owner" | "super_admin" | "system";
  organizationId?: string;
  features: Set<string>;
  permissions: Set<string>;
};

type FeatureRequirement = {
  feature: string;
  action?: string;
  allowStatuses?: Array<"implemented" | "beta">;
};
```

Recommended helper pattern:

```ts
await requireAuthenticatedSession();
const context = await resolveAuthorizationContext(request);
await requireFeatureAccess(context, {
  feature: "ats",
  action: "recalculate",
  allowStatuses: ["implemented", "beta"],
});
```

The exact implementation can change, but the pattern should stay consistent.

## Permission Strategy

Features and permissions should not be treated as the same thing.

Recommended model:

- feature = whether the organization owns the capability
- permission = whether the actor may perform a specific action inside that capability

Example:

- feature: `tenant_admin_management`
- permissions:
  - `admin_accounts.read`
  - `admin_accounts.create`
  - `admin_accounts.update`
  - `admin_accounts.transfer_owner`

This keeps authorization flexible:

- a subscription can allow the feature
- a role model can still limit which users act within it

## Security Levels By Feature Type

Security strategy should be standardized by feature class.

### Low

For read-mostly or display-oriented features.

Requirements:

- page guard
- API check where applicable

Examples:

- dashboard cards
- read-only analytics summaries

### Standard

For normal operational features.

Requirements:

- page guard
- API guard
- subscription enforcement
- audit when state changes

Examples:

- job management
- candidate communication
- leave requests

### Sensitive

For tenant governance, identity, or configuration.

Requirements:

- page guard
- API guard
- stricter role check
- audit trail mandatory
- ownership checks where relevant

Examples:

- admin management
- domain settings
- branding changes
- employee records

### Critical

For billing, security, legal, or destructive operations.

Requirements:

- explicit permission
- audit trail mandatory
- confirmation workflow where relevant
- ownership or super admin restriction
- stronger monitoring

Examples:

- subscription reassignment
- billing changes
- hard deletes
- root ownership transfer

## Planning Rules For Upcoming Features

Future modules should still be captured before implementation.

Recommended rules:

- every planned feature gets a catalog entry
- every planned feature lists intended functionalities
- every planned feature lists expected APIs and security level
- every planned feature defaults to non-assignable until implemented

This lets product and engineering discuss the same feature boundaries early.

Example upcoming entries:

- `employee_reviews`
- `goal_tracking`
- `time_tracking`
- `leave_management`
- `shift_scheduling`
- `surveys`
- `announcements`

## Recommended Catalog Structure

The platform should maintain one central feature registry that can later be backed by storage.

Recommended shape:

```ts
type FeatureCatalogRecord = {
  key: string;
  name: string;
  module: string;
  category: string;
  description: string;
  status: "implemented" | "beta" | "planned" | "upcoming" | "deprecated" | "internal_only";
  visibility: "public" | "private" | "internal";
  defaultAccess: "none" | "included_by_default" | "system_required";
  securityLevel: "low" | "standard" | "sensitive" | "critical";
  dependencies: string[];
  functionalities: string[];
  protectedRoutes: string[];
  protectedApis: string[];
  protectedJobs: string[];
};
```

This record is useful even before full subscription management is implemented.

## Recommended Enforcement Order In Code

When a new feature is added, the implementation order should be:

1. define catalog entry
2. define feature status and security level
3. define required permissions
4. define subscription mapping
5. add page guard
6. add API guard
7. add background-job guard if relevant
8. hide gated UI
9. add audit logging for sensitive actions
10. add tests for allowed and denied access

This prevents shipping visible UI before backend protection exists.

## Route And API Design Guidance

New routes and APIs should be designed so feature enforcement remains simple.

Recommended rules:

- keep route ownership clear by module
- avoid one endpoint that mixes unrelated features
- prefer APIs that map to one capability boundary
- do not bypass service-layer authorization for convenience

Bad pattern:

- one endpoint that updates branding, domains, billing, and admins together

Better pattern:

- separate endpoints for each capability family

This makes feature-level authorization and auditing much easier.

## Audit Requirements

Audit logging should be mandatory for:

- subscription changes
- feature assignment changes
- sensitive settings changes
- admin or owner role mutations
- destructive actions

Audit events should include:

- actor
- tenant
- feature key
- action
- target record
- result
- timestamp

## UI Strategy For Unavailable Features

There are three valid presentation modes.

### Hidden

Best for features the tenant should not know about yet.

### Visible But Locked

Best for upgradeable features in product-marketing contexts.

### Visible As Upcoming

Best for roadmap or internal super admin planning views.

Rules:

- tenant runtime should default to hidden unless there is a deliberate upsell reason
- system planning interfaces may show `upcoming` features
- APIs must remain blocked in all cases if the feature is not active

## Architecture Outcome

If this strategy is followed, the platform gains:

- one authorization model for all modules
- safe feature-by-feature rollout
- clean separation between product planning and runtime availability
- reusable API protection
- easier future subscription management
- clearer audit and compliance boundaries

## Recommended Next Implementation Phase

The first implementation phase should create:

1. a central feature catalog
2. feature status support
3. subscription-to-feature mapping
4. organization effective feature resolution
5. shared page and API guard helpers
6. initial enforcement for existing implemented features

Until then, this document should be treated as the source of truth for adding new features securely.
