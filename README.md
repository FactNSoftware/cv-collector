# CV Collector on Azure

This is a full-stack Next.js app for OTP-protected CV submission and review.

## Project Policies

- [License](/Users/factnsoftware/Documents/cv-collector/LICENSE)
- [Security Policy](/Users/factnsoftware/Documents/cv-collector/SECURITY.md)
- [Contributing Guide](/Users/factnsoftware/Documents/cv-collector/CONTRIBUTING.md)
- [Code of Conduct](/Users/factnsoftware/Documents/cv-collector/CODE_OF_CONDUCT.md)
- [Changelog](/Users/factnsoftware/Documents/cv-collector/CHANGELOG.md)

## Ownership

- Supun Wijegunawardhana — `wgstpwijegunawardhana@gmail.com`
- Hirunika Withana — `hirunika.withana98@gmail.com`

## Recommended Azure Architecture

For the lowest practical recurring cost on Azure, use:

- Azure Container Apps Consumption for the Next.js app
- One Azure Storage account for both:
  - Blob Storage for uploaded CV PDFs
  - Table Storage for sessions, OTP records, CV metadata, and duplicate-check locks
- Azure Communication Services Email for OTP delivery

This is cheaper than the previous App Service + Cosmos DB approach for a small or bursty workload because:

- Container Apps Consumption can scale to zero
- Azure Table Storage is much cheaper than Cosmos DB for simple key/value and low-volume query patterns
- Blob Storage remains the right place for PDF files

## Environment Variables

- `AZURE_STORAGE_CONNECTION_STRING`
- `AZURE_BLOB_CONTAINER`
- `AZURE_TABLES_TABLE_NAME`
- `AZURE_COMMUNICATION_CONNECTION_STRING`
- `AZURE_EMAIL_SENDER_ADDRESS`
- `AUTH_SECRET`
- `ADMIN_PERMISSION_TOKEN`
- `ADMIN_PERMISSION_TOKEN_EXPIRES_AT`
- `OPENAI_API_KEY`
- `ATS_OPENAI_MODEL`

`AZURE_BLOB_CONNECTION_STRING` is still supported as a fallback for backward compatibility, but the preferred variable is `AZURE_STORAGE_CONNECTION_STRING`.

If `OPENAI_API_KEY` is configured, CV submissions use AI-assisted ATS extraction on the backend and store a structured scoring result for admin review. If it is not configured, the app falls back to rules-based keyword matching so submissions still work.

## Authentication And Session Flow

The app uses email OTP authentication with server-side sessions.

### Login Flow

1. user submits an email address from the login screen
2. the backend generates a `6-digit` OTP
3. the OTP is emailed through Azure Communication Services Email
4. the OTP record is stored in Azure Table Storage
5. user submits the OTP
6. backend verifies the OTP and creates a session
7. the browser receives an authenticated cookie and is redirected into the correct portal

### OTP Storage And Validation

OTP records are stored in Azure Table Storage and include:

- normalized email
- hashed OTP code
- created time
- expiry time
- failed-attempt counter

Current OTP rules:

- OTP length: `6 digits`
- OTP expiry: `5 minutes`
- maximum verify attempts per issued OTP: `5`

The OTP itself is not stored in plain text. It is hashed with the email and `AUTH_SECRET`.

### Session Storage

Sessions are server-side.

- the browser stores only the raw session token in the `cv_session` cookie
- the backend hashes that token with `AUTH_SECRET`
- the hashed token is stored in Azure Table Storage with:
  - email
  - created time
  - expiry time

If a session record is missing, malformed, or expired, it is treated as invalid and removed.

### Session Cookie

The authenticated cookie is:

- name: `cv_session`
- `httpOnly`
- `sameSite: lax`
- `secure` in production
- path: `/`

This means browser JavaScript cannot read the session token directly.

### Session Lifetime

Current session lifetime is:

- `12 hours`

This is controlled in [auth-session.ts](/Users/factnsoftware/Documents/cv-collector/lib/auth-session.ts).

### Authorization Model

There is one shared login system for both candidates and admins.

After authentication:

- candidate access uses a normal authenticated session
- admin access uses the same session plus an admin-email check

