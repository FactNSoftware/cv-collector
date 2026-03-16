# Chat And Messaging

Related docs:

- [Application Lifecycle](./application-lifecycle.md)
- [Admin Operations And Audit](./admin-operations.md)
- [Chat Integration Design](../chat-integration.md)

## Purpose

This feature area provides secure application-specific chat between admins and candidates after an application has been accepted.

## Implemented Features

- Azure Communication Services chat identity provisioning
- One chat thread per accepted application
- Candidate and admin inbox views
- Application-specific chat pages
- Token issuance for the signed-in requester
- Read-state tracking
- Unread indicators in inboxes and candidate apply/history screens
- Typing and presence indicators in the chat workspace
- Message editing and deletion in the UI
- Moderation-backed deleted message tracking
- Archived chat handling when access is no longer active

## Availability Rules

- Chat is only available for accepted applications.
- Access is scoped to the accepted application.
- Candidate access is limited to their own application.
- Admin access requires an admin session.

## Chat Flow

1. An admin accepts an application.
2. The backend attempts to provision a chat thread for that application.
3. Both participants get ACS identities if needed.
4. The app stores the mapping between application ID and ACS thread ID.
5. Users open inbox or application chat pages.
6. The client requests an ACS token from the backend and connects to the thread.

## Main Pages

- `/applications/chat`
- `/applications/chat/[id]`
- `/admin/chat`
- `/admin/chat/[id]`
- `/admin/chat/user/[email]`

## APIs

- `GET /api/chat/inbox`
- `POST /api/chat/token`
- `GET /api/chat/application/[id]`
- `POST /api/chat/application/[id]`
- `DELETE /api/chat/application/[id]`
- `DELETE /api/chat/user/[email]`

## State Stored In Table Storage

- ACS identity mappings
- application-to-thread mappings
- per-requester read state
- moderated/deleted message markers

## UI Notes

The chat workspace supports:

- message list loading and refresh
- send, edit, and delete actions
- seen/read indicators
- typing indicator display
- retry handling for transient ACS errors

## Main Files

- `lib/acs-chat.ts`
- `lib/chat-view-model.ts`
- `app/components/ChatInboxPortal.tsx`
- `app/components/ApplicationChatWorkspace.tsx`
- `app/api/chat/inbox/route.ts`
- `app/api/chat/token/route.ts`
- `app/api/chat/application/[id]/route.ts`
- `app/api/chat/user/[email]/route.ts`
