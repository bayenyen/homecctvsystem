/**
 * Alert Controller
 */

const Alert = require('../models/Alert');
const logger = require('../utils/logger');

const getAlerts = async (req, res) => {
  try {
    const { type, severity, isRead, page = 1, limit = 50 } = req.query;
    const query = {};
    if (type) query.type = type;
    if (severity) query.severity = severity;
    if (isRead !== undefined) query.isRead = isRead === 'true';

    const total = await Alert.countDocuments(query);
    const alerts = await Alert.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .populate('camera', 'name')
      .populate('user', 'username');

    res.json({ success: true, total, data: alerts });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

const getUnreadCount = async (req, res) => {
  try {
    const count = await Alert.countDocuments({ isRead: false });
    res.json({ success: true, count });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

const markAsRead = async (req, res) => {
  try {
    await Alert.findByIdAndUpdate(req.params.id, {
      isRead: true,
      $addToSet: { readBy: { user: req.user._id, readAt: new Date() } }
    });
    res.json({ success: true, message: 'Alert marked as read' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

const markAllAsRead = async (req, res) => {
  try {
    await Alert.updateMany({ isRead: false }, { $set: { isRead: true } });
    res.json({ success: true, message: 'All alerts marked as read' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

const acknowledgeAlert = async (req, res) => {
  try {
    await Alert.findByIdAndUpdate(req.params.id, {
      acknowledged: true,
      acknowledgedBy: req.user._id,
      acknowledgedAt: new Date()
    });
    res.json({ success: true, message: 'Alert acknowledged' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

const deleteAlert = async (req, res) => {
  try {
    await Alert.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Alert deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

module.exports = { getAlerts, getUnreadCount, markAsRead, markAllAsRead, acknowledgeAlert, deleteAlert };
