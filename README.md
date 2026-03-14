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

## Azure Deployment

### 1. Create a resource group

```bash
az group create --name rg-cv-collector --location eastus
```

### 2. Create a storage account

```bash
az storage account create \
  --name <globally-unique-storage-name> \
  --resource-group rg-cv-collector \
  --location eastus \
  --sku Standard_LRS \
  --kind StorageV2
```

Get the connection string:

```bash
az storage account show-connection-string \
  --name <globally-unique-storage-name> \
  --resource-group rg-cv-collector \
  --query connectionString \
  --output tsv
```

### 3. Create Azure Communication Services

```bash
az communication create \
  --name cvcollector-comms \
  --resource-group rg-cv-collector \
  --location global
```

Then create or connect an Email Communication resource and verify a sender domain in the Azure portal. This step is still partly portal-driven because domain verification requires DNS records.

### 4. Create Azure Container Registry

```bash
az acr create \
  --name <globally-unique-acr-name> \
  --resource-group rg-cv-collector \
  --location eastus \
  --sku Basic
```

### 5. Create a Container Apps environment

```bash
az extension add --name containerapp --upgrade

az containerapp env create \
  --name cae-cv-collector \
  --resource-group rg-cv-collector \
  --location eastus
```

### 6. Build and push the image

```bash
az acr build \
  --registry <globally-unique-acr-name> \
  --image cv-collector:initial \
  .
```

### 7. Create the Container App

```bash
az containerapp create \
  --name cv-collector \
  --resource-group rg-cv-collector \
  --environment cae-cv-collector \
  --image <globally-unique-acr-name>.azurecr.io/cv-collector:initial \
  --target-port 3000 \
  --ingress external \
  --registry-server <globally-unique-acr-name>.azurecr.io \
  --registry-identity system \
  --cpu 0.25 \
  --memory 0.5Gi \
  --min-replicas 0 \
  --max-replicas 1
```

Assign AcrPull to the container app managed identity:

```bash
APP_PRINCIPAL_ID=$(az containerapp show \
  --name cv-collector \
  --resource-group rg-cv-collector \
  --query identity.principalId \
  --output tsv)

ACR_ID=$(az acr show \
  --name <globally-unique-acr-name> \
  --resource-group rg-cv-collector \
  --query id \
  --output tsv)

az role assignment create \
  --assignee "$APP_PRINCIPAL_ID" \
  --role AcrPull \
  --scope "$ACR_ID"
```

Set app secrets and environment variables:

```bash
az containerapp secret set \
  --name cv-collector \
  --resource-group rg-cv-collector \
  --secrets \
    storage-connection="<storage-connection-string>" \
    comms-connection="<communication-connection-string>" \
    auth-secret="<long-random-secret>"

az containerapp update \
  --name cv-collector \
  --resource-group rg-cv-collector \
  --set-env-vars \
    AZURE_STORAGE_CONNECTION_STRING=secretref:storage-connection \
    AZURE_BLOB_CONTAINER=cv-files \
    AZURE_TABLES_TABLE_NAME=cvcollector \
    AZURE_COMMUNICATION_CONNECTION_STRING=secretref:comms-connection \
    AZURE_EMAIL_SENDER_ADDRESS=DoNotReply@your-verified-domain.azurecomm.net \
    AUTH_SECRET=secretref:auth-secret
```

## Infrastructure As Code

The repo now includes Bicep infrastructure in [infra/main.bicep](/Users/factnsoftware/Documents/cv-collector/infra/main.bicep).

This is the preferred deployment path for this project because it creates the full Azure stack with cost-sensitive defaults:

- Resource group in `centralindia`
- Storage account for Blob + Table Storage
- Basic Azure Container Registry
- Azure Container Apps environment and app
- Azure Communication Services + Email Communication Service

Deployment guide: [infra/README.md](/Users/factnsoftware/Documents/cv-collector/infra/README.md)

## GitHub Actions Deployment

This repo includes [`.github/workflows/azure-container-apps.yml`](/Users/factnsoftware/Documents/cv-collector/.github/workflows/azure-container-apps.yml) for image build and deployment on pushes to `main`.

Required GitHub secrets:

- `AZURE_CREDENTIALS`
- `AZURE_RESOURCE_GROUP`
- `AZURE_CONTAINER_APP_NAME`
- `AZURE_CONTAINER_REGISTRY_NAME`
- `AZURE_CONTAINER_REGISTRY_LOGIN_SERVER`
- `AZURE_CONTAINER_REGISTRY_USERNAME`
- `AZURE_CONTAINER_REGISTRY_PASSWORD`

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
