# Setup ÚNICO — grava tokens em .env.deploy (gitignored).
# Depois disso: .\deploy.ps1  (ou peça ao Cursor: "atualiza o site")

$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot

Write-Host ""
Write-Host "=== Setup deploy RadioPlay (uma vez) ===" -ForegroundColor Cyan
Write-Host "Conta: tanolinkweb@gmail.com"
Write-Host "GitHub: tanolinkweb-cmd/radioplay"
Write-Host "Vercel: tano-link/radioplay"
Write-Host ""
Write-Host "1) GitHub token: https://github.com/settings/tokens  (classic, escopo repo)" -ForegroundColor Yellow
Write-Host "2) Vercel token: https://vercel.com/account/tokens" -ForegroundColor Yellow
Write-Host ""

$gh = Read-Host "Cole o GITHUB_TOKEN (tanolinkweb-cmd)"
$vc = Read-Host "Cole o VERCEL_TOKEN (tanolinkweb@gmail.com)"

if ([string]::IsNullOrWhiteSpace($gh)) {
  Write-Host "GITHUB_TOKEN obrigatorio." -ForegroundColor Red
  exit 1
}
if ([string]::IsNullOrWhiteSpace($vc)) {
  Write-Host "VERCEL_TOKEN obrigatorio." -ForegroundColor Red
  exit 1
}

$path = Join-Path $PSScriptRoot ".env.deploy"
@"
# Gerado por setup-deploy.ps1 — NAO commitar
GITHUB_TOKEN=$gh
VERCEL_TOKEN=$vc
"@ | Set-Content -Path $path -Encoding UTF8

Write-Host ""
Write-Host "OK: tokens salvos em .env.deploy (ignorado pelo git)." -ForegroundColor Green
Write-Host "Agora rode: .\deploy.ps1" -ForegroundColor Green
Write-Host "Ou diga ao Cursor: atualiza o site" -ForegroundColor Green
