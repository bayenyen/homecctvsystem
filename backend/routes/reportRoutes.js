const express = require('express');
const router = express.Router();
const { getDashboardStats, getCameraActivityReport, getAuditLogReport, getStorageReport, exportReport } = require('../controllers/reportController');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);
router.get('/dashboard', getDashboardStats);
router.get('/camera-activity', getCameraActivityReport);
router.get('/audit-log', authorize('admin'), getAuditLogReport);
router.get('/storage', getStorageReport);
router.get('/export', authorize('admin'), exportReport);

module.exports = router;
