@description('Azure region for the Static Web App')
param location string = 'westeurope'

resource staticWebApp 'Microsoft.Web/staticSites@2023-01-01' = {
  name: 'stapp-cooking-code'
  location: location
  sku: {
    name: 'Free'
    tier: 'Free'
  }
  properties: {}
}

@secure()
@description('Deployment token for GitHub Actions')
output deploymentToken string = staticWebApp.listSecrets().properties.apiKey
