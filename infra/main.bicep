targetScope = 'subscription'

@description('Resource group name for the application stack.')
param resourceGroupName string = 'factnsoftware'

@description('Primary Azure region for the application resources.')
param location string = 'centralindia'

@description('Short application name used in resource naming.')
param appName string = 'cvcollector'

@description('Container image to deploy to Azure Container Apps.')
param containerImage string = ''

@secure()
@description('Application auth secret used for OTP hashing and sessions.')
param authSecret string = ''

@description('Verified sender address for Azure Communication Services Email.')
param emailSenderAddress string = ''

@description('Deploy the Container App now. Keep this false until the final image and verified sender address are ready.')
param deployContainerApp bool = false

@description('Create a Container Apps environment as part of this deployment.')
param deployContainerAppEnvironment bool = true

@description('Data residency region for Azure Communication Services Email and Communication Services.')
param communicationDataLocation string = 'India'

@description('Create an Azure-managed email domain and link it to the Communication Services resource.')
param createManagedEmailDomain bool = true

@description('Tags applied to all resources.')
param tags object = {
  app: appName
  managedBy: 'bicep'
}

var nameSuffix = uniqueString(subscription().subscriptionId, resourceGroupName, appName)
var compactAppName = toLower(replace(appName, '-', ''))
var storageAccountName = take('st${compactAppName}${nameSuffix}', 24)
var registryName = take('${compactAppName}${nameSuffix}', 50)
var containerAppName = 'ca-${appName}'
var containerAppEnvironmentName = 'cae-${appName}'
var logAnalyticsName = 'log-${appName}'
var emailServiceName = 'email-${appName}-${take(nameSuffix, 6)}'
var communicationServiceName = 'acs-${appName}-${take(nameSuffix, 6)}'

resource resourceGroup 'Microsoft.Resources/resourceGroups@2024-03-01' = {
  name: resourceGroupName
  location: location
  tags: tags
}

module appStack './modules/app-stack.bicep' = {
  name: 'deploy-${appName}'
  scope: resourceGroup
  params: {
    location: location
    storageAccountName: storageAccountName
    registryName: registryName
    logAnalyticsName: logAnalyticsName
    containerAppEnvironmentName: containerAppEnvironmentName
    containerAppName: containerAppName
    emailServiceName: emailServiceName
    communicationServiceName: communicationServiceName
    containerImage: containerImage
    authSecret: authSecret
    emailSenderAddress: emailSenderAddress
    deployContainerApp: deployContainerApp
    deployContainerAppEnvironment: deployContainerAppEnvironment
    communicationDataLocation: communicationDataLocation
    createManagedEmailDomain: createManagedEmailDomain
    tags: tags
  }
}

output resourceGroupName string = resourceGroup.name
output storageAccountName string = appStack.outputs.storageAccountName
output registryLoginServer string = appStack.outputs.registryLoginServer
output containerAppName string = appStack.outputs.containerAppName
output containerAppUrl string = appStack.outputs.containerAppUrl
output emailServiceName string = appStack.outputs.emailServiceName
output communicationServiceName string = appStack.outputs.communicationServiceName
