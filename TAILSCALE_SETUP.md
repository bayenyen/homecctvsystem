# Tailscale VPN Setup for Remote Camera Access

Enable secure remote monitoring by connecting your local camera network to your Render backend via Tailscale VPN.

## Architecture

```
Local PC (Tailscale) ← IP: 100.x.x.1 →  VPN Network  ← Render Backend (Tailscale)
     ↓
  Cameras (192.168.1.x)
     
User in Different Country → Internet → Render Backend → VPN → Local Cameras
```

---

## Step 1: Install Tailscale Locally

### Windows PC (where cameras are)

1. Download: https://tailscale.com/download/windows
2. Run installer and complete setup
3. Click Tailscale icon in system tray → **Sign in**
4. Choose your auth method (Google, Microsoft, GitHub, etc.)
5. Approve on your phone or web browser
6. Note your **Tailscale IP** (e.g., `100.x.x.x`)

```powershell
# Verify Tailscale is running
ipconfig /all | Select-String "Tailscale"
```

---

## Step 2: Configure Render Backend with Tailscale

### Update `backend/Dockerfile`

Add Tailscale installation to the Dockerfile:

```dockerfile
# Install Tailscale in Docker
RUN apt-get update && apt-get install -y curl && \
    curl -fsSL https://tailscale.com/install.sh | sh && \
    apt-get clean

# Create tailscale auth token file (to be mounted at runtime)
RUN mkdir -p /var/lib/tailscale
```

### Add to `render.yaml`

Add environment variable for Tailscale auth token:

```yaml
  - key: TAILSCALE_AUTHKEY
    sync: false
```

---

## Step 3: Get Tailscale Auth Token

1. Go to: https://login.tailscale.com/admin/settings/keys
2. Click **Generate auth key**
3. Choose:
   - ✅ Reusable (so you can use it multiple times)
   - ✅ Ephemeral (auto-removes device if disconnected for 30 days)
4. Copy the key (looks like: `tskey-xxxxxxxxxxxxxx`)
5. **Keep this secret** - add to Render only

---

## Step 4: Update Backend Configuration

### Create `backend/.env.production`

```bash
# ... existing vars ...

# Tailscale VPN
TAILSCALE_ENABLED=true
TAILSCALE_AUTHKEY=tskey-xxxxxxxxxxxxx  # From Step 3
TAILSCALE_HOSTNAME=v380-backend

# Camera URLs now use Tailscale IPs instead of 192.168.x.x
# These will be automatically rewritten when cameras connect
```

---

## Step 5: Deploy to Render

1. Commit and push changes:
   ```bash
   git add .
   git commit -m "Add Tailscale VPN support for remote camera access"
   git push
   ```

2. In Render dashboard:
   - Select `v380-cctv-backend` service
   - Go to **Environment**
   - Add `TAILSCALE_AUTHKEY` with token from Step 3
   - Deploy trigger starts automatically

3. Wait for deployment (check logs for "Tailscale connected")

---

## Step 6: Update Camera RTSP URLs

Once both local PC and Render backend are on Tailscale:

1. Run this script to discover Tailscale IPs:
   ```powershell
   tailscale status
   ```
   
   Output shows:
   ```
   your-local-pc      100.x.x.1    Windows
   v380-backend       100.y.y.y    Docker
   ```

2. Update camera RTSP URLs from `192.168.1.x` to `100.x.x.x`:
   
   **Frontend Dashboard:**
   - Edit each camera
   - Change RTSP URL: `rtsp://192.168.1.x:554/...` → `rtsp://100.x.x.x:554/...`
   - Save

   **Or via Backend API:**
   ```bash
   PUT /api/cameras/{cameraId}
   {
     "rtspUrl": "rtsp://100.x.x.x:554/h264"
   }
   ```

---

## Step 7: Verify Remote Access

### From Your Local Network
- Open frontend: http://localhost:5173
- Cameras should show live streams (using Tailscale)

### From Different Network (e.g., phone hotspot, different country)
- Open: https://cctvsystem.vercel.app (or your Vercel URL)
- Login with your credentials
- Cameras should show live streams
- **No port forwarding, no firewall rules needed!**

---

## Testing Checklist

- [ ] Local PC has Tailscale running (`tailscale status`)
- [ ] Render backend deployed with `TAILSCALE_AUTHKEY`
- [ ] Render logs show "Tailscale connected successfully"
- [ ] Camera URLs updated to Tailscale IPs (100.x.x.x)
- [ ] Frontend can access live streams from local network
- [ ] Frontend can access live streams from different network
- [ ] PTZ controls work from remote network

---

## Troubleshooting

### Backend can't connect to cameras
```bash
# From Render logs, check:
# "Failed to reach camera at 100.x.x.x:554"

# Solution: Verify camera Tailscale IP is correct
# Local PC: tailscale status
# Update camera URL in dashboard
```

### Tailscale not showing on Render
```bash
# Check Render logs for:
curl: (6) Could not resolve host: tailscale.com

# Solution: Check Docker internet access, retry deploy
```

### Can access from local but not remote
```bash
# Render might be using wrong URL

# Check:
1. Frontend VITE_API_URL points to Render backend
2. Render backend has TAILSCALE_AUTHKEY set
3. Camera URLs use Tailscale IPs (not localhost)
```

---

## Security Notes

✅ **Tailscale is encrypted end-to-end** - only you can access your network
✅ **No open ports to internet** - firewalls don't matter
✅ **Auth key is single-use** - can revoke anytime from admin panel
⚠️ **Keep auth key secret** - treat like a password

---

## Next Steps

1. Install Tailscale locally
2. Get auth token
3. Update Dockerfile and render.yaml
4. Deploy to Render
5. Update camera URLs
6. Test from different network

**Need help with any step?** Let me know!
