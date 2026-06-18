/**
 * Camera Controller
 * Manage V380/V380PRO cameras
 */

const { spawn } = require('child_process');
const Camera = require('../models/Camera');
const Recording = require('../models/Recording');
const Alert = require('../models/Alert');
const AuditLog = require('../models/AuditLog');
const logger = require('../utils/logger');
const { emitCameraStatus, emitAlert } = require('../config/socket');
const recordingService = require('../services/recordingService');
const { discoverCameras } = require('../services/cameraDiscoveryService');
const { findRtspForHost } = require('../services/cameraDiscoveryService');
const { reprobeCamera } = require('../services/cameraProbeService');

/**
 * @route   GET /api/cameras
 * @desc    Get all cameras
 * @access  Private
 */
const getCameras = async (req, res) => {
  try {
    const cameras = await Camera.find({ isActive: true })
      .select('-password')
      .populate('addedBy', 'username fullName')
      .sort({ createdAt: -1 });

    res.json({ success: true, count: cameras.length, data: cameras });
  } catch (error) {
    logger.error('Get cameras error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

/**
 * @route   GET /api/cameras/:id
 * @desc    Get single camera
 * @access  Private
 */
const getCamera = async (req, res) => {
  try {
    const camera = await Camera.findById(req.params.id)
      .select('-password')
      .populate('addedBy', 'username fullName');

    if (!camera) {
      return res.status(404).json({ success: false, message: 'Camera not found' });
    }

    res.json({ success: true, data: camera });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

/**
 * @route   POST /api/cameras
 * @desc    Add a new camera
 * @access  Private/Admin
 */
const addCamera = async (req, res) => {
  try {
    const {
      name, ipAddress, port, username, password,
      streamUrl, streamType, location, description,
      recordingMode, resolution, fps, ptzSupported, ptzConfig, tags, detectPTZ
    } = req.body;

    // Check for duplicate IP
    const existing = await Camera.findOne({ ipAddress, isActive: true });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: `A camera with IP ${ipAddress} already exists`
      });
    }

    // Build stream URL if not provided
    let finalStreamUrl = streamUrl;
    if (!finalStreamUrl && ipAddress) {
      const auth = username ? `${username}:${password || ''}@` : '';
      finalStreamUrl = `rtsp://${auth}${ipAddress}:${port || 554}/stream`;
    }

    // Auto-detect PTZ support if requested and not explicitly set
    let finalPtzSupported = ptzSupported || false;
    let finalPtzConfig = ptzConfig || {};
    if (detectPTZ && !ptzSupported) {
      try {
        const { detectPTZSupport } = require('../utils/ptzDetection');
        const ptzResult = await detectPTZSupport(ipAddress, username, password);
        finalPtzSupported = !!ptzResult.supported;
        if (ptzResult.protocol) {
          finalPtzConfig.protocol = ptzResult.protocol;
        }
        if (ptzResult.port) {
          finalPtzConfig.port = ptzResult.port;
        }
        if (ptzResult.baseUrl && !finalPtzConfig.controlUrl && ptzResult.protocol !== 'onvif') {
          finalPtzConfig.controlUrl = ptzResult.baseUrl;
        }
      } catch (ptzErr) {
        logger.debug(`PTZ detection failed, continuing without: ${ptzErr.message}`);
        // Don't fail camera creation if PTZ detection fails
      }
    }

    const camera = await Camera.create({
      name,
      ipAddress,
      port: port || 554,
      username,
      password,
      streamUrl: finalStreamUrl,
      streamType: streamType || 'rtsp',
      location,
      description,
      recordingMode: recordingMode || 'continuous',
      resolution: resolution || '1080p',
      fps: fps || 15,
      ptzSupported: finalPtzSupported,
      ptzConfig: finalPtzConfig,
      tags,
      addedBy: req.user._id,
      status: 'online',
      lastSeen: new Date(),
      lastChecked: new Date()
    });

    // Log audit
    await AuditLog.create({
      user: req.user._id,
      username: req.user.username,
      action: 'camera_add',
      resource: 'camera',
      resourceId: camera._id.toString(),
      description: `Camera added: ${name} (${ipAddress})`
    });

    // Start recording if mode is continuous
    if (recordingMode === 'continuous' || !recordingMode) {
      try {
        await recordingService.startRecording(camera);
      } catch (recErr) {
        logger.warn(`Could not auto-start recording for camera ${camera.name}:`, recErr.message);
      }
    }

    res.status(201).json({
      success: true,
      message: 'Camera added successfully',
      data: { ...camera.toObject(), password: undefined }
    });
  } catch (error) {
    logger.error('Add camera error:', error);
    res.status(500).json({ success: false, message: error.message || 'Server error' });
  }
};

/**
 * @route   PUT /api/cameras/:id
 * @desc    Update camera
 * @access  Private/Admin
 */
const updateCamera = async (req, res) => {
  try {
    const updates = req.body;
    delete updates.addedBy;
    delete updates._id;

    const camera = await Camera.findByIdAndUpdate(
      req.params.id,
      { $set: updates },
      { new: true, runValidators: true }
    ).select('-password');

    if (!camera) {
      return res.status(404).json({ success: false, message: 'Camera not found' });
    }

    await AuditLog.create({
      user: req.user._id,
      username: req.user.username,
      action: 'camera_edit',
      resource: 'camera',
      resourceId: camera._id.toString(),
      description: `Camera updated: ${camera.name}`
    });

    res.json({ success: true, message: 'Camera updated successfully', data: camera });
  } catch (error) {
    logger.error('Update camera error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

/**
 * @route   DELETE /api/cameras/:id
 * @desc    Delete camera (soft delete)
 * @access  Private/Admin
 */
const deleteCamera = async (req, res) => {
  try {
    const camera = await Camera.findById(req.params.id);
    if (!camera) {
      return res.status(404).json({ success: false, message: 'Camera not found' });
    }

    // Stop recording if active
    if (camera.isRecording) {
      await recordingService.stopRecording(camera._id.toString());
    }

    camera.isActive = false;
    camera.status = 'disabled';
    await camera.save();

    await AuditLog.create({
      user: req.user._id,
      username: req.user.username,
      action: 'camera_delete',
      resource: 'camera',
      resourceId: camera._id.toString(),
      description: `Camera deleted: ${camera.name}`
    });

    res.json({ success: true, message: 'Camera removed successfully' });
  } catch (error) {
    logger.error('Delete camera error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

/**
 * @route POST /api/cameras/probe
 * @desc  Probe a host for RTSP path
 * @access Private/Admin
 */
const probeRtsp = async (req, res) => {
  try {
    const { ipAddress, port } = req.body || {};
    if (!ipAddress) return res.status(400).json({ success: false, message: 'ipAddress required' });

    const url = await findRtspForHost(ipAddress, port);
    if (!url) return res.status(404).json({ success: false, message: 'No RTSP path found' });

    // Try to detect PTZ support
    let ptzSupported = false;
    let ptzConfig = undefined;
    try {
      const { detectPTZSupport } = require('../utils/ptzDetection');
      const { username, password } = req.body;
      const ptzResult = await detectPTZSupport(ipAddress, username, password);
      ptzSupported = !!ptzResult.supported;
      if (ptzResult.supported) {
        ptzConfig = {
          ...(ptzResult.protocol && { protocol: ptzResult.protocol }),
          ...(ptzResult.port && { port: ptzResult.port }),
          ...(ptzResult.baseUrl && ptzResult.protocol !== 'onvif' && { controlUrl: ptzResult.baseUrl })
        };
      }
    } catch (ptzErr) {
      logger.debug('PTZ detection failed during probe:', ptzErr.message);
    }

    res.json({ success: true, data: { streamUrl: url, ptzSupported, ptzConfig } });
  } catch (error) {
    logger.error('Probe RTSP error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

/**
 * @route POST /api/cameras/reprobe
 * @desc  Re-probe cameras for ports and RTSP URL (admin)
 * @access Private/Admin
 */
const reprobeCameras = async (req, res) => {
  try {
    const { id } = req.body || {};
    let cameras = [];
    if (id) {
      const cam = await Camera.findById(id).select('+password');
      if (!cam) return res.status(404).json({ success: false, message: 'Camera not found' });
      cameras = [cam];
    } else {
      cameras = await Camera.find({}).select('+password');
    }

    const results = [];
    for (const cam of cameras) {
      const { portResults, streamUrl } = await reprobeCamera(cam);
      results.push({ cameraId: cam._id, ip: cam.ipAddress, portResults, streamUrl });
      if (streamUrl) {
        cam.streamUrl = streamUrl;
        await cam.save();
      }
    }

    res.json({ success: true, count: results.length, data: results });
  } catch (error) {
    logger.error('Reprobe cameras error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

/**
 * @route   POST /api/cameras/:id/start-recording
 * @desc    Start manual recording
 * @access  Private
 */
const startRecording = async (req, res) => {
  try {
    const camera = await Camera.findById(req.params.id).select('+password');
    if (!camera) return res.status(404).json({ success: false, message: 'Camera not found' });

    if (camera.isRecording) {
      return res.status(400).json({ success: false, message: 'Camera is already recording' });
    }

    await recordingService.startRecording(camera, 'manual');

    res.json({ success: true, message: 'Recording started' });
  } catch (error) {
    logger.error('Start recording error:', error);
    res.status(500).json({ success: false, message: error.message || 'Failed to start recording' });
  }
};

/**
 * @route   POST /api/cameras/:id/stop-recording
 * @desc    Stop recording
 * @access  Private
 */
const stopRecording = async (req, res) => {
  try {
    const camera = await Camera.findById(req.params.id);
    if (!camera) return res.status(404).json({ success: false, message: 'Camera not found' });

    await recordingService.stopRecording(req.params.id);

    res.json({ success: true, message: 'Recording stopped' });
  } catch (error) {
    logger.error('Stop recording error:', error);
    res.status(500).json({ success: false, message: error.message || 'Failed to stop recording' });
  }
};

/**
 * @route   POST /api/cameras/:id/check-status
 * @desc    Manually check camera status
 * @access  Private
 */
const checkCameraStatus = async (req, res) => {
  try {
    const camera = await Camera.findById(req.params.id).select('+password');
    if (!camera) return res.status(404).json({ success: false, message: 'Camera not found' });

    const status = await recordingService.checkCameraOnline(camera);
    camera.status = status ? 'online' : 'offline';
    camera.lastChecked = new Date();
    await camera.save();

    emitCameraStatus(camera._id, camera.status);

    res.json({ success: true, status: camera.status, lastChecked: camera.lastChecked });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error checking camera status' });
  }
};

/**
 * @route   GET /api/cameras/:id/live
 * @desc    Proxy camera live stream via FFmpeg for browser playback
 * @access  Private
 */
const streamCameraLive = async (req, res) => {
  try {
    const camera = await Camera.findById(req.params.id).select('+password');
    if (!camera) return res.status(404).json({ success: false, message: 'Camera not found' });

    const streamUrl = camera.getRtspUrl();
    if (!streamUrl) {
      return res.status(400).json({ success: false, message: 'No camera stream URL configured' });
    }

    const ffmpegPath = process.env.FFMPEG_PATH || 'ffmpeg';
    const quality = req.query.quality === 'main' ? 'main' : 'grid';
    
    logger.info(`[LIVE STREAM] Starting live stream for ${camera.name} (${quality})`);
    logger.info(`[LIVE STREAM] FFmpeg path: ${ffmpegPath}`);
    logger.info(`[LIVE STREAM] Stream URL: ${streamUrl}`);

    const liveProfiles = {
      grid: {
        fps: '10',
        scale: '640:-2',
        videoBitrate: '600k',
        maxrate: '800k',
        bufsize: '1200k'
      },
      main: {
        fps: '15',
        scale: '1280:-2',
        videoBitrate: '1500k',
        maxrate: '2000k',
        bufsize: '3000k'
      }
    };
    const profile = liveProfiles[quality];
    
    // Optimized FFmpeg args for stable streaming with multiple cameras
    // TCP transport for reliability, higher timeout for slow/low-FPS cameras
    const ffmpegArgs = [
      '-rtsp_transport', 'tcp',
      '-timeout', '10000000',      // 10 seconds - increased for more stable connections
      '-i', streamUrl,
      '-c:v', 'copy',              // H.264 copy - no re-encoding
      '-c:a', 'none',              // No audio
      '-an',
      '-f', 'mp4',
      '-movflags', 'frag_keyframe+empty_moov+faststart',
      '-fflags', '+discardcorrupt', // Discard corrupted packets
      'pipe:1'
    ];

    logger.debug(`[LIVE STREAM] FFmpeg args: ${ffmpegArgs.join(' ')}`);

    res.setHeader('Content-Type', 'video/mp4');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const ffmpegProcess = spawn(ffmpegPath, ffmpegArgs, { 
      windowsHide: true,
      stdio: ['ignore', 'pipe', 'pipe']
    });

    let stderrBuffer = '';
    let firstDataReceived = false;

    ffmpegProcess.stderr.on('data', (chunk) => {
      const message = chunk.toString();
      stderrBuffer += message;
      logger.debug(`[LIVE STREAM] FFmpeg stderr [${camera.name}]: ${message.trim()}`);
      
      // Log when actual streaming starts
      if (!firstDataReceived && message.includes('frame=')) {
        firstDataReceived = true;
        logger.info(`[LIVE STREAM] Streaming started for ${camera.name}`);
      }
    });

    ffmpegProcess.on('error', (err) => {
      logger.error(`[LIVE STREAM] FFmpeg process error for ${camera.name}: ${err.message}`);
      logger.error(`[LIVE STREAM] Error code: ${err.code}, FFmpeg path: ${ffmpegPath}`);
      if (!res.headersSent) {
        res.status(500).json({ success: false, message: `Stream error: ${err.message}` });
      } else {
        res.end();
      }
    });

    ffmpegProcess.stdout.on('data', (chunk) => {
      if (!firstDataReceived && chunk.length > 0) {
        firstDataReceived = true;
        logger.info(`[LIVE STREAM] Video data flowing for ${camera.name}, size: ${chunk.length} bytes`);
      }
    });

    ffmpegProcess.on('exit', (code, signal) => {
      logger.info(`[LIVE STREAM] FFmpeg exited for ${camera.name}: code=${code} signal=${signal}`);
      if (!res.writableEnded) {
        res.end();
      }
    });

    res.on('close', () => {
      logger.info(`[LIVE STREAM] Client closed connection for ${camera.name}`);
      if (!ffmpegProcess.killed) {
        ffmpegProcess.kill('SIGTERM');
      }
    });

    ffmpegProcess.stdout.pipe(res);
  } catch (error) {
    logger.error(`[LIVE STREAM] Exception in streamCameraLive: ${error.message}`);
    logger.error(error.stack);
    if (!res.headersSent) {
      res.status(500).json({ success: false, message: 'Failed to stream live camera' });
    }
  }
};

/**
 * @route   GET /api/cameras/stats/overview
 * @desc    Dashboard camera stats
 * @access  Private
 */
const discoverNetworkCameras = async (req, res) => {
  try {
    const cameras = await discoverCameras();
    res.json({ success: true, count: cameras.length, data: cameras });
  } catch (error) {
    logger.error('Discover cameras error:', error);
    res.status(500).json({ success: false, message: 'Error discovering network cameras' });
  }
};

const getCameraStats = async (req, res) => {
  try {
    const [total, online, offline, recording] = await Promise.all([
      Camera.countDocuments({ isActive: true }),
      Camera.countDocuments({ isActive: true, status: 'online' }),
      Camera.countDocuments({ isActive: true, status: 'offline' }),
      Camera.countDocuments({ isActive: true, isRecording: true })
    ]);

    res.json({
      success: true,
      data: { total, online, offline, recording, unknown: total - online - offline }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

module.exports = {
  getCameras, getCamera, addCamera, updateCamera, deleteCamera,
  startRecording, stopRecording, checkCameraStatus, streamCameraLive, discoverNetworkCameras, getCameraStats,
  probeRtsp,
  reprobeCameras
};
