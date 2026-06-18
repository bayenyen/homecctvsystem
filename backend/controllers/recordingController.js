/**
 * Recording Controller
 */

const path = require('path');
const fs = require('fs');
const Recording = require('../models/Recording');
const AuditLog = require('../models/AuditLog');
const logger = require('../utils/logger');
const storageService = require('../services/storageService');

/**
 * @route   GET /api/recordings
 * @desc    Get recordings with filters
 */
const getRecordings = async (req, res) => {
  try {
    const {
      cameraId, date, startDate, endDate,
      status, type, page = 1, limit = 20,
      search
    } = req.query;

    const query = { isDeleted: false };

    if (cameraId) query.camera = cameraId;
    if (date) query.dateString = date;
    if (startDate || endDate) {
      query.startTime = {};
      if (startDate) query.startTime.$gte = new Date(startDate);
      if (endDate) query.startTime.$lte = new Date(endDate + 'T23:59:59');
    }
    if (status) query.status = status;
    if (type) query.recordingType = type;
    if (search) query.filename = { $regex: search, $options: 'i' };

    const total = await Recording.countDocuments(query);
    const recordings = await Recording.find(query)
      .populate('camera', 'name ipAddress location')
      .sort({ startTime: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    res.json({
      success: true,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / limit),
      data: recordings
    });
  } catch (error) {
    logger.error('Get recordings error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

/**
 * @route   GET /api/recordings/:id
 * @desc    Get single recording
 */
const getRecording = async (req, res) => {
  try {
    const recording = await Recording.findById(req.params.id)
      .populate('camera', 'name ipAddress location');

    if (!recording || recording.isDeleted) {
      return res.status(404).json({ success: false, message: 'Recording not found' });
    }

    res.json({ success: true, data: recording });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

/**
 * @route   GET /api/recordings/:id/download
 * @desc    Download a recording
 */
const downloadRecording = async (req, res) => {
  try {
    const recording = await Recording.findById(req.params.id);

    if (!recording || recording.isDeleted) {
      return res.status(404).json({ success: false, message: 'Recording not found' });
    }

    const fullPath = path.join(__dirname, '..', recording.filePath);

    if (!fs.existsSync(fullPath)) {
      return res.status(404).json({ success: false, message: 'Recording file not found on disk' });
    }
    const stat = fs.statSync(fullPath);

    // Log download
    await AuditLog.create({
      user: req.user._id,
      username: req.user.username,
      action: 'recording_download',
      resource: 'recording',
      resourceId: recording._id.toString(),
      description: `Downloaded recording: ${recording.filename}`
    });

    res.setHeader('Content-Disposition', `attachment; filename="${recording.filename}"`);
    res.setHeader('Content-Type', 'video/mp4');
    res.setHeader('Content-Length', stat.size);

    const stream = fs.createReadStream(fullPath);
    stream.pipe(res);
  } catch (error) {
    logger.error('Download recording error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

/**
 * @route   GET /api/recordings/:id/stream
 * @desc    Stream a recording for playback with range support
 */
const streamRecording = async (req, res) => {
  try {
    const recording = await Recording.findById(req.params.id);

    if (!recording || recording.isDeleted) {
      return res.status(404).json({ success: false, message: 'Recording not found' });
    }

    const fullPath = path.join(__dirname, '..', recording.filePath);

    if (!fs.existsSync(fullPath)) {
      return res.status(404).json({ success: false, message: 'Recording file not found on disk' });
    }

    const stat = fs.statSync(fullPath);
    const fileSize = stat.size;
    const range = req.headers.range;

    if (range) {
      // Partial content for seeking
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
      const chunkSize = end - start + 1;

      res.writeHead(206, {
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunkSize,
        'Content-Type': 'video/mp4'
      });

      const stream = fs.createReadStream(fullPath, { start, end });
      stream.pipe(res);
    } else {
      res.writeHead(200, {
        'Content-Length': fileSize,
        'Content-Type': 'video/mp4',
        'Accept-Ranges': 'bytes'
      });

      fs.createReadStream(fullPath).pipe(res);
    }
  } catch (error) {
    logger.error('Stream recording error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

/**
 * @route   DELETE /api/recordings/:id
 * @desc    Delete a recording
 */
const deleteRecording = async (req, res) => {
  try {
    const recording = await Recording.findById(req.params.id);

    if (!recording || recording.isDeleted) {
      return res.status(404).json({ success: false, message: 'Recording not found' });
    }

    await storageService.deleteRecordingFile(recording);

    await Recording.findByIdAndUpdate(recording._id, {
      deletedBy: req.user._id
    });

    await AuditLog.create({
      user: req.user._id,
      username: req.user.username,
      action: 'recording_delete',
      resource: 'recording',
      resourceId: recording._id.toString(),
      description: `Deleted recording: ${recording.filename}`
    });

    res.json({ success: true, message: 'Recording deleted successfully' });
  } catch (error) {
    logger.error('Delete recording error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

/**
 * @route   GET /api/recordings/stats/overview
 * @desc    Recording statistics
 */
const getRecordingStats = async (req, res) => {
  try {
    const [total, active, today, totalSize] = await Promise.all([
      Recording.countDocuments({ status: 'completed', isDeleted: false }),
      Recording.countDocuments({ status: 'recording' }),
      Recording.countDocuments({
        status: 'completed',
        isDeleted: false,
        dateString: new Date().toISOString().split('T')[0]
      }),
      Recording.aggregate([
        { $match: { isDeleted: false } },
        { $group: { _id: null, total: { $sum: '$fileSize' } } }
      ])
    ]);

    res.json({
      success: true,
      data: {
        total,
        active,
        today,
        totalSize: totalSize[0]?.total || 0,
        totalSizeFormatted: storageService.formatBytes(totalSize[0]?.total || 0)
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

module.exports = {
  getRecordings, getRecording, downloadRecording,
  streamRecording, deleteRecording, getRecordingStats
};
