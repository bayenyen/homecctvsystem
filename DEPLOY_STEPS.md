# V380 CCTV System - Cloud Deployment Guide

Complete step-by-step guide to deploy the V380 CCTV system to Vercel (Frontend) and Render (Backend).

---

## Prerequisites

1. **Accounts Created:**
   - GitHub account (for connecting repositories)
   - MongoDB Atlas account (for database - already configured)
   - Vercel account (https://vercel.com)
   - Render account (https://render.com)

2. **Repository:**
   - Code pushed to GitHub (create repo if not done)

---

## Part 1: Deploy Backend to Render

### Step 1: Prepare Backend

1. Ensure `.env.production` exists in `/backend`:
```
NODE_ENV=production
PORT=10000
MONGO_URI=mongodb+srv://avelino-store:avelino123@avelinostore.ikdzjoy.mongodb.net/CCTV?appName=AVELINOSTORE
JWT_SECRET=your_secure_random_string_here
JWT_EXPIRE=7d
RECORDINGS_PATH=/var/data/recordings
MAX_STORAGE_GB=10
AUTO_DELETE_ON_FULL=true
ENABLE_LAN_DISCOVERY=false
CLIENT_URLS=https://your-vercel-domain.vercel.app
```

2. Verify `Dockerfile` exists in `/backend` ✓ (Already configured)

3. Verify `render.yaml` exists in project root ✓ (Already configured)

### Step 2: Connect to Render

1. Go to https://dashboard.render.com
2. Click "New +" → "Web Service"
3. Select "Deploy an existing repo from GitHub"
4. Authorize GitHub and select your v380-cctv repository
5. Configure:
   - **Name:** `v380-cctv-backend`
   - **Runtime:** Docker
   - **Branch:** main
   - **Build Command:** (Leave empty - uses Dockerfile)
   - **Start Command:** (Leave empty - uses Dockerfile)

### Step 3: Set Environment Variables on Render

In Render dashboard, go to your service → Environment:

```
NODE_ENV=production
PORT=10000
MONGO_URI=mongodb+srv://avelino-store:avelino123@avelinostore.ikdzjoy.mongodb.net/CCTV?appName=AVELINOSTORE
JWT_SECRET=generate_a_secure_random_string
JWT_EXPIRE=7d
RECORDINGS_PATH=/var/data/recordings
MAX_STORAGE_GB=10
AUTO_DELETE_ON_FULL=true
ENABLE_LAN_DISCOVERY=false
CLIENT_URLS=https://your-vercel-domain.vercel.app,http://localhost:5173
FFMPEG_PATH=ffmpeg
```

### Step 4: Create Persistent Disk (for recordings)

1. In Render service dashboard → Disks
2. Click "Create Disk"
3. **Name:** recordings
4. **Mount Path:** /var/data
5. **Size:** 10 GB

### Step 5: Deploy

- Click "Create Web Service"
- Render will build and deploy automatically
- Note your Render URL: `https://v380-cctv-backend.onrender.com` (example)
- **Wait for deployment to complete** (takes ~5-10 minutes)

---

## Part 2: Deploy Frontend to Vercel

### Step 1: Create .env.production in Frontend

Create `/frontend/.env.production`:
```
VITE_API_URL=https://v380-cctv-backend.onrender.com
```

(Replace `v380-cctv-backend.onrender.com` with your actual Render service URL)

### Step 2: Connect to Vercel

1. Go to https://vercel.com/dashboard
2. Click "Add New..." → "Project"
3. Select "Import Git Repository"
4. Authorize GitHub and select your v380-cctv repository
5. Configure:
   - **Project Name:** v380-cctv-frontend
   - **Framework:** Vite
   - **Root Directory:** `frontend/`

### Step 3: Set Environment Variables in Vercel

In project settings → Environment Variables:

```
VITE_API_URL=https://v380-cctv-backend.onrender.com
```

### Step 4: Configure Build Settings

- **Build Command:** `npm run build`
- **Output Directory:** `dist`
- **Install Command:** `npm ci`

### Step 5: Deploy

- Click "Deploy"
- Vercel will build and deploy automatically
- Note your Vercel URL: `https://v380-cctv-frontend.vercel.app` (example)

---

## Part 3: Update Backend CORS

After getting your Vercel URL, update the backend:

1. Update Render environment variable:
   ```
   CLIENT_URLS=https://v380-cctv-frontend.vercel.app
   ```

2. Or update in backend `/config/origins.js` if needed

---

## Part 4: Verify Deployment

### Test Backend Health
```bash
curl https://v380-cctv-backend.onrender.com/api/health
```

Expected response:
```json
{
  "status": "online",
  "timestamp": "2026-06-18T...",
  "version": "1.0.0",
  "system": "V380 CCTV Management System"
}
```

### Test Frontend
- Visit: https://v380-cctv-frontend.vercel.app
- Login with your credentials
- Test camera live streams
- Check dashboard functionality

---

## Important Notes

### Camera Access from Cloud

⚠️ **Important:** Cameras are on private LAN IPs (192.168.1.x). They cannot be accessed from the cloud unless:

**Option 1: VPN (Recommended)**
- Set up Tailscale, WireGuard, or ZeroTier on your local network
- Backend connects through VPN to cameras

**Option 2: RTSP Tunnel**
- Use a small PC/NVR on the camera network
- Relay RTSP streams to the cloud backend

**Option 3: Port Forward (Not Recommended)**
- Carefully firewall and expose camera ports
- Use strong authentication

### Storage for Recordings

- Render provides 10GB persistent disk at `/var/data/recordings`
- Recordings auto-delete when full (if `AUTO_DELETE_ON_FULL=true`)
- Upgrade disk size in Render if needed

### Database

- MongoDB Atlas is already configured
- Connection string is secure with IP whitelist
- Ensure "Allow from anywhere" is enabled if needed

### Cold Starts

- Render free tier services sleep after 15 minutes of inactivity
- First request takes ~30 seconds to wake up
- Use Render paid plan for always-on service

---

## Troubleshooting

### Backend deployment fails
- Check `Dockerfile` syntax
- Verify all environment variables are set
- Check Render build logs: Service → Logs

### Frontend can't connect to backend
- Verify `VITE_API_URL` is correct
- Check browser console for CORS errors
- Verify Render backend is running: `/api/health`
- Update `CLIENT_URLS` on Render

### Cameras not visible on cloud
- Verify camera network connectivity
- Set up VPN tunnel to local network
- Check FFmpeg logs on Render backend

---

## Rollback

To revert to a previous version:

**Render:** Service → Deployments → Select version → Deploy

**Vercel:** Deployments → Select version → Promote to Production

---

## Next Steps

1. ✅ Push code to GitHub
2. ✅ Deploy backend to Render
3. ✅ Deploy frontend to Vercel
4. ✅ Configure camera access (VPN/Tunnel)
5. ✅ Set up monitoring & backups
6. ✅ Configure domain names (optional)

