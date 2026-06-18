/**
 * Reports Controller
 */

const Camera = require('../models/Camera');
const Recording = require('../models/Recording');
const Alert = require('../models/Alert');
const AuditLog = require('../models/AuditLog');
const User = require('../models/User');
const storageService = require('../services/storageService');
const logger = require('../utils/logger');

const getDashboardStats = async (req, res) => {
  try {
    const [cameraStats, recordingStats, storageStats, recentAlerts, todayLogins] = await Promise.all([
      // Camera stats
      Camera.aggregate([
        { $match: { isActive: true } },
        { $group: { _id: '$status', count: { $sum: 1 } } }
      ]),
      // Recording stats
      Recording.aggregate([
        { $match: { isDeleted: false } },
        { $group: {
          _id: null,
          total: { $sum: 1 },
          active: { $sum: { $cond: [{ $eq: ['$status', 'recording'] }, 1, 0] } },
          totalSize: { $sum: '$fileSize' }
        }}
      ]),
      // Storage stats
      storageService.getStorageStats(),
      // Recent alerts
      Alert.find().sort({ createdAt: -1 }).limit(10).populate('camera', 'name'),
      // Today's logins
      AuditLog.countDocuments({
        action: 'login',
        createdAt: { $gte: new Date(new Date().setHours(0, 0, 0, 0)) }
      })
    ]);

    // Process camera stats
    const cameras = { total: 0, online: 0, offline: 0, unknown: 0, disabled: 0 };
    cameraStats.forEach(s => {
      cameras.total += s.count;
      cameras[s._id] = (cameras[s._id] || 0) + s.count;
    });

    const recordings = recordingStats[0] || { total: 0, active: 0, totalSize: 0 };

    res.json({
      success: true,
      data: {
        cameras,
        recordings: {
          ...recordings,
          totalSizeFormatted: storageService.formatBytes(recordings.totalSize)
        },
        storage: storageStats,
        recentAlerts,
        todayLogins
      }
    });
  } catch (error) {
    logger.error('Dashboard stats error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

const getCameraActivityReport = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const match = {};
    if (startDate) match.createdAt = { $gte: new Date(startDate) };
    if (endDate) match.createdAt = { ...match.createdAt, $lte: new Date(endDate + 'T23:59:59') };

    const data = await Recording.aggregate([
      { $match: { ...match, isDeleted: false } },
      { $group: {
        _id: { camera: '$camera', date: '$dateString' },
        cameraName: { $first: '$cameraName' },
        recordings: { $sum: 1 },
        totalDuration: { $sum: '$duration' },
        totalSize: { $sum: '$fileSize' }
      }},
      { $sort: { '_id.date': -1 } }
    ]);

    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

const getAuditLogReport = async (req, res) => {
  try {
    const { startDate, endDate, action, username, page = 1, limit = 50 } = req.query;
    const query = {};
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate + 'T23:59:59');
    }
    if (action) query.action = action;
    if (username) query.username = { $regex: username, $options: 'i' };

    const total = await AuditLog.countDocuments(query);
    const logs = await AuditLog.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .populate('user', 'username fullName');

    res.json({ success: true, total, data: logs });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

const getStorageReport = async (req, res) => {
  try {
    const [storageStats, byCamera, dailyUsage] = await Promise.all([
      storageService.getStorageStats(),
      storageService.getStorageByCamera(),
      Recording.aggregate([
        { $match: { isDeleted: false, status: 'completed' } },
        { $group: {
          _id: '$dateString',
          size: { $sum: '$fileSize' },
          count: { $sum: 1 }
        }},
        { $sort: { _id: -1 } },
        { $limit: 30 }
      ])
    ]);

    res.json({ success: true, data: { storageStats, byCamera, dailyUsage } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

const exportReport = async (req, res) => {
  try {
    const { type, format, startDate, endDate } = req.query;

    let data = [];
    let filename = `report_${type}_${new Date().toISOString().split('T')[0]}`;

    if (type === 'recordings') {
      const query = { isDeleted: false };
      if (startDate) query.startTime = { $gte: new Date(startDate) };
      if (endDate) query.startTime = { ...query.startTime, $lte: new Date(endDate + 'T23:59:59') };
      data = await Recording.find(query).populate('camera', 'name location').lean();
    } else if (type === 'alerts') {
      data = await Alert.find().sort({ createdAt: -1 }).limit(1000).lean();
    } else if (type === 'audit') {
      data = await AuditLog.find().sort({ createdAt: -1 }).limit(1000).lean();
    }

    if (format === 'csv') {
      const csv = convertToCSV(data, type);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}.csv"`);
      res.send(csv);
    } else {
      // JSON export
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}.json"`);
      res.json(data);
    }
  } catch (error) {
    logger.error('Export error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

const convertToCSV = (data, type) => {
  if (!data.length) return '';

  const flatData = data.map(item => {
    const flat = {};
    for (const [key, val] of Object.entries(item)) {
      if (typeof val === 'object' && val !== null && !Array.isArray(val)) {
        flat[key] = JSON.stringify(val);
      } else {
        flat[key] = val;
      }
    }
    return flat;
  });

  const headers = Object.keys(flatData[0]);
  const rows = flatData.map(row => headers.map(h => `"${(row[h] ?? '').toString().replace(/"/g, '""')}"`).join(','));
  return [headers.join(','), ...rows].join('\n');
};

module.exports = { getDashboardStats, getCameraActivityReport, getAuditLogReport, getStorageReport, exportReport };