Authorization helpers are implemented in [auth-guards.ts](/Users/factnsoftware/Documents/cv-collector/lib/auth-guards.ts).

Behavior:

- unauthenticated users are redirected to `/`
- authenticated admins are redirected to `/admin`
- authenticated candidates are redirected to `/applications`
- candidates cannot access admin routes
- non-admin users receive `403` on admin APIs

### Logout

Logout does two things:

1. deletes the server-side session record from Azure Table Storage
2. clears the `cv_session` cookie in the browser

Logout is implemented in [route.ts](/Users/factnsoftware/Documents/cv-collector/app/api/auth/logout/route.ts).

## ATS Functionality

The app includes an optional ATS analysis pipeline for each job. ATS is configured per job, runs on the backend, stores its result with the application record, and is shown in the admin review experience.

### Job-Level ATS Configuration

ATS is controlled per job from the admin job editor.

- `Enable ATS analysis for this job`
- `Required ATS keywords`
- `Preferred ATS keywords`

Behavior:

- if ATS is off for a job, applications are saved without ATS analysis
- if ATS is on, required and preferred keywords are saved with the job
- ATS configuration is versioned internally through a job ATS config signature

### Submission Flow

When a candidate submits a CV for a job with ATS enabled, the flow is:

1. candidate uploads CV and submits the application
2. application is saved immediately
3. ATS work is queued in the background
4. queue worker downloads the stored CV and extracts resume text
5. backend analyzes the resume against the job ATS configuration
6. ATS result is stored on the submission record
7. admin UI refreshes and shows the final ATS result

This means CV submission is not blocked while ATS runs.

### ATS Evaluation Pipeline

The implemented backend flow is:

1. download the candidate CV from Blob Storage
2. extract text from the PDF resume
3. if `OPENAI_API_KEY` is configured, use AI-assisted analysis to normalize skills and role fit
4. if AI is unavailable or fails, fall back to deterministic rules-based scoring
5. compare extracted data against:
   - required ATS keywords
   - preferred ATS keywords
6. generate ATS result fields
7. store the ATS result with the submission

### Stored ATS Data

Each submission can store:

- `atsStatus`
- `atsScore`
- `atsMethod`
- `atsSummary`
- `atsCandidateSummary`
- `atsConfidenceNotes`
- `atsExtractedTextPreview`
- `atsNormalizedSkills`
- `atsRelevantRoles`
- `atsEducation`
- `atsYearsOfExperience`
- `atsRequiredMatched`
- `atsRequiredMissing`
- `atsPreferredMatched`
- `atsPreferredMissing`
- `atsEvaluatedAt`
- `atsConfigSignature`

### ATS Status Values

The system uses these ATS states:

- `none`
  - ATS is disabled for the job
- `queued`
  - ATS work is waiting to run
- `processing`
  - ATS evaluation is running in the background
- `success`
  - ATS completed and a scored result is stored
- `failed`
  - ATS could not complete; the application is still saved

### Admin ATS Experience

ATS results are available in admin review surfaces:

- admin candidate list
- job-specific candidate list
- admin candidate detail page

Admin behavior:

- ATS-enabled job candidate lists are sorted by highest ATS score first
- ATS filtering is available on the job candidate list
- ranking labels such as `Best match`, `Strong match`, `Qualified`, and `Needs review` are shown when ATS is enabled
- compact ATS badges are shown inline
- detailed ATS information is shown in a `View ATS` modal

### ATS Details Modal

The ATS details modal can show:

- ATS status / score
- analysis method
- candidate summary
- confidence notes
- estimated experience
- normalized skills
- relevant roles
- education
- matched required keywords
- missing required keywords
- matched preferred keywords
- missing preferred keywords
- evaluation timestamp

### Recalculate ATS

Admins can request ATS recalculation for an existing submission, but recalculation is intentionally restricted to avoid unnecessary repeated AI cost.

Rules:

- recalculation is allowed if:
  - ATS previously failed, or
  - the job ATS configuration changed after the last successful ATS result
- recalculation is blocked if:
  - ATS already succeeded, and
  - the job ATS configuration has not changed

This prevents repeated recalculation of already-valid ATS results.

### Queue and Refresh Behavior

