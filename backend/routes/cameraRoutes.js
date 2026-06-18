const express = require('express');
const router = express.Router();
const {
  getCameras,
  getCamera,
  addCamera,
  updateCamera,
  deleteCamera,
  startRecording,
  stopRecording,
  checkCameraStatus,
  streamCameraLive,
  discoverNetworkCameras,
  getCameraStats,
  probeRtsp,
  reprobeCameras
} = require('../controllers/cameraController');
const { protect, authorize } = require('../middleware/auth');

const requireLanDiscoveryEnabled = (req, res, next) => {
  if (process.env.ENABLE_LAN_DISCOVERY === 'true') {
    return next();
  }

  return res.status(403).json({
    success: false,
    message: 'LAN discovery is disabled on this server. Run discovery from a backend inside the camera network, or set ENABLE_LAN_DISCOVERY=true for trusted local deployments.'
  });
};

router.use(protect);

router.get('/stats/overview', getCameraStats);
router.get('/discover', authorize('admin'), requireLanDiscoveryEnabled, discoverNetworkCameras);
router.post('/probe', authorize('admin'), requireLanDiscoveryEnabled, probeRtsp);
router.post('/reprobe', authorize('admin'), reprobeCameras);
router.get('/', getCameras);
router.get('/:id/live', streamCameraLive);
router.get('/:id', getCamera);
router.post('/', authorize('admin'), addCamera);
router.put('/:id', authorize('admin'), updateCamera);
router.delete('/:id', authorize('admin'), deleteCamera);
router.post('/:id/start-recording', startRecording);
router.post('/:id/stop-recording', stopRecording);
router.post('/:id/check-status', checkCameraStatus);

module.exports = router;
