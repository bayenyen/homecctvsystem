# V380 CCTV Deployment Checklist - Vercel & Render

## Pre-Deployment

- [ ] Code committed and pushed to GitHub
- [ ] `.env.production` files created:
  - [ ] `/frontend/.env.production`
  - [ ] `/backend/.env.production`
- [ ] MongoDB Atlas credentials verified
- [ ] All environment variables documented

## Backend (Render) Deployment

### Setup
- [ ] Create Render account (https://render.com)
- [ ] Render account has GitHub connected
- [ ] Repository is public or Render account has access

### Configuration
- [ ] `render.yaml` exists in project root ✓
- [ ] `Dockerfile` exists in `/backend` ✓
- [ ] Environment variables prepared in `.env.production`

### Deployment Steps
- [ ] Create new Web Service on Render
  - [ ] Select GitHub repository
  - [ ] Set name: `v380-cctv-backend`
  - [ ] Set rootDir: `backend`
  - [ ] Set runtime: Docker
- [ ] Add environment variables to Render dashboard
- [ ] Create persistent disk for recordings
  - [ ] Size: 10GB
  - [ ] Mount path: /var/data
- [ ] Deploy and wait for completion
- [ ] Note Render backend URL: `https://v380-cctv-backend.onrender.com`

### Verification
- [ ] Backend health check passes: `/api/health`
- [ ] Database connection works
- [ ] FFmpeg is available in container
- [ ] Logs show successful startup

---

## Frontend (Vercel) Deployment

### Setup
- [ ] Create Vercel account (https://vercel.com)
- [ ] Vercel account has GitHub connected

### Configuration
- [ ] `.env.production` created with correct API URL
  ```
  VITE_API_URL=https://v380-cctv-backend.onrender.com
  ```
- [ ] `vercel.json` exists ✓ (SPA routing configured)
- [ ] `vite.config.js` production build configured ✓

### Deployment Steps
- [ ] Import project from GitHub to Vercel
  - [ ] Set project name: `v380-cctv-frontend`
  - [ ] Set root directory: `frontend`
  - [ ] Set framework: Vite
- [ ] Configure build:
  - [ ] Build command: `npm run build`
  - [ ] Output directory: `dist`
- [ ] Add environment variable:
  - [ ] `VITE_API_URL=https://v380-cctv-backend.onrender.com`
- [ ] Deploy and wait for completion
- [ ] Note Vercel frontend URL: `https://v380-cctv-frontend.vercel.app`

### Verification
- [ ] Frontend loads successfully
- [ ] Can access login page
- [ ] API requests work (check browser console)
- [ ] No CORS errors

---

## Post-Deployment Configuration

### Update Render Environment
- [ ] Update `CLIENT_URLS` on Render:
  ```
  CLIENT_URLS=https://v380-cctv-frontend.vercel.app,http://localhost:5173
  ```
- [ ] Restart Render service

### Camera Access Setup
Choose one method:

**Option 1: VPN Tunnel (Recommended)**
- [ ] Install Tailscale on local network device
- [ ] Connect to Tailscale VPN
- [ ] Update camera URLs in MongoDB to use VPN IPs
- [ ] Test connectivity from Render backend

**Option 2: RTSP Relay**
- [ ] Set up relay server on local network
- [ ] Update camera URLs to relay server endpoints
- [ ] Test connectivity

**Option 3: Port Forwarding**
- [ ] Configure firewall rules
- [ ] Forward camera RTSP ports
- [ ] Use strong authentication

---

## Testing

### Backend Testing
```bash
# Health check
curl https://v380-cctv-backend.onrender.com/api/health

# Expected: 200 OK with system info
```

### Frontend Testing
- [ ] Visit: https://v380-cctv-frontend.vercel.app
- [ ] Login with credentials
- [ ] View camera list
- [ ] Test live stream (if cameras accessible)
- [ ] Check dashboard stats
- [ ] Verify all pages load

### Full System Testing
- [ ] Create new user
- [ ] Add camera
- [ ] Start recording
- [ ] Check alerts
- [ ] Download reports
- [ ] Test PTZ controls (if applicable)

---

## Monitoring

### Render Backend
- [ ] Check logs regularly: Service → Logs
- [ ] Monitor disk usage: Service → Disks
- [ ] Set up alerts for errors
- [ ] Monitor CPU/Memory usage

### Vercel Frontend
- [ ] Check analytics: Project → Analytics
- [ ] Monitor error rates
- [ ] Check build logs after each deploy

---

## Performance Optimization

- [ ] Enable caching headers
- [ ] Compress video streams
- [ ] Optimize database queries
- [ ] Use CDN for static assets (Vercel default)
- [ ] Consider upgrading Render plan if high traffic

---

## Security Checklist

- [ ] JWT_SECRET is strong and unique ✓
- [ ] MongoDB credentials are secure ✓
- [ ] CORS is properly configured ✓
- [ ] HTTPS enabled (automatic on both) ✓
- [ ] API rate limiting enabled ✓
- [ ] LAN discovery disabled in production ✓
- [ ] Camera credentials secured in DB ✓

---

## Rollback Plan

If issues occur:

**Backend Rollback (Render):**
1. Go to Service → Deployments
2. Select previous working version
3. Click "Deploy"
4. Service restarts with previous code

**Frontend Rollback (Vercel):**
1. Go to Deployments
2. Select previous working version
3. Click "Promote to Production"
4. Site reverts to previous version

---

## Troubleshooting Guide

### "Cannot connect to API"
- [ ] Verify Render backend is running
- [ ] Check `VITE_API_URL` in frontend
- [ ] Check browser console for errors
- [ ] Verify CORS settings on Render

### "Cameras not visible"
- [ ] Check camera connectivity
- [ ] Set up VPN tunnel to local network
- [ ] Verify MongoDB has camera records
- [ ] Check FFmpeg logs on Render

### "502 Bad Gateway" from Render
- [ ] Check Render logs
- [ ] Verify database connection
- [ ] Check environment variables
- [ ] Restart service

### "Build fails on Vercel"
- [ ] Check build logs
- [ ] Verify Node version compatibility
- [ ] Check for missing dependencies
- [ ] Clear cache and redeploy

---

## Support Resources

- Render Docs: https://render.com/docs
- Vercel Docs: https://vercel.com/docs
- Express Documentation: https://expressjs.com
- React Documentation: https://react.dev
- MongoDB Atlas: https://www.mongodb.com/cloud/atlas

---

**Last Updated:** 2026-06-18
**System Version:** 1.0.0
