# CV Collector on Azure

This is a full-stack Next.js app for OTP-protected CV submission and review.

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

`AZURE_BLOB_CONNECTION_STRING` is still supported as a fallback for backward compatibility, but the preferred variable is `AZURE_STORAGE_CONNECTION_STRING`.

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
    "permissionToken": "your-ADMIN_PERMISSION_TOKEN",
    "createdBy": "bootstrap"
  }'
```

Only requests with the correct `ADMIN_PERMISSION_TOKEN` can create admin accounts.

After the first admin signs in, authenticated admins can add other admins from the
admin portal without providing the bootstrap token again.
