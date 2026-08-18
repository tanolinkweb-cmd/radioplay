# Legado: redireciona para o fluxo permanente.
# Setup uma vez: .\setup-deploy.ps1
# Depois:       .\deploy.ps1

Set-Location $PSScriptRoot
if (-not (Test-Path ".\.env.deploy")) {
  Write-Host "Primeira vez: configurando tokens..." -ForegroundColor Cyan
  & ".\setup-deploy.ps1"
  if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
}
& ".\deploy.ps1"
exit $LASTEXITCODE
