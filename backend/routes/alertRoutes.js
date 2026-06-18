const express = require('express');
const router = express.Router();
const { getAlerts, getUnreadCount, markAsRead, markAllAsRead, acknowledgeAlert, deleteAlert } = require('../controllers/alertController');
const { protect } = require('../middleware/auth');

router.use(protect);
router.get('/', getAlerts);
router.get('/unread/count', getUnreadCount);
router.put('/mark-all-read', markAllAsRead);
router.put('/:id/read', markAsRead);
router.put('/:id/acknowledge', acknowledgeAlert);
router.delete('/:id', deleteAlert);

module.exports = router;
