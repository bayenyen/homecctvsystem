# Remote Camera Access: Quick Deployment Guide

Enable users anywhere to access cameras on your local network via Tailscale VPN.

## 🚀 Quick Start (5-10 minutes)

### Phase 1: Local Setup (Your Windows PC)

```powershell
# 1. Install Tailscale
#    https://tailscale.com/download/windows
#    Sign in with email/Google/GitHub
#    Note your IP (look in system tray)

# 2. Get your Tailscale IP
tailscale status
# Output shows: your-pc  100.x.x.x   Windows

# Save this IP - you'll need it!
```

### Phase 2: Render Deployment (Cloud Backend)

1. **Get Tailscale Auth Token:**
   - Go to: https://login.tailscale.com/admin/settings/keys
   - Click "Generate auth key"
   - Check: ✅ Reusable, ✅ Ephemeral
   - Copy the key (starts with `tskey-`)

2. **Commit code changes:**
   ```powershell
   cd C:\Users\bryne\Documents\v380-cctv
   git add .
   git commit -m "Add Tailscale VPN support for remote camera access"
   git push
   ```

3. **Deploy to Render:**
   - Go to https://dashboard.render.com
   - Select `v380-cctv-backend` service
   - Go to **Environment** tab
   - Add new variable:
     - Key: `TAILSCALE_AUTHKEY`
     - Value: `tskey-xxxxx` (your token from step 1)
   - Click **Save Changes**
   - Render automatically redeploys (watch logs)
   - Wait for message: "Tailscale connected successfully"

### Phase 3: Update Camera URLs

```powershell
# Run the helper script
.\update-tailscale-urls.ps1

# It will show you:
# ✅ Your Tailscale IP (e.g., 100.x.x.x)
# ✅ Instructions to update camera URLs

# Update each camera in your frontend:
# OLD: rtsp://192.168.1.5:554/h264
# NEW: rtsp://100.x.x.x:554/h264
```

### Phase 4: Test from Different Network

```powershell
# Disconnect from your home WiFi
# (Use phone hotspot or different WiFi)

# Open your Vercel frontend
https://cctvsystem.vercel.app

# Login and view live streams
# If cameras show live feed → It Works! 🎉
```

---

## 📋 What Changed

### Files Modified:
- ✅ `backend/Dockerfile` - Added Tailscale installation
- ✅ `render.yaml` - Added TAILSCALE_AUTHKEY environment variable
- ✅ `backend/.env.production` - Added Tailscale config placeholders
- ✅ `TAILSCALE_SETUP.md` - Detailed setup guide
- ✅ `update-tailscale-urls.ps1` - Helper script

### How It Works:
```
1. Your PC → Tailscale VPN → Render Backend
2. Render Backend → Tailscale VPN → Local Cameras
3. Remote User → Internet → Vercel Frontend → Render Backend → Cameras

Result: User in any country can watch local cameras securely!
```

---

## ✅ Verification Checklist

- [ ] Tailscale installed on local PC and running
- [ ] Code pushed to GitHub
- [ ] `TAILSCALE_AUTHKEY` set in Render dashboard
- [ ] Render backend redeployed (check logs)
- [ ] Camera RTSP URLs updated to Tailscale IPs
- [ ] Can view streams from local network
- [ ] Can view streams from different network ← **Most Important!**

---

## 🔐 Security

✅ **End-to-end encrypted** - Only your network can access cameras
✅ **No open ports** - Firewall doesn't matter
✅ **Auth key revokable** - Can disable anytime
✅ **Single-use capable** - Generate new key for each deployment

---

## 🆘 Troubleshooting

**"Tailscale not running on PC"**
```powershell
# Start it
Start-Process "C:\Program Files\Tailscale\tailscale.exe"
tailscale up
```

**"Render backend can't reach cameras"**
- Check Render logs for connection errors
- Verify camera Tailscale IPs are correct
- Re-run `update-tailscale-urls.ps1`

**"Can access locally but not from different network"**
- Check VITE_API_URL in Vercel points to Render backend
- Verify TAILSCALE_AUTHKEY is set in Render
- Check camera URLs are Tailscale IPs (not localhost)

---

## 📚 Full Guides

- See `TAILSCALE_SETUP.md` for detailed step-by-step instructions
- See `CLOUD_DEPLOYMENT.md` for broader deployment info

---

**You're all set!** Follow the 4 phases above and you'll have secure remote camera access. 🎉
