using './main.bicep'

param resourceGroupName = 'cvcollector-mt-dev-south-rg'
param location = 'southindia'
param appName = 'cvcollector-mt-dev'
param containerImage = ''
param authSecret = ''
param emailSenderAddress = ''
param deployContainerApp = false
param deployContainerAppEnvironment = false
param communicationDataLocation = 'India'
param createManagedEmailDomain = true
param tags = {
  app: 'cvcollector-mt-dev'
  environment: 'mt-dev'
  managedBy: 'bicep'
  purpose: 'multi-tenancy-foundation'
}
