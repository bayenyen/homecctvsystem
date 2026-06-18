/**
 * Recording Service
 * FFmpeg-based stream recording for V380 cameras
 */

const ffmpeg = require('fluent-ffmpeg');
const path = require('path');
const fs = require('fs');
const moment = require('moment');
const Recording = require('../models/Recording');
const Camera = require('../models/Camera');
const Alert = require('../models/Alert');
const logger = require('../utils/logger');
const { emitAlert, emitCameraStatus, emitRecordingEvent } = require('../config/socket');

// FFmpeg binary path
if (process.env.FFMPEG_PATH) {
  ffmpeg.setFfmpegPath(process.env.FFMPEG_PATH);
}

// Check ffmpeg is available on PATH or via FFMPEG_PATH
const { spawnSync } = require('child_process');
let ffmpegAvailable = false;
try {
  const res = spawnSync(process.env.FFMPEG_PATH || 'ffmpeg', ['-version'], { encoding: 'utf8', timeout: 2000 });
  if (!res.error && res.status === 0) {
    ffmpegAvailable = true;
  } else {
    logger.warn('FFmpeg not found or not executable. Recording will fail until FFmpeg is installed or FFMPEG_PATH is set.');
  }
} catch (err) {
  logger.warn('FFmpeg check failed:', err.message || err);
}


// Track active recording processes
const activeRecordings = new Map();

const RECORDINGS_PATH = process.env.RECORDINGS_PATH || path.join(__dirname, '../recordings');
const INTENTIONAL_STOP_SIGNALS = ['SIGINT', 'SIGTERM'];

/**
 * Build organized path: recordings/cameraId/YYYY-MM-DD/
 */
const getRecordingDir = (cameraId) => {
  const dateStr = moment().format('YYYY-MM-DD');
  const dir = path.join(RECORDINGS_PATH, cameraId.toString(), dateStr);
  fs.mkdirSync(dir, { recursive: true });
  return dir;
};

const finalizeRecording = async ({ cameraId, recording, filePath, status = 'completed' }) => {
  if (recording._finalized) return;
  recording._finalized = true;

  const endTime = new Date();
  const fileSize = getFileSize(filePath);

  await Recording.findByIdAndUpdate(recording._id, {
    status,
    endTime,
    fileSize,
    duration: Math.max(0, Math.floor((endTime - recording.startTime) / 1000))
  });

  await Camera.findByIdAndUpdate(cameraId, { isRecording: false });
  emitRecordingEvent({ event: 'stopped', cameraId, recordingId: recording._id });
};

/**
 * Start recording a camera stream
 */
const startRecording = async (camera, recordingType = 'continuous') => {
  const cameraId = camera._id.toString();

  // Check if already recording
  if (activeRecordings.has(cameraId)) {
    logger.warn(`Camera ${camera.name} is already recording`);
    return;
  }

  const streamUrl = camera.streamUrl || camera.getRtspUrl?.() || `rtsp://${camera.ipAddress}:${camera.port}/stream`;

  const dir = getRecordingDir(cameraId);
  const timestamp = moment().format('HH-mm-ss');
  const filename = `${camera.name.replace(/[^a-zA-Z0-9]/g, '_')}_${timestamp}.mp4`;
  const filePath = path.join(dir, filename);
  const relativePath = path.relative(path.join(__dirname, '..'), filePath);

  // Create recording document
  const recording = await Recording.create({
    camera: camera._id,
    cameraName: camera.name,
    filename,
    filePath: relativePath,
    startTime: new Date(),
    status: 'recording',
    recordingType,
    resolution: camera.resolution,
    metadata: { format: 'mp4' }
  });

  logger.info(`Starting recording for camera: ${camera.name} | Stream: ${streamUrl}`);

  try {
    const command = ffmpeg(streamUrl)
      .inputOptions([
        '-rtsp_transport tcp',
        '-timeout 10000000'
      ])
      .videoCodec('libx264')
      .audioCodec('aac')
      .outputOptions([
        '-preset ultrafast',
        '-tune zerolatency',
        '-pix_fmt yuv420p',
        '-profile:v baseline',
        '-level 3.1',
        '-b:a 128k',
        '-f mp4',
        '-movflags +faststart',
        '-reset_timestamps 1'
      ])
      .output(filePath)
      .on('start', (cmd) => {
        logger.info(`FFmpeg started for ${camera.name}`);
        activeRecordings.set(cameraId, { command, recording, filePath, stopping: false });

        // Update camera status
        Camera.findByIdAndUpdate(camera._id, { isRecording: true, status: 'online', lastSeen: new Date() })
          .exec();

        emitRecordingEvent({ event: 'started', cameraId: camera._id, cameraName: camera.name });
        emitCameraStatus(camera._id, 'online');
      })
      .on('error', async (err) => {
        logger.error(`Recording error for ${camera.name}: ${err.message}`);

        const session = activeRecordings.get(cameraId);
        const wasIntentionalStop = session?.stopping || INTENTIONAL_STOP_SIGNALS.some((signal) => err.message.includes(signal));
        activeRecordings.delete(cameraId);

        await finalizeRecording({
          cameraId,
          recording,
          filePath,
          status: wasIntentionalStop ? 'completed' : 'failed'
        });

        if (!wasIntentionalStop) {
          const isOnline = await checkCameraOnline(camera);
          await Camera.findByIdAndUpdate(camera._id, {
            isRecording: false,
            status: isOnline ? 'online' : 'offline',
            lastChecked: new Date(),
            ...(isOnline && { lastSeen: new Date() })
          });
          emitCameraStatus(camera._id, isOnline ? 'online' : 'offline');

          // Create alert for recording failure
          const alert = await Alert.create({
            type: 'recording_failed',
            severity: 'warning',
            title: 'Recording Failed',
            message: `Recording failed for camera ${camera.name}: ${err.message}`,
            camera: camera._id,
            cameraName: camera.name
          });
          emitAlert(alert);

          // Auto-retry after 30 seconds
          setTimeout(async () => {
            const freshCamera = await Camera.findById(camera._id).select('+password');
            if (freshCamera && freshCamera.isActive && freshCamera.recordingMode !== 'disabled') {
              logger.info(`Auto-retrying recording for ${camera.name}`);
              startRecording(freshCamera, recordingType).catch(logger.error);
            }
          }, 30000);
        }
      })
      .on('end', async () => {
        logger.info(`Recording ended for ${camera.name}`);
        activeRecordings.delete(cameraId);

        await finalizeRecording({ cameraId, recording, filePath, status: 'completed' });
      });

    command.run();

    return recording;
  } catch (err) {
    logger.error(`Failed to start FFmpeg for ${camera.name}:`, err);

    await Recording.findByIdAndUpdate(recording._id, { status: 'failed' });
    await Camera.findByIdAndUpdate(camera._id, { isRecording: false, status: 'error' });

    throw err;
  }
};

