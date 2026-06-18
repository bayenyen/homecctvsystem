<#
PowerShell helper to prepare Windows for node-gyp builds without changing Node version.
Run from the `backend` folder in an elevated PowerShell:

    cd backend
    .\scripts\setup-windows-dev.ps1

This script will:
- detect `python` or `py` and set `PYTHON` env var + `npm config set python`
- remove `node_modules` and `package-lock.json`
- clean npm cache and run `npm install`

It does NOT install Visual Studio Build Tools; please install them if the script shows a warning.
#>

function Write-Ok($msg){ Write-Host "[OK] $msg" -ForegroundColor Green }
function Write-Warn($msg){ Write-Host "[WARN] $msg" -ForegroundColor Yellow }
function Write-Err($msg){ Write-Host "[ERR] $msg" -ForegroundColor Red }

Push-Location -ErrorAction Stop
try{
    $cwd = Get-Location
    Write-Host "Working directory: $cwd"

    # 1) Find Python executable
    $pythonCmd = $null
    $pyPath = $null

    $pythonCmd = Get-Command python -ErrorAction SilentlyContinue
    if ($pythonCmd) { $pyPath = $pythonCmd.Source }
    else {
        $pyLauncher = Get-Command py -ErrorAction SilentlyContinue
        if ($pyLauncher) {
            try{
                $pyPath = (& py -3 -c "import sys; print(sys.executable)") -join ""
            } catch {
                $pyPath = $null
            }
        }
    }

    if (-not $pyPath) {
        Write-Warn "Python 3 not found in PATH. Please install Python 3 and enable 'Add Python to PATH' during install."
        Write-Host "Recommended: https://www.python.org/downloads/"
        Write-Host "Also install Visual Studio Build Tools (C++ workload). See https://visualstudio.microsoft.com/downloads/"
        return
    }

    Write-Ok "Found Python at: $pyPath"

    # 2) Persist PYTHON env var for the user and set npm config
    try{
        [Environment]::SetEnvironmentVariable("PYTHON", $pyPath, "User")
        Write-Ok "Set user environment variable PYTHON"
    } catch {
        Write-Warn "Failed to set PYTHON environment variable: $_"
    }

    try{
        npm config set python "$pyPath" | Out-Null
        Write-Ok "Set npm python config"
    } catch {
        Write-Warn "Failed to run 'npm config set python' in this session. You may run it manually: npm config set python \"$pyPath\""
    }

    # 3) Remove node_modules and package-lock.json (with permission handling)
    if (Test-Path .\node_modules) {
        try{
            Write-Host "Removing node_modules..."
            Remove-Item -Recurse -Force .\node_modules
            Write-Ok "node_modules removed"
        } catch {
            Write-Warn "Could not remove node_modules automatically: $_. Try re-running PowerShell as Administrator or close processes locking files."
        }
    } else {
        Write-Ok "No node_modules folder present"
    }

    if (Test-Path .\package-lock.json) {
        try{ Remove-Item -Force .\package-lock.json; Write-Ok "Removed package-lock.json" } catch { Write-Warn "Could not remove package-lock.json: $_" }
    }

    # 4) Clean npm cache and reinstall
    Write-Host "Cleaning npm cache..."
    npm cache clean --force

    Write-Host "Running npm install (this may take a while)..."
    $install = npm install
    if ($LASTEXITCODE -ne 0) {
        Write-Err "npm install failed. Check above output. Common fixes: install Visual Studio Build Tools (C++), run PowerShell as Admin, ensure Python path is valid."
    } else {
        Write-Ok "npm install completed"
    }

} finally {
    Pop-Location
}
