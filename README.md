# CV Collector (Azure)

This is a full-stack Next.js app (frontend + API routes) refactored for Azure services.

Current platform services:

- Azure App Service (hosting)
- Azure Cosmos DB (application data)
- Azure Blob Storage (CV files)
- Azure Communication Services Email (OTP email delivery)

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

## Required Environment Variables

- `AZURE_COSMOS_ENDPOINT`
- `AZURE_COSMOS_KEY`
- `AZURE_COSMOS_DATABASE`
- `AZURE_COSMOS_CONTAINER`
- `AZURE_BLOB_CONNECTION_STRING`
- `AZURE_BLOB_CONTAINER`
- `AZURE_COMMUNICATION_CONNECTION_STRING`
- `AZURE_EMAIL_SENDER_ADDRESS`
- `AUTH_SECRET`

## Cosmos DB Container Design

The app stores multiple document types in one container.

- Database: value from `AZURE_COSMOS_DATABASE`
- Container: value from `AZURE_COSMOS_CONTAINER`
- Partition key: `/scope`

Document scopes:

- `auth` for OTP/session documents
- `cv` for CV submissions and uniqueness lock records

## Deploy to Azure App Service

This repo includes GitHub Actions workflow `.github/workflows/azure-webapp.yml`.

### One-time Azure Setup

1. Create Azure App Service (Linux, Node 20).
2. Configure startup command:

```bash
node server.js
```

3. In App Service -> Environment variables, add all required env values.

4. Create GitHub repository secrets:

- `AZURE_CREDENTIALS`
- `AZURE_WEBAPP_NAME`

`AZURE_CREDENTIALS` should be service principal JSON with permission to deploy to the target web app.

### Deploy Flow

- Pull requests: lint + build validation.
- Push to `main`: lint + build + deploy to Azure App Service.

## Notes

- The app uses Next.js standalone output for App Service deployment packaging.
- Keep `.env` local only; `.env*` files are ignored except `.env.example`.
