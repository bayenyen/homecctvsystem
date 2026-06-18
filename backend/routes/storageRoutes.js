// routes/storageRoutes.js
const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const storageService = require('../services/storageService');

router.use(protect);

router.get('/stats', async (req, res) => {
  try {
    const stats = await storageService.getStorageStats();
    res.json({ success: true, data: stats });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.get('/by-camera', authorize('admin'), async (req, res) => {
  try {
    const data = await storageService.getStorageByCamera();
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.post('/auto-clean', authorize('admin'), async (req, res) => {
  try {
    const deleted = await storageService.autoDeleteOldestRecordings();
    res.json({ success: true, message: `Deleted ${deleted} oldest recordings`, deleted });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
