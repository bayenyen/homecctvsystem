@echo off
REM V380 CCTV - Start Backend + ngrok Tunnel
REM This script starts everything needed for global camera access

echo.
echo ═══════════════════════════════════════════════════════════════
echo  V380 CCTV - Global Tunnel Setup
echo ═══════════════════════════════════════════════════════════════
echo.

REM Terminal 1: Start Backend
echo Starting Backend Server...
echo.
cd /d c:\Users\bryne\Documents\v380-cctv\backend
start "V380 Backend" cmd /k npm run dev

timeout /t 3

REM Terminal 2: Start ngrok Tunnel
echo.
echo Starting ngrok Tunnel...
echo.
cd /d c:\Users\bryne\Documents\v380-cctv
start "ngrok Tunnel" cmd /k "%USERPROFILE%\Documents\ngrok\ngrok.exe http 5000"

echo.
echo ═══════════════════════════════════════════════════════════════
echo  SETUP INSTRUCTIONS:
echo ═══════════════════════════════════════════════════════════════
echo.
echo 1. Wait 5-10 seconds for both windows to start
echo.
echo 2. Look at the ngrok window - you will see:
echo    Forwarding    https://abc123.ngrok.io ^-> http://localhost:5000
echo.
echo 3. Copy that URL (e.g., https://abc123.ngrok.io)
echo.
echo 4. Go to Vercel Dashboard:
echo    - Project Settings ^> Environment Variables
echo    - Set: VITE_API_URL = [your ngrok URL]
echo    - Click Save
echo    - Go to Deployments ^> Redeploy
echo.
echo 5. Test at: https://homecctvsystem.vercel.app
echo    Your cameras should now be ONLINE!
echo.
echo ═══════════════════════════════════════════════════════════════
echo.
echo Press any key to continue...
pause

