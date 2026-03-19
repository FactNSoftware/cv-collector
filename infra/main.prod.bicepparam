using './main.bicep'

param resourceGroupName = 'factnsoftware'
param location = 'centralindia'
param appName = 'cvcollector'
param containerImage = ''
param authSecret = ''
param emailSenderAddress = ''
param deployContainerApp = false
param communicationDataLocation = 'India'
param createManagedEmailDomain = true
