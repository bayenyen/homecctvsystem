# V380 CCTV Management and Recording System

A full-stack MERN application for managing V380 / V380PRO IP cameras — recording streams to server storage, monitoring live feeds, receiving alerts, and generating reports.

---

## 📋 Table of Contents
- [Features](#features)
- [Requirements](#requirements)
- [Quick Start](#quick-start)
- [Environment Variables](#environment-variables)
- [Project Structure](#project-structure)
- [API Documentation](#api-documentation)
- [Camera Configuration](#camera-configuration)
- [FFmpeg Setup](#ffmpeg-setup)
- [Roles & Permissions](#roles--permissions)
- [Troubleshooting](#troubleshooting)

---

## ✨ Features

| Feature | Description |
|---|---|
| **Authentication** | JWT login, bcrypt passwords, account lockout after 5 failed attempts |
| **Role-Based Access** | Admin (full) and Security Staff (view/monitor) roles |
| **Camera Management** | Add/edit/delete V380 cameras, auto-generate RTSP URLs |
| **Live Monitoring** | Multi-camera grid view with 1/4/9 camera layouts |
| **Auto Recording** | FFmpeg-based continuous/scheduled/manual/motion recording |
| **Playback** | Seek-enabled video player with HTTP range request support |
| **Storage Manager** | Disk usage stats, per-camera breakdown, auto-delete oldest |
| **Alerts** | Real-time Socket.IO alerts for camera offline, storage, failures |
| **Reports** | Camera activity, audit logs, storage charts, CSV/JSON export |
| **PTZ Controls** | Pan/Tilt/Zoom via HTTP or ONVIF (if camera supports it) |
| **User Management** | Add/edit/delete users, role assignment, password reset |
| **Audit Logs** | Every action logged with user, IP, and timestamp |

---

## 🔧 Requirements

- **Node.js** >= 18.x
- **MongoDB** (local or Atlas)
- **FFmpeg** installed on the server machine

### Install FFmpeg

**Ubuntu/Debian:**
```bash
sudo apt update && sudo apt install ffmpeg -y
```

**macOS:**
```bash
brew install ffmpeg
```

**Windows:**
Download from https://ffmpeg.org/download.html and add to PATH.

**Verify:**
```bash
ffmpeg -version
```

---

## 🚀 Quick Start

### 1. Clone / Extract the project

```
v380-cctv/
├── backend/
└── frontend/
```

### 2. Configure Backend

```bash
cd backend
cp .env.example .env
```

Edit `.env` — **the only required change is `MONGO_URI`**:

```env
MONGO_URI=mongodb://localhost:27017/v380_cctv
JWT_SECRET=change_this_to_a_long_random_string
PORT=5000
```

### 3. Install Backend Dependencies

```bash
cd backend
npm install
```

### 4. Create Admin Account

```bash
npm run seed
```

Output:
```
✅ Admin account created!
   Username: admin
   Password: Admin@123
```

### 5. Start Backend

```bash
npm run dev       # development (nodemon)
npm start         # production
```

### 6. Install Frontend Dependencies

```bash
cd frontend
npm install
```

### 7. Start Frontend

```bash
npm run dev
```

### 8. Open in Browser

```
http://localhost:5173
```

Login with `admin` / `Admin@123`

---

## ⚙️ Environment Variables

All variables are in `backend/.env`. Only `MONGO_URI` is required.

```env
# ── REQUIRED ─────────────────────────────────────────
MONGO_URI=mongodb://localhost:27017/v380_cctv
JWT_SECRET=your_super_secret_jwt_key

# ── OPTIONAL ─────────────────────────────────────────
PORT=5000
NODE_ENV=development
JWT_EXPIRE=7d

# Recording storage path (relative to /backend)
RECORDINGS_PATH=./recordings

# Storage threshold before warning (GB)
MAX_STORAGE_GB=50

# Auto-delete oldest recordings when disk is full
AUTO_DELETE_ON_FULL=true

# FFmpeg binary path (leave blank for system default)
FFMPEG_PATH=

# Frontend origin for CORS
CLIENT_URL=http://localhost:5173

# Seed admin credentials (for npm run seed)
SEED_ADMIN_USERNAME=admin
SEED_ADMIN_PASSWORD=Admin@123
SEED_ADMIN_EMAIL=admin@v380cctv.local
```

---

## 📁 Project Structure

```
v380-cctv/
├── backend/
│   ├── config/
│   │   ├── database.js          # MongoDB connection
│   │   └── socket.js            # Socket.IO setup + emitters
│   ├── controllers/
│   │   ├── authController.js    # Login, logout, change password
│   │   ├── cameraController.js  # CRUD + recording toggle
│   │   ├── recordingController.js # Recordings CRUD + streaming
│   │   ├── userController.js    # Admin user management
│   │   ├── alertController.js   # Alerts CRUD
│   │   ├── reportController.js  # Dashboard stats + exports
│   │   └── ptzController.js     # PTZ commands
│   ├── middleware/
│   │   └── auth.js              # JWT protect + authorize + checkPermission
│   ├── models/
│   │   ├── User.js              # User with bcrypt + lockout
│   │   ├── Camera.js            # V380 camera config
│   │   ├── Recording.js         # Recording metadata
│   │   ├── Alert.js             # System alerts
│   │   └── AuditLog.js          # Action audit trail
│   ├── routes/
│   │   ├── authRoutes.js
│   │   ├── cameraRoutes.js
│   │   ├── recordingRoutes.js
│   │   ├── userRoutes.js
│   │   ├── alertRoutes.js
│   │   ├── reportRoutes.js
│   │   ├── storageRoutes.js
│   │   └── ptzRoutes.js
│   ├── services/
│   │   ├── recordingService.js  # FFmpeg process manager
│   │   ├── schedulerService.js  # node-cron jobs
│   │   └── storageService.js    # Disk stats + auto-clean
│   ├── utils/
│   │   ├── logger.js            # Winston logger
│   │   ├── fileSystem.js        # Ensure directories exist
│   │   └── seed.js              # Admin seed script
│   ├── recordings/              # Auto-created: camera/date/file.mp4
│   ├── logs/                    # Auto-created: error.log, combined.log
│   ├── server.js                # Entry point
│   ├── package.json
│   └── .env.example
│
└── frontend/
    ├── src/
    │   ├── context/
    │   │   ├── AuthContext.jsx      # User auth state
    │   │   └── SocketContext.jsx    # Socket.IO + real-time events
    │   ├── layouts/
    │   │   └── DashboardLayout.jsx  # Sidebar + top navbar
    │   ├── pages/
    │   │   ├── LoginPage.jsx
    │   │   ├── DashboardPage.jsx
    │   │   ├── CamerasPage.jsx
    │   │   ├── LiveViewPage.jsx
    │   │   ├── RecordingsPage.jsx
    │   │   ├── PlaybackPage.jsx
    │   │   ├── AlertsPage.jsx
    │   │   ├── UsersPage.jsx
    │   │   ├── ReportsPage.jsx
    │   │   ├── StoragePage.jsx
    │   │   └── SettingsPage.jsx
    │   ├── components/
    │   │   ├── dashboard/           # StatCard, StorageGauge, etc.
    │   │   ├── cameras/             # CameraCard, CameraFormModal
    │   │   ├── alerts/              # AlertDropdown
    │   │   ├── ptz/                 # PTZControls
    │   │   └── users/               # UserFormModal
    │   ├── services/
    │   │   └── api.js               # Axios instance + service helpers
    │   ├── App.jsx
    │   ├── main.jsx
    │   └── index.css
    ├── vite.config.js
    ├── tailwind.config.js
    └── package.json
```

---

## 📡 API Documentation

All endpoints are prefixed with `/api`. Protected routes require:
```
Authorization: Bearer <token>
```

### Authentication

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/auth/login` | Public | Login → returns JWT |
| GET | `/api/auth/me` | 🔒 | Get current user |
| POST | `/api/auth/logout` | 🔒 | Logout (logs action) |
| PUT | `/api/auth/change-password` | 🔒 | Change own password |

### Cameras

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/cameras` | 🔒 | List all cameras |
| GET | `/api/cameras/:id` | 🔒 | Get one camera |
| POST | `/api/cameras` | 🔒 Admin | Add camera |
| PUT | `/api/cameras/:id` | 🔒 Admin | Update camera |
| DELETE | `/api/cameras/:id` | 🔒 Admin | Remove camera |
| POST | `/api/cameras/:id/start-recording` | 🔒 | Start recording |
| POST | `/api/cameras/:id/stop-recording` | 🔒 | Stop recording |
| POST | `/api/cameras/:id/check-status` | 🔒 | Ping camera |
| GET | `/api/cameras/stats/overview` | 🔒 | Dashboard stats |

### Recordings

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/recordings` | 🔒 | List recordings (filterable) |
| GET | `/api/recordings/:id` | 🔒 | Get recording info |
| GET | `/api/recordings/:id/stream` | 🔒 | Stream video (range-supported) |
| GET | `/api/recordings/:id/download` | 🔒 | Download MP4 file |
| DELETE | `/api/recordings/:id` | 🔒 Admin | Delete recording |
| GET | `/api/recordings/stats/overview` | 🔒 | Recording stats |

### Users (Admin only)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/users` | 🔒 Admin | List users |
| POST | `/api/users` | 🔒 Admin | Create user |
| PUT | `/api/users/:id` | 🔒 Admin | Update user |
| DELETE | `/api/users/:id` | 🔒 Admin | Delete user |
| PUT | `/api/users/:id/reset-password` | 🔒 Admin | Reset password |

### Alerts

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/alerts` | 🔒 | List alerts |
| GET | `/api/alerts/unread/count` | 🔒 | Unread count |
| PUT | `/api/alerts/:id/read` | 🔒 | Mark read |
| PUT | `/api/alerts/mark-all-read` | 🔒 | Mark all read |
| PUT | `/api/alerts/:id/acknowledge` | 🔒 | Acknowledge |
| DELETE | `/api/alerts/:id` | 🔒 | Delete alert |

### Reports

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/reports/dashboard` | 🔒 | Full dashboard stats |
| GET | `/api/reports/camera-activity` | 🔒 | Activity report |
| GET | `/api/reports/audit-log` | 🔒 Admin | Audit log |
| GET | `/api/reports/storage` | 🔒 | Storage breakdown |
| GET | `/api/reports/export?type=recordings&format=csv` | 🔒 Admin | Export data |

### PTZ

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/ptz/:cameraId/command` | 🔒 | Send PTZ command |
| GET | `/api/ptz/:cameraId/presets` | 🔒 | Get presets |

**PTZ Commands:** `up`, `down`, `left`, `right`, `zoom_in`, `zoom_out`, `home`, `stop`

### Storage

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/storage/stats` | 🔒 | Disk usage stats |
| GET | `/api/storage/by-camera` | 🔒 Admin | Per-camera breakdown |
| POST | `/api/storage/auto-clean` | 🔒 Admin | Delete oldest recordings |

---

## 📷 Camera Configuration

### V380 / V380PRO RTSP Stream URLs

Most V380 cameras expose RTSP on port 554. Common URL formats:

```
rtsp://admin:password@192.168.1.100:554/stream
rtsp://admin:password@192.168.1.100:554/ch01/0
rtsp://admin:password@192.168.1.100:8554/live
```

### Adding a Camera (recommended fields)

| Field | Example | Notes |
|-------|---------|-------|
| Name | Front Door | Display name |
| IP Address | 192.168.1.100 | Camera LAN IP |
| Port | 554 | RTSP port (default 554) |
| Username | admin | Camera login |
| Password | your_pass | Camera login |
| Stream URL | *(leave blank)* | Auto-generated from above |
| Recording Mode | continuous | Starts recording automatically |

If auto-generated URL doesn't work, enter the full RTSP URL manually.

### PTZ Setup

V380 cameras support **ONVIF PTZ** on port **8899** (not the standard port 80):

**ONVIF (V380 Standard - RECOMMENDED):**
1. Protocol: Select "ONVIF"
2. ONVIF Port: 8899 (automatically configured)
3. Credentials: Use camera username/password
4. PTZ endpoint: `http://{ip}:8899/onvif/ptz`

**Commands available:**
- `up`, `down`, `left`, `right` — Pan/Tilt movement
- `zoom_in`, `zoom_out` — Zoom control
- `home` — Return to home position
- `stop` — Stop all movement
- Speed parameter: 1-10 (default: 5)

**HTTP (Legacy - if ONVIF not available):**
1. Protocol: Select "HTTP (V380 Standard)"
2. Control port: Usually 80 or 8080
3. PTZ commands send to: `http://{ip}:{port}/ptzctrl.cgi?cmd={command}`

---

## 🎬 FFmpeg Setup

The system uses FFmpeg to:
- Record RTSP streams to MP4 files
- Segment recordings automatically (1 hour per file)
- Handle stream reconnection on camera drop

If FFmpeg is not on your system PATH, set:
```env
FFMPEG_PATH=/usr/local/bin/ffmpeg
```

Test FFmpeg RTSP recording manually:
```bash
ffmpeg -rtsp_transport tcp -i "rtsp://admin:pass@192.168.1.100:554/stream" \
  -c:v copy -c:a aac -t 60 test_output.mp4
```

---

## 👤 Roles & Permissions

| Permission | Admin | Security |
|------------|-------|---------|
| View cameras | ✅ | ✅ |
| Add/edit/delete cameras | ✅ | ❌ |
| View live feeds | ✅ | ✅ |
| View recordings | ✅ | ✅ |
| Download recordings | ✅ | ❌ |
| Delete recordings | ✅ | ❌ |
| Manage users | ✅ | ❌ |
| View reports | ✅ | ✅ |
| Export reports | ✅ | ❌ |
| Storage management | ✅ | ❌ |
| System settings | ✅ | ❌ |
| Receive alerts | ✅ | ✅ |

---

## 🔄 Scheduled Tasks

| Job | Frequency | Description |
|-----|-----------|-------------|
| Camera health check | Every 2 min | Ping all cameras, update status, emit Socket.IO |
| Storage monitor | Every 15 min | Check disk, alert if > 80%, auto-clean if > 90% |
| Update file sizes | Every 5 min | Update active recording sizes in DB |
| Cleanup orphans | Daily 3 AM | Mark stale "recording" entries as failed |

---

## 🐛 Troubleshooting

### "FFmpeg not found"
Install FFmpeg and make sure it's on PATH, or set `FFMPEG_PATH` in `.env`.

### "MongoDB connection error"
- Check `MONGO_URI` in `.env`
- Ensure MongoDB service is running: `sudo systemctl start mongod`
- For Atlas, whitelist your IP address

### Recording doesn't start
- Verify camera RTSP URL is reachable: `ffmpeg -i "rtsp://..." -t 5 /tmp/test.mp4`
- Check firewall allows port 554 from server to camera
- Try `rtsp_transport tcp` if UDP is blocked

### Camera shows "Unknown" status
The status checker does a TCP connect to the RTSP port. If the camera uses a non-standard port, update the camera's Port field.

### Frontend can't connect to backend
Check `VITE_API_URL` — by default the Vite dev proxy forwards `/api` to `http://localhost:5000`. If backend is on a different host/port, set:
```env
# frontend/.env
VITE_API_URL=http://your-server:5000
```

---

## 🛡️ Security Notes

- Change `JWT_SECRET` to a strong random string before production
- Change admin password after first login
- Use HTTPS (nginx reverse proxy with SSL) in production
- Restrict MongoDB to localhost or use auth
- Consider placing behind VPN if exposed to internet

---

## 📦 Production Deployment

### Build Frontend
```bash
cd frontend
npm run build
# Serve the dist/ folder with nginx or from Express static
```

### Backend with PM2
```bash
npm install -g pm2
cd backend
pm2 start server.js --name v380-cctv
pm2 save
pm2 startup
```

### Nginx Config Example
```nginx
server {
  listen 80;
  server_name your-domain.com;

  location /api { proxy_pass http://localhost:5000; }
  location /recordings { proxy_pass http://localhost:5000; }
  location / { root /path/to/frontend/dist; try_files $uri /index.html; }
}
```
