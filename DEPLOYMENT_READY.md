# Deployment Ready - Quick Start

Your V380 CCTV system is now configured and ready to deploy to Vercel & Render!

## Files Created for Deployment

✅ **Frontend Environment**
- `/frontend/.env.production` - API URL for production
- `vercel.json` - SPA routing configuration (already exists)

✅ **Backend Environment**
- `/backend/.env.production` - Production environment variables
- `Dockerfile` - Container configuration (already exists)
- `render.yaml` - Render deployment blueprint (already exists)

✅ **Documentation**
- `DEPLOY_STEPS.md` - Complete step-by-step guide
- `DEPLOYMENT_CHECKLIST_DETAILED.md` - Detailed checklist with verification steps

## Quick Deploy Summary

### 1. Backend (Render) - 5 minutes
```
1. Go to https://render.com/dashboard
2. Click "New +" → "Web Service"
3. Connect GitHub → Select v380-cctv repo
4. Configure:
   - Name: v380-cctv-backend
   - Runtime: Docker
   - Root Dir: backend
5. Add Environment Variables (from .env.production)
6. Create Disk: /var/data (10GB)
7. Click "Deploy"
8. Wait for build... (~5-10 min)
9. Copy your Render URL (e.g., https://v380-cctv-backend.onrender.com)
```

### 2. Frontend (Vercel) - 3 minutes
```
1. Go to https://vercel.com/dashboard
2. Click "Add New" → "Project"
3. Import Git Repo → Select v380-cctv
4. Configure:
   - Project Name: v380-cctv-frontend
   - Framework: Vite
   - Root: frontend/
5. Add Environment Variable:
   VITE_API_URL=https://v380-cctv-backend.onrender.com (from step 1)
6. Click "Deploy"
7. Wait for build... (~2-3 min)
8. You'll get your Vercel URL
```

### 3. Final Configuration - 1 minute
```
1. Return to Render dashboard
2. Go to service → Settings → Environment
3. Update CLIENT_URLS to your Vercel URL:
   CLIENT_URLS=https://v380-cctv-frontend.vercel.app
4. Redeploy to apply changes
```

## What's Ready

✅ **Backend**
- Node.js Express server with all CCTV features
- MongoDB Atlas database integration
- FFmpeg streaming pipeline (H.264 optimized)
- JWT authentication
- Docker containerization
- Health check endpoint

✅ **Frontend**
- React/Vite SPA application
- Camera dashboard
- Live streaming UI
- Authentication UI
- Recording & reporting features
- Responsive design

✅ **Database**
- MongoDB Atlas configured
- Collections: Users, Cameras, Recordings, Alerts
- Indexes optimized

✅ **Configuration**
- CORS properly configured
- Environment variables set
- SSL/HTTPS automatic (both platforms)
- Rate limiting enabled
- Error logging configured

## Current Settings

**Backend API URL:** Will be `https://v380-cctv-backend.onrender.com`
**Frontend URL:** Will be `https://v380-cctv-frontend.vercel.app`
**Database:** MongoDB Atlas (secure connection)
**Authentication:** JWT with 7-day expiry
**Video Codec:** H.264 (optimized for performance)

## Important Notes

⚠️ **Camera Access:**
- Cameras are on private LAN (192.168.1.x)
- Cannot be accessed directly from cloud
- You MUST set up VPN/tunnel to local network:
  - **Recommended:** Tailscale (free, easy, secure)
  - Alternative: WireGuard, ZeroTier
  - **After setup:** Cameras will work from cloud

⚠️ **Cold Starts:**
- Render free tier sleeps after 15 min inactivity
- First request after sleep takes ~30 sec
- Upgrade to paid plan for instant response

## Environment Variables Created

### Frontend (.env.production)
```
VITE_API_URL=https://v380-cctv-backend.onrender.com
```

### Backend (.env.production)
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
CLIENT_URLS=https://v380-cctv-frontend.vercel.app,http://localhost:5173
FFMPEG_PATH=ffmpeg
```

⚠️ **Before Deploying:**
- Replace `JWT_SECRET` with a strong random value
- Verify `MONGO_URI` is correct
- Ensure GitHub is connected to both Vercel & Render

## Testing After Deploy

```bash
# Test backend is running
curl https://v380-cctv-backend.onrender.com/api/health

# Expected response:
{
  "status": "online",
  "timestamp": "...",
  "version": "1.0.0",
  "system": "V380 CCTV Management System"
}
```

Then visit your Vercel frontend URL and log in!

## Support Resources

- **DEPLOY_STEPS.md** - Full detailed guide with troubleshooting
- **DEPLOYMENT_CHECKLIST_DETAILED.md** - Complete checklist
- Render: https://render.com/docs
- Vercel: https://vercel.com/docs

---

**Status:** ✅ READY TO DEPLOY

All files are prepared. Start with the backend deployment on Render, then deploy frontend to Vercel.

See `DEPLOY_STEPS.md` for complete instructions with screenshots and troubleshooting tips.
