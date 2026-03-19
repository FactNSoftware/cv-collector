# Deployment Credentials, GitHub Environments, and Branch Workflow

This runbook documents the current Azure/GitHub deployment setup so switching branches and rebasing does not block deployments.

## Why This Matters

Deployment success depends on two layers:

1. Git-tracked files (workflow YAML, docs, app code)
2. External configuration (GitHub environment variables/secrets, Azure app registration/federation, Azure RBAC)

A rebase only moves layer 1. Layer 2 remains in GitHub/Azure and must be created once per environment.

## Recommended Setup Order

1. Deploy or validate Azure infrastructure from `infra/`.
2. Configure GitHub Environment variables and secrets (`prod`, then `dev`).
3. Configure Azure OIDC federation subjects for each environment/branch.
4. Ensure RBAC and ACR permissions are in place.
5. Run cleanup workflow to validate OIDC and storage access.
6. Run container app deployment workflow.

### GitHub CLI Account Check

Before running `gh` commands, verify the active account:

```bash
gh auth status -h github.com
```

Switch accounts when needed:

```bash
gh auth switch --hostname github.com --user <username>
```

## Current Validated Production Setup (2026-03-19)

- Workflows:
  - `.github/workflows/azure-container-apps.yml`
  - `.github/workflows/cleanup-soft-deleted.yml`
- Both workflows support GitHub Environments through `target_environment` (`prod` or `dev`) for `workflow_dispatch`.
- Default environment for `push`/`schedule` is `prod`.
- Production OIDC app/client used by workflow:
  - App display name: `cv-collector-github-oidc-prod-rbac-20260319`
  - Client ID: `8d936992-50f7-428b-beb8-4d2a07eee687`
- Federated credentials present for production:
  - `repo:FactNSoftware/cv-collector:environment:prod`
  - `repo:FactNSoftware/cv-collector:ref:refs/heads/main`
- ACR requirement for current workflow behavior:
  - ACR admin user must be enabled because workflow runs `az acr credential show`
- RBAC verified for the production pipeline service principal:
  - `Contributor` at deployment scope
  - `AcrPush` on ACR scope

## GitHub Environment Data Model

Use GitHub environment-level configuration (not repo-level) for deploy/runtime values.

### Variables (non-secret)

- `AZURE_CLIENT_ID`
- `AZURE_TENANT_ID`
- `AZURE_SUBSCRIPTION_ID`
- `AZURE_RESOURCE_GROUP`
- `AZURE_STORAGE_ACCOUNT_NAME`
- `AZURE_COMMUNICATION_SERVICE_NAME`
- `AZURE_SERVICE_BUS_NAMESPACE_NAME`
- `AZURE_SERVICE_BUS_OTP_QUEUE_NAME`
- `AZURE_CONTAINER_REGISTRY_NAME`
- `AZURE_CONTAINER_REGISTRY_LOGIN_SERVER`
- `AZURE_CONTAINER_APP_NAME`
- `AZURE_CONTAINERAPPS_ENVIRONMENT`
- `AZURE_BLOB_CONTAINER`
- `AZURE_TABLES_TABLE_NAME`
- `APP_BASE_URL`
- `AZURE_EMAIL_SENDER_ADDRESS`
- `ADMIN_PERMISSION_TOKEN_EXPIRES_AT`
- `ATS_OPENAI_MODEL`

### Secrets

- `AUTH_SECRET`
- `ADMIN_PERMISSION_TOKEN`
- `OPENAI_API_KEY`

### URL and Sender Guidance

- `APP_BASE_URL` must be the public URL used in links sent to users.
- Trailing `/` in `APP_BASE_URL` is safe; the app trims trailing slashes.
- `AZURE_EMAIL_SENDER_ADDRESS` must be a sender that is linked/verified for your Azure Communication Services setup.

## Common GitHub Variable Update Commands

Update key runtime URLs/senders in `prod`:

