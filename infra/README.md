# Azure Infrastructure

This folder contains the Azure infrastructure-as-code for the CV Collector deployment.

## Why Bicep

- Azure-native and smaller operational surface than Terraform for this stack
- Works directly with `az deployment`
- Easier to keep aligned with Azure Container Apps, ACS Email, and role assignments

## What It Creates

- Resource group
- Storage account for Blob Storage and Table Storage
- Azure Container Registry Basic
- Log Analytics workspace
- Azure Container Apps environment
- Optional Azure Container App with scale-to-zero-friendly settings
- User-assigned managed identity for ACR pulls
- Azure Communication Services resource
- Azure Email Communication Service
- Optional Azure-managed email domain linked to ACS
- AcrPull role assignment from the user-assigned identity to ACR

## Deploy

1. Copy [main.example.bicepparam](/Users/factnsoftware/Documents/cv-collector/infra/main.example.bicepparam) to a real parameter file and replace the placeholders.

2. Deploy from the repo root:

```bash
az deployment sub create \
  --location centralindia \
  --template-file infra/main.bicep \
  --parameters @infra/main.example.bicepparam
```

## Important Notes

- `containerImage` must point to an image that already exists in your registry.
- Set `deployContainerApp=false` for the first pass if your final image and verified sender address are not ready yet.
- `emailSenderAddress` must be a real verified sender address before you enable the Container App.
- The app creates the Blob container and Table Storage table at startup, so the template does not need to pre-create them.
- Azure Communication Services Email still has some operational steps around sender/domain usage that are easier to confirm after deployment in the portal or CLI.
