/**
 * Storage Service
 * Manages disk space and recording cleanup
 */

const fs = require('fs');
const path = require('path');
const Recording = require('../models/Recording');
const logger = require('../utils/logger');

const RECORDINGS_PATH = process.env.RECORDINGS_PATH || path.join(__dirname, '../recordings');

/**
 * Get storage statistics
 */
const getStorageStats = async () => {
  try {
    // Calculate recordings folder size
    const recordingsSize = getFolderSize(RECORDINGS_PATH);

    // Try to get disk stats using built-in Node APIs.
    let totalDisk = 0, freeDisk = 0;
    try {
      const info = await getDiskStats(RECORDINGS_PATH);
      if (info) {
        totalDisk = info.total;
        freeDisk = info.available;
      } else {
        throw new Error('statfs unavailable');
      }
    } catch {
      // Fallback: use recordings size as estimate
      totalDisk = (process.env.MAX_STORAGE_GB || 50) * 1024 * 1024 * 1024;
      freeDisk = Math.max(0, totalDisk - recordingsSize);
    }

    const usedDisk = totalDisk - freeDisk;
    const usagePercent = totalDisk > 0 ? (usedDisk / totalDisk) * 100 : 0;

    // Recording count
    const recordingCount = await Recording.countDocuments({ status: 'completed', isDeleted: false });
    const activeCount = await Recording.countDocuments({ status: 'recording' });

    return {
      recordingsSize,
      recordingsSizeFormatted: formatBytes(recordingsSize),
      totalDisk,
      totalDiskFormatted: formatBytes(totalDisk),
      freeDisk,
      freeDiskFormatted: formatBytes(freeDisk),
      usedDisk,
      usedDiskFormatted: formatBytes(usedDisk),
      usagePercent: Math.min(usagePercent, 100),
      recordingCount,
      activeCount
    };
  } catch (error) {
    logger.error('Storage stats error:', error);
    return {
      recordingsSize: 0,
      recordingsSizeFormatted: '0 B',
      usagePercent: 0,
      recordingCount: 0,
      activeCount: 0
    };
  }
};

/**
 * Auto delete oldest recordings to free up space
 */
const autoDeleteOldestRecordings = async () => {
  try {
    logger.warn('Auto-deleting oldest recordings to free space...');

    // Get oldest completed recordings
    const oldRecordings = await Recording.find({
      status: 'completed',
      isDeleted: false
    }).sort({ startTime: 1 }).limit(20);

    let deleted = 0;
    for (const rec of oldRecordings) {
      await deleteRecordingFile(rec);
      deleted++;

      // Check if we're below 80% now
      const stats = await getStorageStats();
      if (stats.usagePercent < 80) break;
    }

    logger.info(`Auto-deleted ${deleted} old recordings`);
    return deleted;
  } catch (error) {
    logger.error('Auto-delete error:', error);
    return 0;
  }
};

/**
 * Delete a recording file from disk and mark in DB
 */
const deleteRecordingFile = async (recording) => {
  try {
    const fullPath = path.join(__dirname, '..', recording.filePath);
    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath);
    }

    // Also delete thumbnail if exists
    if (recording.thumbnailPath) {
      const thumbPath = path.join(__dirname, '..', recording.thumbnailPath);
      if (fs.existsSync(thumbPath)) fs.unlinkSync(thumbPath);
    }

    await Recording.findByIdAndUpdate(recording._id, {
      isDeleted: true,
      deletedAt: new Date()
    });

    logger.info(`Deleted recording: ${recording.filename}`);
  } catch (err) {
    logger.error(`Failed to delete recording ${recording._id}:`, err);
    throw err;
  }
};

/**
 * Get storage stats grouped by camera
 */
const getStorageByCamera = async () => {
  try {
    const result = await Recording.aggregate([
      { $match: { isDeleted: false, status: 'completed' } },
      {
        $group: {
          _id: '$camera',
          cameraName: { $first: '$cameraName' },
          totalSize: { $sum: '$fileSize' },
          count: { $sum: 1 },
          oldestRecording: { $min: '$startTime' },
          newestRecording: { $max: '$startTime' }
        }
      },
      { $sort: { totalSize: -1 } }
    ]);

    return result.map(r => ({
      ...r,
      totalSizeFormatted: formatBytes(r.totalSize)
    }));
  } catch (err) {
    logger.error('Storage by camera error:', err);
    return [];
  }
};

/**
 * Calculate folder size recursively
 */
const getFolderSize = (folderPath) => {
  try {
    if (!fs.existsSync(folderPath)) return 0;

    let size = 0;
    const files = fs.readdirSync(folderPath);

    for (const file of files) {
      const filePath = path.join(folderPath, file);
      const stat = fs.statSync(filePath);
      if (stat.isDirectory()) {
        size += getFolderSize(filePath);
      } else {
        size += stat.size;
      }
    }

    return size;
  } catch {
    return 0;
  }
};

/**
 * Get disk statistics using Node's built-in statfs support.
 */
const getDiskStats = async (folderPath) => {
  if (fs.promises && typeof fs.promises.statfs === 'function') {
    try {
      const info = await fs.promises.statfs(folderPath);
      return {
        total: info.blocks * info.bsize,
        available: info.bavail * info.bsize,
      };
    } catch {
      return null;
    }
  }
  return null;
};

/**
 * Format bytes to human-readable
 */
const formatBytes = (bytes) => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
};

module.exports = { getStorageStats, autoDeleteOldestRecordings, deleteRecordingFile, getStorageByCamera, formatBytes };