```bash
gh variable set APP_BASE_URL --env prod --repo FactNSoftware/cv-collector --body "https://recruitment.factnsoftware.com"
gh variable set AZURE_EMAIL_SENDER_ADDRESS --env prod --repo FactNSoftware/cv-collector --body "donotreply@factnsoftware.com"
```

Mirror the same keys in `dev` with dev values:

```bash
gh variable set APP_BASE_URL --env dev --repo FactNSoftware/cv-collector --body "https://dev-recruitment.factnsoftware.com"
gh variable set AZURE_EMAIL_SENDER_ADDRESS --env dev --repo FactNSoftware/cv-collector --body "donotreply@factnsoftware.com"
```

## Dev Environment Setup Checklist

Create this once, then any rebased branch can deploy to dev.

1. Create GitHub environment `dev` in repository settings.
2. Add all required variables and secrets to `dev` using the exact same key names listed above.
3. Point `dev` values to dev resources (or intentionally shared resources if that is your strategy).
4. Ensure Azure OIDC app registration is valid for dev runs:
   - Add federated credential subject `repo:FactNSoftware/cv-collector:environment:dev`
   - Add federated credential subject `repo:FactNSoftware/cv-collector:ref:refs/heads/dev` (recommended)
5. Ensure RBAC is present for the service principal used by `AZURE_CLIENT_ID`:
   - `Contributor` on the target resource group (or equivalent least-privilege roles)
   - `AcrPush` on the target ACR
6. Ensure ACR admin is enabled on the target registry while workflow depends on `az acr credential show`.
7. Validate sender domain compatibility for `AZURE_EMAIL_SENDER_ADDRESS`.
8. Validate `APP_BASE_URL` points to the environment URL that users should open from email links.

## Deploy Dev Branch (Manual)

Current workflow auto-deploys on push to `main` only.
For `dev`, run workflow manually and select the dev environment.

```bash
gh workflow run azure-container-apps.yml \
  --repo FactNSoftware/cv-collector \
  --ref dev \
  -f target_environment=dev
```

Optional: validate cleanup workflow in dev too.

```bash
gh workflow run cleanup-soft-deleted.yml \
  --repo FactNSoftware/cv-collector \
  --ref dev \
  -f target_environment=dev
```

Watch run:

```bash
gh run list --workflow azure-container-apps.yml --repo FactNSoftware/cv-collector --limit 5
gh run view <run-id> --repo FactNSoftware/cv-collector
```

## Branch/Rebase Workflow

Use this pattern for rebase-safe deployments:

```bash
git checkout main
git pull --ff-only
git checkout dev
git rebase main
git push --force-with-lease
```

Then run the dev deployment workflow (`target_environment=dev`).

## Admin Access Guide

- First admin only: `POST /api/admin/register` with `ADMIN_PERMISSION_TOKEN`.
- After first admin exists: bootstrap endpoint is blocked by design.
- Ongoing admin management: use Admin Settings in the authenticated admin portal.
- Emergency/manual storage edits should be treated as break-glass operations and audited.

## Fast Validation Commands

List vars in prod/dev:

```bash
gh variable list --env prod --repo FactNSoftware/cv-collector
gh variable list --env dev --repo FactNSoftware/cv-collector
```

List secrets (names only) in prod/dev:

```bash
gh secret list --env prod --repo FactNSoftware/cv-collector
gh secret list --env dev --repo FactNSoftware/cv-collector
```

## Known Failure Signatures

- `AADSTS700016`: wrong client ID/tenant combination or app missing in tenant.
- `AADSTS7000229`: app has no service principal in the tenant.
- `AADSTS70025`: no matching federated credential subject for current GitHub token.
- `DomainNotLinked`: sender address/domain is not linked for ACS email sending.
- `Run 'az acr update -n <registry> --admin-enabled true'`: ACR admin is disabled but workflow expects ACR credentials.