ATS processing is queue-based.

- candidate submission saves immediately
- ATS runs in the background
- admin job candidate list auto-refreshes while any row is `queued` or `processing`
- admin candidate detail auto-refreshes while any submission is `queued` or `processing`

If ATS is still in flight, admin users can refresh manually as well and the latest status will be shown.

### Cost Control

ATS is designed to reduce unnecessary AI usage:

- ATS can be turned off per job
- if ATS is off, no ATS evaluation runs
- successful ATS results are reused
- recalculation is blocked unless the result failed or the ATS config changed
- rules-based fallback allows submissions to continue even if AI is unavailable

### Current File Support

Current ATS resume parsing support:

- PDF resumes: supported

If parsing fails:

- the application is still saved
- ATS status becomes `failed`
- admin can retry later through `Recalculate ATS` if allowed

## Local Development

1. Install dependencies:

```bash
npm install
```

2. Copy `.env.example` to `.env` and set values.

3. Run the app:

```bash
npm run dev
```

## Infrastructure As Code

The repo now includes Bicep infrastructure in [infra/main.bicep](/Users/factnsoftware/Documents/cv-collector/infra/main.bicep).

This is the preferred deployment path for this project because it creates the full Azure stack with cost-sensitive defaults:

- Resource group in `centralindia`
- Storage account for Blob + Table Storage
- Basic Azure Container Registry
- Azure Container Apps environment and app
- Azure Communication Services + Email Communication Service
- Autoscaling-friendly defaults: `minReplicas 0`, `maxReplicas 10`

Recommended flow:

```bash
az login
az account set --subscription "<subscription-name-or-id>"
infra/deploy.sh validate --subscription "<subscription-name-or-id>" --params infra/main.prod.bicepparam
infra/deploy.sh deploy --subscription "<subscription-name-or-id>" --params infra/main.prod.bicepparam --create-rg
```

Full guide: [infra/README.md](/Users/factnsoftware/Documents/cv-collector/infra/README.md)

## GitHub Actions Deployment

This repo includes [`.github/workflows/azure-container-apps.yml`](/Users/factnsoftware/Documents/cv-collector/.github/workflows/azure-container-apps.yml) for image build and deployment on pushes to `main`.

Required GitHub secrets:

- `AZURE_CLIENT_ID`
- `AZURE_TENANT_ID`
- `AZURE_SUBSCRIPTION_ID`
- `AZURE_RESOURCE_GROUP`
- `AZURE_CONTAINER_APP_NAME`
- `AZURE_CONTAINERAPP_ENVIRONMENT`
- `AZURE_CONTAINER_REGISTRY_NAME`
- `AZURE_CONTAINER_REGISTRY_LOGIN_SERVER`
- `AZURE_STORAGE_ACCOUNT_NAME`
- `AZURE_COMMUNICATION_SERVICE_NAME`
- `AZURE_EMAIL_SENDER_ADDRESS`
- `AUTH_SECRET`
- `ADMIN_PERMISSION_TOKEN`
- `ADMIN_PERMISSION_TOKEN_EXPIRES_AT`

## Notes

- The app uses Next.js standalone output and runs with `node server.js` inside the container.
- Table Storage is used only for app metadata. Uploaded PDFs stay in Blob Storage.
- For a very small workload, this is the lowest-cost Azure-first setup that still keeps the app fully managed.
- If you already have Cosmos DB Free Tier and want to keep it, you can, but it is not the default recommendation for this app anymore.

## Admin Bootstrap

Admin accounts are stored in Azure Table Storage like other app metadata.

To create the first admin account, call:

```bash
curl -X POST http://localhost:3000/api/admin/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "permissionToken": "your-ADMIN_PERMISSION_TOKEN"
  }'
```

Bootstrap is hardened as follows:

- it works only until the first admin account is created
- requests require the correct `ADMIN_PERMISSION_TOKEN`
- failed bootstrap attempts are rate-limited
- `ADMIN_PERMISSION_TOKEN_EXPIRES_AT` can be used to enforce regular token rotation
- bootstrap audit records are always attributed server-side as `system`

After the first admin signs in, authenticated admins can add other admins from the
admin portal without providing the bootstrap token again.
