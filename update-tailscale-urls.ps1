# Get local Tailscale IP and update camera RTSP URLs
# Run this after both PC and Render backend are on Tailscale

$ErrorActionPreference = "Stop"

Write-Host "=== Tailscale Camera URL Update Tool ===" -ForegroundColor Cyan
Write-Host ""

# Step 1: Get local Tailscale IP
Write-Host "Step 1: Getting your local Tailscale IP..." -ForegroundColor Green
try {
    $tailscaleStatus = & tailscale status 2>$null
    if (-not $tailscaleStatus) {
        Write-Host "❌ Tailscale is not running. Please start Tailscale first." -ForegroundColor Red
        exit 1
    }
    
    # Extract this device's IP (first IP line)
    $lines = $tailscaleStatus -split "`n"
    $localIp = $null
    
    foreach ($line in $lines) {
        if ($line -match "^\s+(\d+\.\d+\.\d+\.\d+)") {
            $localIp = $matches[1]
            break
        }
    }
    
    if ($localIp) {
        Write-Host "✅ Your Tailscale IP: $localIp" -ForegroundColor Green
    } else {
        Write-Host "⚠️ Could not find Tailscale IP. Full status:" -ForegroundColor Yellow
        Write-Host $tailscaleStatus
        Write-Host ""
        Write-Host "Please manually check: tailscale status"
        exit 1
    }
} catch {
    Write-Host "❌ Error getting Tailscale status: $_" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "Step 2: Update camera RTSP URLs in your system" -ForegroundColor Green
Write-Host ""
Write-Host "Replace all camera RTSP URLs with Tailscale IPs:" -ForegroundColor Cyan
Write-Host "  OLD: rtsp://192.168.1.x:554/..." -ForegroundColor Yellow
Write-Host "  NEW: rtsp://$localIp:554/..." -ForegroundColor Green
Write-Host ""
Write-Host "Methods to update:" -ForegroundColor Cyan
Write-Host ""
Write-Host "1️⃣  Via Dashboard:" -ForegroundColor Cyan
Write-Host "   - Login to your frontend"
Write-Host "   - Go to Camera Settings"
Write-Host "   - Edit each camera's RTSP URL"
Write-Host "   - Replace 192.168.1.x with $localIp"
Write-Host "   - Save changes"
Write-Host ""

Write-Host "2️⃣  Via Backend API (in PowerShell):" -ForegroundColor Cyan
Write-Host ""
Write-Host @"
# Get your API token first (login to dashboard)
`$token = "your-jwt-token-here"
`$backendUrl = "https://your-render-backend.onrender.com"

# Get all cameras
`$cameras = Invoke-RestMethod -Uri "`$backendUrl/api/cameras" `
  -Headers @{ Authorization = "Bearer `$token" }

# Update each camera
foreach (`$camera in `$cameras) {
    `$newUrl = `$camera.rtspUrl -replace "192\.168\.1\.\d+", "$localIp"
    Invoke-RestMethod -Uri "`$backendUrl/api/cameras/`$camera._id" `
      -Method PUT `
      -Headers @{ Authorization = "Bearer `$token"; "Content-Type" = "application/json" } `
      -Body (@{ rtspUrl = `$newUrl } | ConvertTo-Json)
    Write-Host "Updated: `$camera.name -> `$newUrl"
}
"@
Write-Host ""

Write-Host "Step 3: Verify Render backend connection" -ForegroundColor Green
Write-Host ""
Write-Host "After updating URLs, check Render logs for:" -ForegroundColor Cyan
Write-Host "  ✅ 'Tailscale connected'"
Write-Host "  ✅ 'Successfully connected to camera at rtsp://$localIp:554'"
Write-Host ""

Write-Host "Step 4: Test from different network" -ForegroundColor Green
Write-Host ""
Write-Host "Once URLs are updated:" -ForegroundColor Cyan
Write-Host "  1. Disconnect from your WiFi (use mobile hotspot)"
Write-Host "  2. Open your Vercel frontend URL"
Write-Host "  3. Login and view live streams"
Write-Host "  4. If cameras show live, it's working! 🎉"
Write-Host ""

Write-Host "=== Summary ===" -ForegroundColor Cyan
Write-Host "Local Tailscale IP: $localIp" -ForegroundColor Green
Write-Host "Use this in all RTSP URLs"
Write-Host "Update via dashboard or API, then test from different network"
