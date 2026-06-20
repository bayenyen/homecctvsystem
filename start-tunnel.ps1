# V380 CCTV - Start Backend + ngrok Tunnel (PowerShell)
# Run this script to start everything

Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "  V380 CCTV - Global Tunnel Setup" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

# Terminal 1: Start Backend
Write-Host "🔵 Starting Backend Server on port 5000..." -ForegroundColor Green
Write-Host ""
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd 'c:\Users\bryne\Documents\v380-cctv\backend'; npm run dev" -WindowStyle Normal
Start-Sleep -Seconds 3

# Terminal 2: Start ngrok Tunnel
Write-Host "🟢 Starting ngrok Tunnel..." -ForegroundColor Green
Write-Host ""
Start-Process powershell -ArgumentList "-NoExit", "-Command", "c:\Users\bryne\Documents\ngrok\ngrok.exe http 5000" -WindowStyle Normal

Write-Host ""
Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor Yellow
Write-Host "  SETUP INSTRUCTIONS:" -ForegroundColor Yellow
Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor Yellow
Write-Host ""
Write-Host "1️⃣  Wait 5-10 seconds for BOTH windows to start" -ForegroundColor White
Write-Host ""
Write-Host "2️⃣  Look at the ngrok window - you will see:" -ForegroundColor White
Write-Host "    Forwarding    https://abc123.ngrok.io -> http://localhost:5000" -ForegroundColor Cyan
Write-Host ""
Write-Host "3️⃣  COPY that URL (example: https://abc123.ngrok.io)" -ForegroundColor White
Write-Host ""
Write-Host "4️⃣  Go to Vercel Dashboard:" -ForegroundColor White
Write-Host "    • homecctvsystem project" -ForegroundColor Gray
Write-Host "    • Settings > Environment Variables" -ForegroundColor Gray
Write-Host "    • Set: VITE_API_URL = [your ngrok URL]" -ForegroundColor Gray
Write-Host "    • Click Save" -ForegroundColor Gray
Write-Host "    • Go to Deployments > Redeploy" -ForegroundColor Gray
Write-Host ""
Write-Host "5️⃣  Test at: https://homecctvsystem.vercel.app" -ForegroundColor White
Write-Host "    Your cameras should now be ONLINE! 🎥" -ForegroundColor Green
Write-Host ""
Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor Yellow
Write-Host ""
Write-Host "Keep these windows running for 24/7 camera access!" -ForegroundColor Magenta
Write-Host ""
