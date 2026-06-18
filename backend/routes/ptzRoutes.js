const express = require('express');
const router = express.Router();
const { sendPTZCommand, getPresets } = require('../controllers/ptzController');
const { protect } = require('../middleware/auth');

router.use(protect);
router.post('/:cameraId/command', sendPTZCommand);
router.get('/:cameraId/presets', getPresets);

module.exports = router;
