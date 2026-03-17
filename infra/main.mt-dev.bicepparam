using './main.bicep'

param resourceGroupName = 'cvcollector-mt-dev-rg'
param location = 'centralindia'
param appName = 'cvcollector-mt-dev'
param containerImage = ''
param authSecret = ''
param emailSenderAddress = ''
param deployContainerApp = false
param communicationDataLocation = 'India'
param createManagedEmailDomain = true
param tags = {
  app: 'cvcollector-mt-dev'
  environment: 'mt-dev'
  managedBy: 'bicep'
  purpose: 'multi-tenancy-foundation'
}
