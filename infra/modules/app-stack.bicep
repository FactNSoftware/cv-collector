targetScope = 'resourceGroup'

@description('Primary Azure region for the application resources.')
param location string

@description('Globally unique storage account name.')
param storageAccountName string

@description('Globally unique Azure Container Registry name.')
param registryName string

@description('Log Analytics workspace name.')
param logAnalyticsName string

@description('Container Apps environment name.')
param containerAppEnvironmentName string

@description('Container App name.')
param containerAppName string

@description('User-assigned managed identity name for registry pulls.')
param containerRegistryIdentityName string = 'id-registry-pull'

@description('Email Communication Service resource name.')
param emailServiceName string

@description('Communication Services resource name.')
param communicationServiceName string

@description('Container image to deploy.')
param containerImage string = ''

@secure()
@description('Application auth secret used for OTP hashing and sessions.')
param authSecret string = ''

@description('Verified sender address for Azure Communication Services Email.')
param emailSenderAddress string = ''

@description('Deploy the Container App now. Keep this false until the final image and verified sender address are ready.')
param deployContainerApp bool = false

@description('Data residency region for Azure Communication Services Email and Communication Services.')
param communicationDataLocation string

@description('Create an Azure-managed email domain and link it to the Communication Services resource.')
param createManagedEmailDomain bool = true

@description('Tags applied to all resources.')
param tags object = {}

var managedEmailDomainName = 'AzureManagedDomain'
var containerCpu = json('0.25')
var containerMemory = '0.5Gi'
var storageConnectionString = 'DefaultEndpointsProtocol=https;AccountName=${storageAccount.name};AccountKey=${storageAccount.listKeys().keys[0].value};EndpointSuffix=${environment().suffixes.storage}'
var communicationConnectionString = communicationService.listKeys().primaryConnectionString

resource storageAccount 'Microsoft.Storage/storageAccounts@2023-05-01' = {
  name: storageAccountName
  location: location
  sku: {
    name: 'Standard_LRS'
  }
  kind: 'StorageV2'
  tags: union(tags, {
    service: 'storage'
  })
  properties: {
    accessTier: 'Hot'
    allowBlobPublicAccess: false
    allowSharedKeyAccess: true
    minimumTlsVersion: 'TLS1_2'
    publicNetworkAccess: 'Enabled'
    supportsHttpsTrafficOnly: true
  }
}

resource registry 'Microsoft.ContainerRegistry/registries@2023-07-01' = {
  name: registryName
  location: location
  sku: {
    name: 'Basic'
  }
  tags: union(tags, {
    service: 'acr'
  })
  properties: {
    adminUserEnabled: false
    publicNetworkAccess: 'Enabled'
  }
}

resource containerRegistryIdentity 'Microsoft.ManagedIdentity/userAssignedIdentities@2023-01-31' = {
  name: containerRegistryIdentityName
  location: location
  tags: union(tags, {
    service: 'managed-identity'
  })
}

resource workspace 'Microsoft.OperationalInsights/workspaces@2022-10-01' = {
  name: logAnalyticsName
  location: location
  tags: union(tags, {
    service: 'log-analytics'
  })
  properties: {
    features: {
      disableLocalAuth: false
      enableLogAccessUsingOnlyResourcePermissions: true
    }
    publicNetworkAccessForIngestion: 'Enabled'
    publicNetworkAccessForQuery: 'Enabled'
    retentionInDays: 30
    sku: {
      name: 'PerGB2018'
    }
  }
}

resource containerAppEnvironment 'Microsoft.App/managedEnvironments@2024-03-01' = {
  name: containerAppEnvironmentName
  location: location
  tags: union(tags, {
    service: 'container-apps-environment'
  })
  properties: {
    appLogsConfiguration: {
      destination: 'log-analytics'
      logAnalyticsConfiguration: {
        customerId: workspace.properties.customerId
        sharedKey: workspace.listKeys().primarySharedKey
      }
    }
  }
}

