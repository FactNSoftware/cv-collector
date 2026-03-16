# Authentication And Access

Related docs:

- [Project Overview](../project-overview.md)
- [Candidate Experience](./candidate-experience.md)
- [Admin Operations And Audit](./admin-operations.md)

## Purpose

This feature area controls how users log in, how sessions are stored, and how the app decides whether a signed-in user should see candidate or admin pages.

## Implemented Features

- Email OTP login from `/`
- OTP delivery through Azure Communication Services Email
- Server-side session storage with `cv_session` cookie
- Shared login flow for admins and candidates
- Role-based redirects after login
- Admin-only protection for admin pages and APIs
- Candidate-only protection for candidate pages
- Logout that clears both session storage and cookie

## Main Files

- `app/page.tsx`
- `app/api/auth/otp/send/route.ts`
- `app/api/auth/otp/verify/route.ts`
- `app/api/auth/logout/route.ts`
- `lib/auth-otp.ts`
- `lib/auth-session.ts`
- `lib/auth-guards.ts`
- `lib/admin-access.ts`

## Flow

1. User enters an email on the OTP login screen.
2. The backend validates the email and sends a 6-digit OTP.
3. The OTP hash is stored in Azure Table Storage with expiry and attempt count.
4. The user submits the OTP.
5. The backend verifies the code and creates a session record.
6. The browser receives the `cv_session` cookie.
7. The app checks whether the email belongs to an admin and redirects to `/admin` or `/applications`.

## Security Rules

- OTP length is 6 digits.
- OTP expiry is 5 minutes.
- OTP verification is limited to 5 failed attempts.
- OTP values are hashed with `AUTH_SECRET`; plain codes are not stored.
- Session tokens are random 32-byte values and only their hash is stored.
- Session lifetime is 12 hours.
- The `cv_session` cookie is `httpOnly`, `sameSite=lax`, and `secure` in production.
- Admin access requires both an authenticated session and an active admin account record.

## Redirect Rules

- Unauthenticated users are redirected to `/`.
- Authenticated admins trying to open candidate pages are redirected to `/admin`.
- Authenticated candidates trying to open admin pages are redirected to `/apply`.
- Requested post-login paths are allowed only when they are internal and role-compatible.

## Admin Bootstrap

Admin creation is protected by `ADMIN_PERMISSION_TOKEN` and optional `ADMIN_PERMISSION_TOKEN_EXPIRES_AT`. Failed bootstrap attempts are rate-limited and can trigger a temporary block window.

## APIs

- `POST /api/auth/otp/send`
- `POST /api/auth/otp/verify`
- `POST /api/auth/logout`

## Dependencies

- Uses Azure Communication Services Email for OTP delivery.
- Uses Azure Table Storage for OTP and session persistence.
- Uses admin account records from [Admin Operations And Audit](./admin-operations.md).
