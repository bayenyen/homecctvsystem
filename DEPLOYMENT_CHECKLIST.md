# V380 CCTV - PTZ Fix Deployment Checklist

## Pre-Deployment Review

### What Was Fixed
- ✅ Identified V380 ONVIF service runs on port 8899 (not standard port 80)
- ✅ Updated PTZ controller to connect to port 8899
- ✅ Updated Camera model with port configuration field
- ✅ Updated database: 13 cameras configured for ONVIF on port 8899
- ✅ Tested all PTZ commands on all 3 cameras - all working

---

## Deployment Steps

### Step 1: Backup Database (Optional but Recommended)
```bash
# Export current camera configurations
mongoexport --uri "mongodb+srv://..." --collection cameras --out cameras_backup.json

# Or via MongoDB Compass:
# Right-click cameras collection → Export Collection
```

### Step 2: Verify Code Changes
Check that these files are updated:

- [ ] `backend/controllers/ptzController.js` (Line ~206)
  ```javascript
  let onvifPort = 8899; // Should be 8899, not 80
  ```

- [ ] `backend/models/Camera.js` (ptzConfig schema)
  ```javascript
  port: { type: Number, default: 8899 }
  ```

### Step 3: Restart Backend Server
```bash
cd backend
npm stop  # or Ctrl+C if running
npm start
```

**Expected Output:**
```
✓ Server running on port 5000
✓ MongoDB connected
✓ Ready for PTZ commands
```

### Step 4: Verify Database Configuration
```javascript
// Check that cameras are configured correctly
db.cameras.findOne({ ptzSupported: true })

// Should show:
{
  ptzSupported: true,
  ptzConfig: {
    protocol: "onvif",
    port: 8899
  }
}
```

### Step 5: Test PTZ Commands
Option A - Via cURL:
```bash
# Get a camera ID first
# db.cameras.findOne({ ipAddress: "192.168.1.2" })._id

CAMERA_ID="6a22c8e0aef0c3266c70b048"

# Test UP movement
curl -X POST http://localhost:5000/api/ptz/$CAMERA_ID/command \
  -H "Content-Type: application/json" \
  -d '{"command": "up", "speed": 5}'

# Expected: {"success": true, "message": "PTZ command 'up' executed"}
```

Option B - Via web interface:
1. Navigate to Cameras page
2. Click camera thumbnail or settings
3. Test PTZ controls in the camera details panel
4. Observe camera movement

Option C - Via test script:
```bash
cd backend
node utils/test-ptz-commands.js
```

### Step 6: Verify All Cameras
Test each camera individually:

- [ ] **Camera 1** (192.168.1.2)
  - [ ] UP movement works
  - [ ] STOP command works
  - [ ] LEFT/RIGHT works

- [ ] **Camera 2** (192.168.1.3)
  - [ ] UP movement works
  - [ ] STOP command works
  - [ ] LEFT/RIGHT works

- [ ] **Camera 3** (192.168.1.4)
  - [ ] UP movement works
  - [ ] STOP command works
  - [ ] LEFT/RIGHT works

---

## Health Checks

### Backend Server
```bash
# Check server is running
curl http://localhost:5000/api/health

# Expected: {"status": "ok"}
```

### Camera Discovery
```bash
curl http://localhost:5000/api/cameras/discover

# Expected: {"count": 3, "data": [...]}
```

### Database Connection
```javascript
// Via MongoDB Compass or mongosh
db.cameras.countDocuments({ ptzSupported: true })
// Expected: 13 (or similar count of PTZ-enabled cameras)
```

### Network Connectivity
```bash
# Test ONVIF port accessibility for each camera
for ip in 192.168.1.2 192.168.1.3 192.168.1.4; do
  echo "Testing $ip:8899"
  curl -v http://$ip:8899/ | head -1
done
```

---

## Rollback Plan (If Issues Occur)

### Quick Rollback
If something goes wrong, revert the code changes:

```bash
git checkout HEAD -- backend/controllers/ptzController.js
git checkout HEAD -- backend/models/Camera.js
npm start
```

### Database Rollback
If needed, restore from backup:
```bash
mongoimport --uri "mongodb+srv://..." --collection cameras --file cameras_backup.json --drop
```

---

## Post-Deployment Verification

### ✓ Success Indicators
- [ ] Backend server starts without errors
- [ ] No error messages in logs
- [ ] API responds to PTZ commands
- [ ] Camera movements are smooth
- [ ] RTSP streaming still works
- [ ] Camera discovery still works

### ✓ All Tests Passing
- [ ] Unit tests (if applicable): `npm test`
- [ ] PTZ command tests: `node utils/test-ptz-commands.js`
- [ ] API endpoint tests: Via cURL or Postman
- [ ] Manual UI testing: Via web interface

---

## Monitoring & Logs

### Check Logs
```bash
# Backend logs
tail -f backend/logs/info.log
tail -f backend/logs/error.log

# MongoDB logs (if needed)
```

### Common Log Messages
```
[info]: ONVIF PTZ: Connecting to 192.168.1.2:8899
[info]: PTZ command 'up' succeeded
[debug]: Using ONVIF profile: PROFILE_000
```

### Error Scenarios & Solutions
| Error | Cause | Solution |
|-------|-------|----------|
| ECONNREFUSED | Port wrong | Verify port is 8899 |
| ETIMEDOUT | Network issue | Check camera connectivity |
| No profiles | ONVIF disabled | Restart camera |
| Invalid speed | Parameter issue | Speed must be 1-10 |

---

## Performance Expectations

### PTZ Response Times
- Connection: ~200ms
- Command execution: ~500ms
- Total response time: ~700ms (network dependent)

### Camera Behavior
- UP/DOWN movement: Continuous until STOP
- ZOOM: Continuous until STOP
- STOP: Immediate halt
- HOME: Returns to preset position (usually center)

---

## Documentation Updates

### What to Update in Your Documentation
- [ ] Camera network diagram (port 8899 ONVIF)
- [ ] API documentation (PTZ endpoint reference)
- [ ] Deployment guide (this checklist)
- [ ] Troubleshooting guide (common PTZ issues)

### New Documentation Files
- `V380_PTZ_IMPLEMENTATION_GUIDE.md` - Technical reference
- `PTZ_FINAL_STATUS_REPORT.md` - Project summary
- `test-ptz-api.sh` - API testing script

---

## Support Contacts

### If Issues Occur
1. Check logs: `backend/logs/`
2. Verify network connectivity
3. Review deployment checklist above
4. Check V380_PTZ_IMPLEMENTATION_GUIDE.md for troubleshooting

### Key Resources
- V380_Python GitHub: https://github.com/Gowresh7/V380_Python
- ONVIF Specification: https://www.onvif.org/
- MongoDB Documentation: https://docs.mongodb.com/

---

## Deployment Approval

- [ ] Code review completed
- [ ] Tests passed
- [ ] Database backup created
- [ ] Rollback plan understood
- [ ] All team members notified

**Deployed by:** ________________  
**Date:** ________________  
**Status:** ☐ Pending ☐ In Progress ☐ Completed

---

## Sign-Off

Once everything is verified and working:

```
✅ DEPLOYMENT COMPLETE

All PTZ controls are functional on all 3 cameras.
System is ready for production use.
```