/**
 * Stop recording a camera
 */
const stopRecording = async (cameraId) => {
  const session = activeRecordings.get(cameraId);

  if (!session) {
    logger.warn(`No active recording for camera ${cameraId}`);
    // Still update DB in case of inconsistency
    await Camera.findByIdAndUpdate(cameraId, { isRecording: false });
    return;
  }

  logger.info(`Stopping recording for camera ${cameraId}`);

  try {
    session.stopping = true;
    session.command.kill('SIGINT');
  } catch (err) {
    logger.warn('Error killing FFmpeg process:', err.message);
  }

  setTimeout(async () => {
    const currentSession = activeRecordings.get(cameraId);
    if (currentSession && currentSession.stopping) {
      logger.warn(`Recording for camera ${cameraId} did not stop gracefully; forcing process exit`);
      try {
        currentSession.command.kill('SIGKILL');
      } catch (err) {
        logger.warn('Error force-killing FFmpeg process:', err.message);
      }
      activeRecordings.delete(cameraId);
      await finalizeRecording({ cameraId, recording: currentSession.recording, filePath: currentSession.filePath });
    }
  }, 10000);
};

/**
 * Check if a camera is reachable (TCP connect to RTSP port)
 */
const checkCameraOnline = (camera) => {
  return new Promise((resolve) => {
    const net = require('net');
    const socket = new net.Socket();
    const timeout = 3000;

    // If a streamUrl is present, prefer probing its host/port
    let host = camera.ipAddress;
    let port = camera.port || 554;
    if (camera.streamUrl) {
      try {
        const parsed = new URL(camera.streamUrl);
        if (parsed.hostname) host = parsed.hostname;
        if (parsed.port) port = Number(parsed.port);
        else port = parsed.protocol === 'rtsp:' ? 554 : port;
      } catch (e) {
        // ignore and fallback to ipAddress/port
      }
    }

    socket.setTimeout(timeout);
    socket.connect(port, host, () => {
      socket.destroy();
      resolve(true);
    });
    socket.on('error', () => resolve(false));
    socket.on('timeout', () => { socket.destroy(); resolve(false); });
  });
};

/**
 * Stop all active recordings (called on server shutdown)
 */
const stopAllRecordings = async () => {
  logger.info(`Stopping ${activeRecordings.size} active recordings...`);
  for (const [cameraId] of activeRecordings) {
    await stopRecording(cameraId).catch(logger.error);
  }
};

/**
 * Get list of active recording camera IDs
 */
const getActiveRecordings = () => {
  return Array.from(activeRecordings.keys());
};

/**
 * Get file size in bytes
 */
const getFileSize = (filePath) => {
  try {
    return fs.statSync(filePath).size;
  } catch {
    return 0;
  }
};

// Graceful shutdown
process.on('SIGTERM', stopAllRecordings);
process.on('SIGINT', stopAllRecordings);

module.exports = {
  startRecording,
  stopRecording,
  checkCameraOnline,
  stopAllRecordings,
  getActiveRecordings
};
