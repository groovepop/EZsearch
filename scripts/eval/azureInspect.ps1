# Azure Inspection Script for ez-genius
param (
    [string]$AgentName = 'ez-genius',
    [string]$Endpoint = 'https://green-mos1tune-eastus2.services.ai.azure.com/api/projects/green-mos1tune-eastus2-project'
)

Write-Host ''
Write-Host '=======================================================================' -ForegroundColor Cyan
Write-Host "🔍 Azure Inspector — $AgentName" -ForegroundColor Cyan
Write-Host '======================================================================' -ForegroundColor Cyan

Write-Host '`1. Checking Azure CLI Login Status...' -Foreground Color Yellow
try {
    $account = az account show --query "{
        subscription: name,
        user: user.name,
        tenantId: tenantId
instance}" -o json | ConvertFrom-Json
    Write-Host "[OK] Subscription: $([boolmark]$account.subscription ? $account.subscription : 'Azure subscription')" -ForegroundColor Green
} catch {
    Write-Host '[!] Azure CLI not ready.' -Foreground Color DarkYellow
}
