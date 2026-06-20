# 🎥 V380 CCTV - Global Access Setup Guide

## Quick Start (3 Easy Steps)

### Step 1: Run the Startup Script
Double-click one of these files in your `v380-cctv` folder:
- **Windows:** `start-tunnel.bat` (easiest)
- **PowerShell:** `start-tunnel.ps1`

### Step 2: Get Your ngrok URL
Two new windows will open:
- **Left window:** Backend server (should show green "Connected" messages)
- **Right window:** ngrok tunnel

Look for this in the ngrok window:
```
Forwarding    https://abc123def456.ngrok.io -> http://localhost:5000
```

**Copy that URL** (e.g., `https://abc123def456.ngrok.io`)

### Step 3: Update Vercel & Redeploy
1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click your `homecctvsystem` project
3. Go to **Settings → Environment Variables**
4. Find `VITE_API_URL` (if it doesn't exist, add it)
5. Set it to your ngrok URL: `https://abc123def456.ngrok.io`
6. Click **Save**
7. Go to **Deployments** → Click **Redeploy**

### Step 4: Test It!
Open https://homecctvsystem.vercel.app

Your V380 cameras should now show as **ONLINE** ✅

---

## How It Works

```
📹 Your Cameras (Home Network)
        ↓
🖥️ Backend Server (Local PC - port 5000)
        ↓
🌐 ngrok Tunnel (Exposes to internet)
        ↓
📱 Vercel Frontend (https://homecctvsystem.vercel.app)
        ↓
✅ YOU - From anywhere in the world!
```

---

## Important Notes

⚠️ **Keep Both Windows Running**
- Both the Backend and ngrok windows must stay open
- Close them = cameras go offline
- Restart them = cameras come back online

⚠️ **ngrok URL Changes on Restart**
- Every time you restart ngrok, you get a NEW URL
- You'll need to update Vercel each time
- Consider upgrading ngrok for static URL

⏰ **24/7 Access**
- Option 1: Keep PC running always
- Option 2: Use Task Scheduler to auto-start
- Option 3: Run on Raspberry Pi or NAS device

---

## Troubleshooting

### Cameras Still Offline?
1. Check backend window - should show camera discovery messages
2. Check ngrok window - should show "Forwarding" URL
3. Verify Vercel env variable is set correctly
4. Wait 30 seconds after redeploy, then refresh

### Backend Won't Start?
```bash
cd backend
npm install
npm run dev
```

### ngrok Showing "Connection refused"?
- Backend might not be running yet
- Wait 5-10 seconds and check backend window

---

## Next Steps

After confirming it works:
1. **Auto-start on boot** - Use Windows Task Scheduler
2. **Better uptime** - Move backend to Raspberry Pi
3. **Static URL** - Upgrade ngrok free tier for persistent URLs

---

Good luck! 🚀
