<#
run-frontend-EMC.ps1
Helper to install and run the frontend Next.js app from the repo root.

Usage examples:
  # Interactive (defaults: frontend, dev)
  .\run-frontend-EMC.ps1

  # Force install and run dev
  .\run-frontend-EMC.ps1 -ForceInstall

  # Run build instead of dev
  .\run-frontend-EMC.ps1 -Action build

  # Use a different folder name
  .\run-frontend-EMC.ps1 -Folder "frontend"

Parameters:
  -Action   : dev|build|start  (default: dev)
  -Folder   : path to frontend folder relative to script (default: frontend)
  -ForceInstall : forces (re)install of dependencies
  -Auto     : skip prompts
#>

[CmdletBinding()]
param(
    [ValidateSet("dev","build","start")]
    [string]$Action = "dev",

    [string]$Folder = "frontend",

    [switch]$ForceInstall,
    [switch]$Auto
)

function Detect-PackageManager($folder) {
    if (Test-Path (Join-Path $folder "pnpm-lock.yaml")) { return "pnpm" }
    if (Test-Path (Join-Path $folder "yarn.lock")) { return "yarn" }
    if (Test-Path (Join-Path $folder "package-lock.json")) { return "npm" }
    # fallback: check package.json 'packageManager' field
    $pkg = Join-Path $folder "package.json"
    if (Test-Path $pkg) {
        try {
            $j = Get-Content -Raw -Path $pkg | ConvertFrom-Json
            if ($j.packageManager) {
                if ($j.packageManager -match "pnpm") { return "pnpm" }
                if ($j.packageManager -match "yarn") { return "yarn" }
                if ($j.packageManager -match "npm") { return "npm" }
            }
        } catch {}
    }
    return "npm"
}

# Resolve script directory and project folder
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
$projectPath = Resolve-Path -LiteralPath (Join-Path $scriptDir $Folder) -ErrorAction SilentlyContinue
if (-not $projectPath) {
    Write-Host "Couldn't find folder '$Folder' relative to script location ($scriptDir). Trying current directory..."
    $projectPath = Resolve-Path -LiteralPath (Join-Path (Get-Location) $Folder) -ErrorAction SilentlyContinue
}

if (-not $projectPath) {
    Write-Error "Frontend folder '$Folder' not found. Please run this script from the repo root or pass -Folder with the correct path."
    exit 2
}

$projectPath = $projectPath.ProviderPath
Write-Host "Using frontend folder: $projectPath"

# Ensure package.json exists
$pkgJson = Join-Path $projectPath "package.json"
if (-not (Test-Path $pkgJson)) {
    Write-Error "No package.json found in $projectPath"
    exit 3
}

$pkgManager = Detect-PackageManager $projectPath
Write-Host "Detected package manager: $pkgManager"

# Decide whether to install
$nodeModules = Join-Path $projectPath "node_modules"
$needInstall = $ForceInstall.IsPresent -or -not (Test-Path $nodeModules)

if ($needInstall) {
    Write-Host "Installing dependencies in $projectPath"
    Push-Location $projectPath
    switch ($pkgManager) {
        "pnpm" { $installCmd = "pnpm"; $installArgs = @("install") }
        "yarn"  { $installCmd = "yarn";  $installArgs = @("install") }
        default  { $installCmd = "npm";   $installArgs = @("install") }
    }
    Write-Host "Running: $installCmd $($installArgs -join ' ')"
    $proc = Start-Process -FilePath $installCmd -ArgumentList $installArgs -NoNewWindow -PassThru -Wait
    $code = $proc.ExitCode
    Pop-Location
    if ($code -ne 0) {
        Write-Error "Dependency install failed with exit code $code"
        exit $code
    }
} else {
    Write-Host "node_modules exists and -ForceInstall not provided; skipping install. Use -ForceInstall to reinstall."
}

# Prepare run command
switch ($pkgManager) {
    "pnpm" { $cmd = "pnpm"; $args = @("run", $Action) }
    "yarn"  { $cmd = "yarn";  $args = @($Action) }
    default  { $cmd = "npm";   $args = @("run", $Action) }
}

Write-Host "Starting '$Action' with $cmd $($args -join ' ') in $projectPath"

Push-Location $projectPath
try {
    # If Auto not set and action is build, confirm (prevent accidental long builds)
    if (-not $Auto.IsPresent -and $Action -eq 'build') {
        $yn = Read-Host "About to run 'build' which may take time — continue? (Y/N)"
        if ($yn -notmatch '^[Yy]') {
            Write-Host "Aborted by user."
            Pop-Location
            exit 0
        }
    }

    # Start the process and connect output to this console
    $proc = Start-Process -FilePath $cmd -ArgumentList $args -NoNewWindow -Wait -PassThru
    $exit = $proc.ExitCode
} catch {
    Write-Error "Failed to start $cmd: $_"
    Pop-Location
    exit 10
}
Pop-Location

if ($exit -ne 0) {
    Write-Error "$cmd $($args -join ' ') exited with code $exit"
    exit $exit
}

Write-Host "Finished $Action successfully."