resource emailService 'Microsoft.Communication/emailServices@2023-04-01' = {
  name: emailServiceName
  location: 'global'
  tags: union(tags, {
    service: 'email'
  })
  properties: {
    dataLocation: communicationDataLocation
  }
}

resource managedEmailDomain 'Microsoft.Communication/emailServices/domains@2023-04-01' = if (createManagedEmailDomain) {
  parent: emailService
  name: managedEmailDomainName
  location: 'global'
  tags: union(tags, {
    service: 'email-domain'
  })
  properties: {
    domainManagement: 'AzureManaged'
    userEngagementTracking: 'Disabled'
  }
}

resource communicationService 'Microsoft.Communication/communicationServices@2023-04-01' = {
  name: communicationServiceName
  location: 'global'
  tags: union(tags, {
    service: 'communication'
  })
  properties: {
    dataLocation: communicationDataLocation
    linkedDomains: createManagedEmailDomain ? [
      managedEmailDomain.id
    ] : []
  }
}

resource acrPullRoleAssignment 'Microsoft.Authorization/roleAssignments@2022-04-01' = if (deployContainerApp) {
  name: guid(resourceGroup().id, registry.id, containerRegistryIdentity.id, 'AcrPull')
  scope: registry
  properties: {
    principalId: containerRegistryIdentity.properties.principalId
    principalType: 'ServicePrincipal'
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', '7f951dda-4ed3-4680-a7ca-43fe172d538d')
  }
}

resource containerApp 'Microsoft.App/containerApps@2024-03-01' = if (deployContainerApp) {
  name: containerAppName
  location: location
  identity: {
    type: 'SystemAssigned,UserAssigned'
    userAssignedIdentities: {
      '${containerRegistryIdentity.id}': {}
    }
  }
  tags: union(tags, {
    service: 'container-app'
  })
  properties: {
    managedEnvironmentId: containerAppEnvironment.id
    configuration: {
      activeRevisionsMode: 'Single'
      ingress: {
        allowInsecure: false
        external: true
        targetPort: 3000
        transport: 'auto'
      }
      registries: [
        {
          server: registry.properties.loginServer
          identity: containerRegistryIdentity.id
        }
      ]
      secrets: [
        {
          name: 'auth-secret'
          value: authSecret
        }
        {
          name: 'storage-connection'
          value: storageConnectionString
        }
        {
          name: 'communication-connection'
          value: communicationConnectionString
        }
      ]
    }
    template: {
      containers: [
        {
          name: 'web'
          image: containerImage
          env: [
            {
              name: 'NODE_ENV'
              value: 'production'
            }
            {
              name: 'AZURE_STORAGE_CONNECTION_STRING'
              secretRef: 'storage-connection'
            }
            {
              name: 'AZURE_BLOB_CONTAINER'
              value: 'cv-files'
            }
            {
              name: 'AZURE_TABLES_TABLE_NAME'
              value: 'cvcollector'
            }
            {
              name: 'AZURE_COMMUNICATION_CONNECTION_STRING'
              secretRef: 'communication-connection'
            }
            {
              name: 'AZURE_EMAIL_SENDER_ADDRESS'
              value: emailSenderAddress
            }
            {
              name: 'AUTH_SECRET'
              secretRef: 'auth-secret'
            }
          ]
          resources: {
            cpu: containerCpu
            memory: containerMemory
          }
        }
      ]
      scale: {
        minReplicas: 0
        maxReplicas: 1
      }
    }
  }
  dependsOn: [
    acrPullRoleAssignment
  ]
}

output storageAccountName string = storageAccount.name
output registryLoginServer string = registry.properties.loginServer
output containerAppName string = deployContainerApp ? containerApp.name : ''
output containerAppUrl string = deployContainerApp ? 'https://${containerApp!.properties.configuration.ingress.fqdn}' : ''
output emailServiceName string = emailService.name
output communicationServiceName string = communicationService.name
