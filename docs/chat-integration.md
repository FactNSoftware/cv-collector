# Job Portal Chat Integration (Azure Communication Services)

## Overview

This document describes how to add real-time chat to this job portal by using Azure Communication Services (ACS) Chat.

The feature is intended for:

- candidates
- admins
- accepted applications only

Chat should become available only after an admin accepts an application. This keeps message volume controlled and keeps the feature tied to a real business event.

The current app architecture already fits this model:

- one Next.js full-stack application
- one Azure Container App
- Azure Table Storage for application and supporting records
- Azure Communication Services already used for OTP email

This means chat can be added without introducing a second backend service.

## Current App Alignment

The existing codebase already has the core acceptance workflow:

- applications have `pending | accepted | rejected`
- admins accept or reject from:
  - `/admin/jobs/[id]/candidates`
  - `/admin/candidates/[email]`
- accepted applications are already shown differently in the candidate portal

So chat should be attached to:

```text
Accepted Application -> One Chat Thread
```

Not to:

- the candidate globally
- the job globally
- all applications in one shared thread

## High-Level Architecture

```text
Next.js Container App
│
├── Frontend
│   ├── Candidate portal
│   ├── Admin portal
│   └── Chat UI
│
├── Backend (Next.js API routes)
│   ├── Accept Application API
│   ├── ACS identity/token API
│   ├── Chat thread API
│   └── Authorization rules
│
└── Azure Table Storage
    ├── Applications
    ├── ACS identity mappings
    └── Application chat mappings
```

External service:

```text
Azure Communication Services
│
├── ACS users
├── access tokens
├── chat threads
└── real-time chat events
```

## Business Rules

Chat is enabled only when:

```text
application.reviewStatus === "accepted"
```

Rules:

- one accepted application gets one chat thread
- one candidate and one admin are added as participants
- chat is not available for:
  - pending applications
  - rejected applications
  - withdrawn/deleted applications

If the accepted application already has a chat thread, the backend must reuse it instead of creating another one.

## Proposed Data Model

This app currently uses Azure Table Storage, so the chat metadata should follow that pattern.

### ACS Identity Mapping

```text
PartitionKey: chat
RowKey: acs-identity:<app-user-email>
type: acs_identity
appUserEmail
acsUserId
createdAt
updatedAt
```

Purpose:

- one ACS identity per app user
- reusable across multiple accepted applications

### Application Chat Mapping

```text
PartitionKey: chat
RowKey: application-chat:<applicationId>
type: application_chat
applicationId
jobId
jobCode
jobTitle
candidateEmail
adminEmail
chatThreadId
createdAt
updatedAt
```

Purpose:

- one chat thread per accepted application
- lets the system find the correct thread quickly

## Backend Workflow

### Accept Application

When an admin accepts an application:

1. update the application status to `accepted`
2. ensure ACS identity exists for the candidate
3. ensure ACS identity exists for the admin
4. create a chat thread if one does not already exist
5. add both participants to the thread
6. store the thread mapping in Table Storage

This should happen in the same application-review flow, but chat creation must be idempotent.

If chat creation fails:

- the application can still stay accepted
- chat status should be recoverable
- an admin should be able to retry chat provisioning later

## Required APIs

These should live in the existing Next.js backend.

### 1. Ensure Chat On Acceptance

Current review route:

```text
PATCH /api/admin/applications/{id}
```

Extend it so that on `accepted`:

- ACS identities are created or reused
- chat thread is created or reused
- chat mapping is persisted

### 2. Get Chat Token

```text
POST /api/chat/token
```

Purpose:

- return an ACS access token for the current authenticated user

Server-side checks:

- user must be authenticated
- user must have an ACS identity mapping

### 3. Get Application Chat Metadata

```text
GET /api/chat/application/{id}
```

Returns:

- `chatThreadId`
- `applicationId`
- maybe basic chat availability state

Server-side checks:

- application exists
- application is accepted
- current user belongs to the application or is an authorized admin
- returned thread must match that exact application

## Frontend Flow

### Candidate Portal

When a candidate views an accepted application:

- show `Open Chat`
- hide chat for pending/rejected applications

### Admin Portal

When an admin views an accepted candidate/application:

- show `Open Chat`

### Chat Initialization

Frontend flow:

1. fetch application chat metadata
2. fetch ACS token
3. create ACS `ChatClient`
4. get thread client
5. load messages
6. subscribe to real-time events

## Security Model

Server-side authorization is mandatory.

Never trust frontend state for chat access.

Always validate:

- authenticated session exists
- application exists
- application status is `accepted`
- current user is:
  - the candidate who owns the application, or
  - an authorized admin
- chat thread belongs to that application

Do not expose:

- ACS connection string
- ACS admin credentials
- any privileged ACS secret to the browser

Only short-lived ACS access tokens should go to the frontend.

## Token Strategy

ACS chat tokens should be generated server-side only.

Recommended approach:

- create/reuse ACS identity once per app user
- issue ACS token on demand
- keep token lifetime short
- renew on the frontend through your own backend when needed

## UI Scope For V1

Recommended first version:

- text messages only
- one thread per accepted application
- candidate and admin only
- open chat from accepted application surfaces
- no file attachments initially

This keeps cost and complexity down.

## Cost Notes

This is still a low-infrastructure design because:

- no separate chat backend service
- no websocket server to maintain yourself
- ACS handles real-time delivery
- chat only appears after acceptance, which limits usage

To keep cost low:

- enable chat only for accepted applications
- avoid attachments in V1
- reuse ACS identities
- keep one thread per application

## Operational Notes

Recommended production behavior:

- idempotent chat provisioning
- audit log entry when chat is provisioned
- audit log entry when chat provisioning fails
- retry/recover path if chat provisioning fails after acceptance

## Recommended Azure / SDK Additions

This feature will require adding ACS chat/identity SDKs to the app.

Expected packages:

- `@azure/communication-identity`
- `@azure/communication-chat`
- `@azure/communication-common`

Expected new environment variables:

- `AZURE_COMMUNICATION_CONNECTION_STRING`
  - already present for OTP email and can likely be reused if it points to the same ACS resource
- `AZURE_COMMUNICATION_ENDPOINT`
  - needed by browser chat clients

## Suggested Implementation Order

1. add ACS identity mapping storage
2. add application chat mapping storage
3. add backend helpers for:
   - ensure ACS identity
   - ensure chat thread
   - issue chat token
4. extend accepted-application flow
5. add `Open Chat` UI for accepted applications
6. add chat screen/modal
7. add audit events and retry logic

## Official References

These official references are the basis for the integration design:

- ACS Chat quickstart:
  https://learn.microsoft.com/en-us/azure/communication-services/quickstarts/chat/get-started
- ACS Identity model:
  https://learn.microsoft.com/en-us/azure/communication-services/concepts/identity-model
- ACS Chat SDK overview:
  https://learn.microsoft.com/en-us/azure/communication-services/concepts/chat/sdk-features
- ACS Identity JavaScript samples:
  https://learn.microsoft.com/en-us/samples/azure/azure-sdk-for-js/communication-identity-javascript/

## Summary

This app can support secure application-based chat without changing the overall deployment model.

Best V1 design:

- one Next.js app
- ACS handles real-time chat
- one thread per accepted application
- server-side authorization
- token issuance from backend only
- Azure Table Storage keeps business mappings

This is the simplest chat architecture that fits the current codebase cleanly.
