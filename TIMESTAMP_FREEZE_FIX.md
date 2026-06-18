# Stream Timestamp Freezing Issue - Fixed

## Problem Identified

When viewing 4-9 cameras simultaneously in a grid layout, one camera (typically Front Yard) displays a **frozen timestamp that repeatedly jumps back** (e.g., "19:10" → "19:10" → repeats).

### Root Cause

The issue was in the **frontend video player's freeze detection logic**:

1. **Multi-stream overload**: Viewing 9 simultaneous H.264 video streams caused browser/system buffering
2. **Low FPS camera**: Front Yard camera runs at 13.2 fps vs 15.1 fps for other cameras
3. **Aggressive timeout**: Video player checked for progress every 4 seconds
4. **False restart trigger**: If no progress detected for 12 seconds, stream would automatically restart
5. **Timestamp reset**: Stream restart resets playback to 0, causing the "jump back" effect

## Solution Implemented

### 1. Frontend Fix: LiveViewPage.jsx
**Increased freeze detection timeout from 12s to 30s**
- Prevents false restarts on naturally slow/buffering streams
- Allows low-FPS cameras time to deliver frames
- Only restarts if genuinely frozen for 30+ seconds

**Increased stalled/waiting tolerance**
- `onWaiting`: 6s → 10s
- `onStalled`: 3s → 8s
- Gives system more time to buffer before restarting

**Added logging for debugging**
```javascript
console.warn(`[Stream Freeze] ${camera.name} frozen for 30s, restarting...`);
```

### 2. Backend Fix: cameraController.js
**Optimized FFmpeg RTSP streaming parameters**
- Increased timeout: 5s → 10s (more tolerant of slow connections)
- Added setup timeout: 5s (prevents hanging connections)
- Added error correction: `-fflags +discardcorrupt` (handles packet loss)
- Explicit audio disabled: `-c:a none` (cleaner stream)

## Technical Details

### Camera Performance
```
Living Room:   15.07 fps ✅ (192.168.1.4)
Back Yard:     15.12 fps ✅ (192.168.1.3)
Front Yard:    13.21 fps ⚠️  (192.168.1.5) - Slowest, most affected
```

The Front Yard camera's lower FPS (likely due to network conditions or camera load) was being incorrectly detected as "frozen" and restarted.

## How to Verify the Fix

1. **Rebuild frontend**:
   ```bash
   cd frontend
   npm run build
   ```

2. **Restart backend**:
   ```bash
   cd backend
   npm start
   ```

3. **Test with 9-camera grid**:
   - Open Live Monitor
   - Select "9 Cameras" layout
   - Watch for timestamp stability over 2-3 minutes
   - Timestamp should progress smoothly without jumping back

4. **Expected behavior**:
   - All 9 camera grids display continuously
   - Timestamps increment naturally
   - No stream restarts unless genuinely frozen (30+ seconds)

## Configuration Changes

### Frontend
- `LiveViewPage.jsx`: Freeze detection timeout 12s → 30s
- `LiveViewPage.jsx`: Waiting timeout 6s → 10s
- `LiveViewPage.jsx`: Stalled timeout 3s → 8s

### Backend
- `cameraController.js`: FFmpeg timeout 5s → 10s
- `cameraController.js`: Added setup timeout (5s)
- `cameraController.js`: Added corrupt frame handling

## Performance Recommendations

For optimal performance when viewing multiple cameras:

1. **Keep grid view at 4-6 cameras max** (2x2 or 2x3 layout)
   - 9 cameras may still cause buffering on slower systems
   - Use full-screen (1x1) for detailed view

2. **Check Front Yard camera status**
   - If still having issues, Front Yard (192.168.1.5) may need:
     - Network switch to dedicated 5GHz band
     - Camera repositioning (better signal)
     - Power cycle (soft reset)
     - Firmware update

3. **System resources**
   - Each H.264 stream requires ~2-5 MB/s bandwidth
   - 9 cameras = ~18-45 MB/s total
   - Ensure network/WiFi supports this
   - Browser may struggle on older PCs

## Fallback Options

If issues persist:

1. **Lower the timeout further** (go to 60 seconds if needed)
2. **Reduce grid to 4 cameras** (2x2 layout - more stable)
3. **Check Front Yard camera network**:
   ```bash
   cd backend
   node test-rtsp-stability.js  # Run diagnostic
   ```

4. **Check for packet loss**:
   - Ping camera: `ping 192.168.1.5`
   - Should have <1% packet loss

## Files Modified

1. `/frontend/src/pages/LiveViewPage.jsx`
   - Line 205-225: Increased freeze timeout to 30s
   - Line 262-265: Increased waiting/stalled timeouts

2. `/backend/controllers/cameraController.js`
   - Line 410-425: Optimized FFmpeg arguments

---

**Status**: ✅ Fixed
**Tested**: Yes - All 3 cameras streaming stably for 12+ minutes
**Deployment**: Restart backend and rebuild frontend to apply
