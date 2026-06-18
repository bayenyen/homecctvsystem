# Cloud Deployment: Vercel + Render

This project can run with the React frontend on Vercel and the Node/Express backend on Render, but the cameras themselves are usually on private LAN IPs such as `192.168.x.x`. A cloud backend cannot reach those private IPs unless you provide a network path.

## Recommended Shape

1. Deploy `frontend/` to Vercel.
2. Deploy `backend/` to Render using the included Dockerfile so FFmpeg is available.
3. Use MongoDB Atlas for the database.
4. For remote live monitoring, make the camera streams reachable by the Render backend using one of these:
   - site-to-cloud VPN, such as Tailscale, WireGuard, or ZeroTier;
   - a secured RTSP/HTTPS tunnel from a small PC/NVR on the camera network;
   - carefully firewalled port forwarding to each camera or to an on-prem proxy.

LAN discovery is intentionally disabled in cloud by default. Discovery needs UDP broadcast/subnet scanning, so it only makes sense from a backend running inside the same network as the cameras.

## Why This Is Needed

The backend streams live video by running FFmpeg against each camera RTSP URL. If a camera is saved as `rtsp://192.168.1.5:554/...`, Render will try to open that private address from Render's network, not from your store/home network. It will fail unless you connect those networks or expose a secure relay.

## Render Backend

Create a Render Web Service from this repository and use the Blueprint (`render.yaml`) or configure manually:

- Root directory: `backend`
- Runtime: Docker
- Health check path: `/api/health`
- Required environment variables:
  - `MONGO_URI`
  - `JWT_SECRET`
  - `CLIENT_URLS=https://your-vercel-app.vercel.app,http://localhost:5173`
  - `ENABLE_LAN_DISCOVERY=false`
  - `FFMPEG_PATH=ffmpeg`

Render's Node quickstart uses a build command and a start command for Express apps, and Render web services need to bind to a public HTTP port. The included Docker setup sets `PORT=10000` and installs FFmpeg.

## Vercel Frontend

Deploy the `frontend/` folder as a Vite app.

Set this Vercel environment variable:

```text
VITE_API_URL=https://your-render-service.onrender.com
```

The included `frontend/vercel.json` rewrites all routes to `index.html` so React Router pages work on refresh.

## Adding Cameras

For cameras not yet added to the system:

1. Run the backend locally or on a trusted machine inside the camera LAN.
2. Set `ENABLE_LAN_DISCOVERY=true`.
3. Open the frontend against that local backend and use discovery.
4. Save the camera with a stream URL that the cloud backend can reach later, such as a VPN/tunnel/proxy address.

For cameras already added:

- The dashboard can show them remotely only if the Render backend can reach their stream URLs.
- Their online/offline status is based on the backend's ability to connect, not on the V380 mobile app's cloud status.

## Security Checklist

- Rotate the MongoDB password and replace the current `JWT_SECRET` before deploying.
- Do not commit `.env`.
- Keep `ENABLE_LAN_DISCOVERY=false` on public Render.
- Prefer VPN/tunnel access over exposing camera RTSP ports directly to the internet.
- Use strong camera passwords and unique credentials per site when possible.

## Official References

- Vercel Vite deployment docs: https://vercel.com/docs/frameworks/frontend/vite
- Render Express deployment docs: https://render.com/docs/deploy-node-express-app
- Render web services docs: https://render.com/docs/web-services
