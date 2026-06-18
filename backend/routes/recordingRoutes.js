// routes/recordingRoutes.js
const express = require('express');
const router = express.Router();
const {
  getRecordings, getRecording, downloadRecording,
  streamRecording, deleteRecording, getRecordingStats
} = require('../controllers/recordingController');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);
router.get('/stats/overview', getRecordingStats);
router.get('/', getRecordings);
router.get('/:id', getRecording);
router.get('/:id/stream', streamRecording);
router.get('/:id/download', downloadRecording);
router.delete('/:id', authorize('admin'), deleteRecording);

module.exports = router;
