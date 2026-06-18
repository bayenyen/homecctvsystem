/**
 * Scheduler Service
 * Cron jobs for camera monitoring, storage management, etc.
 */

const cron = require('node-cron');
const Camera = require('../models/Camera');
const Alert = require('../models/Alert');
const Recording = require('../models/Recording');
const logger = require('../utils/logger');
const recordingService = require('./recordingService');
const storageService = require('./storageService');
const { emitAlert, emitCameraStatus, emitStorageWarning } = require('../config/socket');

let io;

const initSchedulers = (socketIo) => {
  io = socketIo;

  // ── Camera Health Check (every 2 minutes) ────────────────────────────────────
  cron.schedule('*/2 * * * *', async () => {
    await checkAllCameras();
  });

  // ── Storage Monitor (every 15 minutes) ───────────────────────────────────────
  cron.schedule('*/15 * * * *', async () => {
    await monitorStorage();
  });

  // ── Update Recording File Sizes (every 5 minutes) ────────────────────────────
  cron.schedule('*/5 * * * *', async () => {
    await updateActiveRecordingSizes();
  });

  // ── Daily Cleanup (every day at 3 AM) ────────────────────────────────────────
  cron.schedule('0 3 * * *', async () => {
    await cleanupOrphanedRecordings();
  });

  logger.info('Schedulers initialized');
};

/**
 * Check all cameras and update status
 */
const checkAllCameras = async () => {
  try {
    const cameras = await Camera.find({ isActive: true }).select('+password');

    for (const camera of cameras) {
      try {
        const isOnline = await recordingService.checkCameraOnline(camera);
        const previousStatus = camera.status;
        const newStatus = isOnline ? 'online' : 'offline';

        if (previousStatus !== newStatus) {
          await Camera.findByIdAndUpdate(camera._id, {
            status: newStatus,
            lastChecked: new Date(),
            ...(isOnline && { lastSeen: new Date() })
          });

          emitCameraStatus(camera._id, newStatus);

          // Create alert for status change
          const alertType = isOnline ? 'camera_online' : 'camera_offline';
          const severity = isOnline ? 'success' : 'warning';
          const title = isOnline ? 'Camera Online' : 'Camera Offline';
          const message = isOnline
            ? `Camera "${camera.name}" is back online`
            : `Camera "${camera.name}" has gone offline`;

          const alert = await Alert.create({
            type: alertType,
            severity,
            title,
            message,
            camera: camera._id,
            cameraName: camera.name
          });
          emitAlert(alert);

          // If camera went offline and was recording, handle gracefully
          if (!isOnline && camera.isRecording) {
            await recordingService.stopRecording(camera._id.toString()).catch(logger.error);
          }

          // If camera came back online and should be recording
          if (isOnline && !camera.isRecording && camera.recordingMode === 'continuous') {
            const freshCamera = await Camera.findById(camera._id).select('+password');
            recordingService.startRecording(freshCamera).catch(logger.error);
          }
        } else {
          // Just update lastChecked
          await Camera.findByIdAndUpdate(camera._id, {
            lastChecked: new Date(),
            ...(isOnline && { lastSeen: new Date() })
          });
        }
      } catch (err) {
        logger.error(`Error checking camera ${camera.name}:`, err.message);
      }
    }
  } catch (err) {
    logger.error('Camera health check error:', err);
  }
};

/**
 * Monitor storage usage and warn/auto-delete if needed
 */
const monitorStorage = async () => {
  try {
    const stats = await storageService.getStorageStats();

    // Warn at 80% usage
    if (stats.usagePercent >= 80 && stats.usagePercent < 90) {
      const alert = await Alert.create({
        type: 'storage_low',
        severity: 'warning',
        title: 'Storage Low',
        message: `Storage is at ${stats.usagePercent.toFixed(1)}% capacity. Consider cleaning up old recordings.`,
        metadata: stats
      });
      emitAlert(alert);
      emitStorageWarning({ level: 'warning', ...stats });
    }

    // Critical at 90%
    if (stats.usagePercent >= 90) {
      const alert = await Alert.create({
        type: 'storage_critical',
        severity: 'critical',
        title: 'Storage Critical',
        message: `Storage is at ${stats.usagePercent.toFixed(1)}% capacity!`,
        metadata: stats
      });
      emitAlert(alert);
      emitStorageWarning({ level: 'critical', ...stats });

      // Auto-delete if configured
      if (process.env.AUTO_DELETE_ON_FULL === 'true') {
        await storageService.autoDeleteOldestRecordings();
      }
    }
  } catch (err) {
    logger.error('Storage monitor error:', err);
  }
};

/**
 * Update file sizes for active recordings
 */
const updateActiveRecordingSizes = async () => {
  const fs = require('fs');
  const path = require('path');

  try {
    const activeRecordings = await Recording.find({ status: 'recording' });

    for (const rec of activeRecordings) {
      try {
        const fullPath = path.join(__dirname, '..', rec.filePath);
        if (fs.existsSync(fullPath)) {
          const stat = fs.statSync(fullPath);
          await Recording.findByIdAndUpdate(rec._id, { fileSize: stat.size });
        }
      } catch { /* skip */ }
    }
  } catch (err) {
    logger.error('Update recording sizes error:', err);
  }
};

/**
 * Clean up recordings with no file on disk
 */
const cleanupOrphanedRecordings = async () => {
  const fs = require('fs');
  const path = require('path');

  try {
    const recordings = await Recording.find({ status: 'recording' });
    const now = new Date();

    for (const rec of recordings) {
      // If recording has been "recording" for more than 24 hours, mark as failed
      const age = (now - rec.startTime) / (1000 * 60 * 60);
      if (age > 24) {
        await Recording.findByIdAndUpdate(rec._id, { status: 'failed', endTime: now });
        await Camera.findByIdAndUpdate(rec.camera, { isRecording: false });
      }
    }

    logger.info('Orphaned recording cleanup complete');
  } catch (err) {
    logger.error('Cleanup error:', err);
  }
};

module.exports = { initSchedulers };
