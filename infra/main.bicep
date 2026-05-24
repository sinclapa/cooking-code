@description('Azure region for the Static Web App')
param location string = 'westeurope'

resource storageAccount 'Microsoft.Storage/storageAccounts@2023-01-01' = {
  name: 'stcookingcode'
  location: location
  sku: { name: 'Standard_LRS' }
  kind: 'StorageV2'
  properties: {
    minimumTlsVersion: 'TLS1_2'
    supportsHttpsTrafficOnly: true
    accessTier: 'Hot'
    allowBlobPublicAccess: false
  }
}

resource staticWebApp 'Microsoft.Web/staticSites@2023-01-01' = {
  name: 'stapp-cooking-code'
  location: location
  sku: { name: 'Free', tier: 'Free' }
  properties: {}
}

@secure()
@description('Deployment token for GitHub Actions')
output deploymentToken string = staticWebApp.listSecrets().properties.apiKey

@secure()
@description('Azure Table Storage connection string')
output storageConnectionString string = 'DefaultEndpointsProtocol=https;AccountName=${storageAccount.name};AccountKey=${storageAccount.listKeys().keys[0].value};EndpointSuffix=core.windows.net'
