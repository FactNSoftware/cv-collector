# Azure Infrastructure

This folder contains the Azure infrastructure-as-code for the CV Collector deployment.

For GitHub OIDC, environment variable/secret setup, and branch deployment flow, see [docs/deployment-credentials-and-environments.md](/Users/factnsoftware/Documents/cv-collector/docs/deployment-credentials-and-environments.md).

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
- Optional Azure Container App with scale-to-zero-friendly settings (`minReplicas: 0`, `maxReplicas: 10`)
- User-assigned managed identity for ACR pulls
- Azure Communication Services resource
- Azure Email Communication Service
- Optional Azure-managed email domain linked to ACS
- Azure Service Bus namespace and OTP email queue
- AcrPull role assignment from the user-assigned identity to ACR

## Account-Safe Deployment

This project is set up so you can switch Azure accounts or subscriptions and deploy the same infrastructure cleanly.

### 1. Log in and select the right subscription

```bash
az login
az account list --output table
az account set --subscription "<subscription-name-or-id>"
```

Check the active subscription before every deploy:

```bash
az account show --output table
```

### 2. Create your own parameter file

Copy [main.example.bicepparam](/Users/factnsoftware/Documents/cv-collector/infra/main.example.bicepparam) to a real file such as `infra/main.prod.bicepparam` and replace the placeholders.

### 3. Validate before deploy

From the repo root:

```bash
infra/deploy.sh validate \
  --subscription "<subscription-name-or-id>" \
  --params infra/main.prod.bicepparam
```

### 4. Deploy

If the resource group does not exist yet:

```bash
infra/deploy.sh deploy \
  --subscription "<subscription-name-or-id>" \
  --params infra/main.prod.bicepparam \
  --create-rg
```

If the resource group already exists:

```bash
infra/deploy.sh deploy \
  --subscription "<subscription-name-or-id>" \
  --params infra/main.prod.bicepparam
```

The script:

- switches to the requested subscription
- reads `resourceGroupName` and `location` from the `.bicepparam` file
- optionally creates the resource group
- runs a subscription-scope Bicep validation or deployment

## Important Notes

- `containerImage` must point to an image that already exists in your registry.
- Set `deployContainerApp=false` for the first pass if your final image and verified sender address are not ready yet.
- `emailSenderAddress` must be a real verified sender address before you enable the Container App.
- The app creates the Blob container and Table Storage table at startup, so the template does not need to pre-create them.
- Azure Communication Services Email still has some operational steps around sender/domain usage that are easier to confirm after deployment in the portal or CLI.
- For a brand new Azure account, deploy infrastructure first, then configure GitHub OIDC and runtime secrets, then enable app deployment.
