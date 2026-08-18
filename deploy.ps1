# Publica RadioPlay: push GitHub (tanolinkweb-cmd) + confirma deploy Vercel.
# Requer .env.deploy (rode setup-deploy.ps1 uma vez).

$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot

function Read-DeployEnv {
  $path = Join-Path $PSScriptRoot ".env.deploy"
  if (-not (Test-Path $path)) {
    Write-Host "Falta .env.deploy. Rode primeiro: .\setup-deploy.ps1" -ForegroundColor Red
    exit 1
  }
  $map = @{}
  Get-Content $path | ForEach-Object {
    $line = $_.Trim()
    if ($line -eq "" -or $line.StartsWith("#")) { return }
    $i = $line.IndexOf("=")
    if ($i -lt 1) { return }
    $key = $line.Substring(0, $i).Trim()
    $val = $line.Substring($i + 1).Trim()
    $map[$key] = $val
  }
  return $map
}

$envMap = Read-DeployEnv
$gh = $envMap["GITHUB_TOKEN"]
$vc = $envMap["VERCEL_TOKEN"]

if ([string]::IsNullOrWhiteSpace($gh)) {
  Write-Host "GITHUB_TOKEN vazio em .env.deploy" -ForegroundColor Red
  exit 1
}

Write-Host ""
Write-Host "=== Deploy RadioPlay ===" -ForegroundColor Cyan
Write-Host "Repo: tanolinkweb-cmd/radioplay"
Write-Host "Vercel: tano-link/radioplay → radioplay.tanolink.com.br"
Write-Host ""

$status = git status -sb
Write-Host $status

$ahead = $status -match "ahead"
if (-not $ahead) {
  Write-Host "Nada pendente de push (branch nao esta ahead)." -ForegroundColor Yellow
} else {
  Write-Host "Push para main com token tanolink..." -ForegroundColor Yellow
  $remote = "https://tanolinkweb-cmd:${gh}@github.com/tanolinkweb-cmd/radioplay.git"
  git push $remote HEAD:main
  if ($LASTEXITCODE -ne 0) {
    Write-Host "Push falhou." -ForegroundColor Red
    exit $LASTEXITCODE
  }
  Write-Host "Push OK." -ForegroundColor Green
}

# Limpa remote com token da memoria de processo
$remote = $null
$gh = $null

if (-not [string]::IsNullOrWhiteSpace($vc)) {
  Write-Host "Verificando Vercel (tano-link/radioplay)..." -ForegroundColor Yellow
  $env:VERCEL_TOKEN = $vc
  vercel whoami 2>&1 | Out-Host
  vercel ls radioplay --scope tano-link 2>&1 | Select-Object -First 15 | Out-Host
  Remove-Item Env:VERCEL_TOKEN -ErrorAction SilentlyContinue
  $vc = $null
  Write-Host "Vercel deve redeployar sozinha apos o push (1-2 min)." -ForegroundColor Green
} else {
  Write-Host "Sem VERCEL_TOKEN — push feito; confira o deploy no dashboard." -ForegroundColor Yellow
}

Write-Host ""
git status -sb
Write-Host "Site: https://radioplay.tanolink.com.br" -ForegroundColor Cyan
