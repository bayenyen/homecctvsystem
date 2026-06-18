/**
 * PTZ (Pan-Tilt-Zoom) Controller
 * Supports V380 HTTP-based PTZ and ONVIF
 */

const axios = require('axios');
const { Cam } = require('onvif');
const Camera = require('../models/Camera');
const AuditLog = require('../models/AuditLog');
const logger = require('../utils/logger');

// V380 PTZ command mapping
const V380_COMMANDS = {
  up: 'ptzctrl.cgi?cmd=up',
  down: 'ptzctrl.cgi?cmd=down',
  left: 'ptzctrl.cgi?cmd=left',
  right: 'ptzctrl.cgi?cmd=right',
  stop: 'ptzctrl.cgi?cmd=stop',
  zoom_in: 'ptzctrl.cgi?cmd=zoomin',
  zoom_out: 'ptzctrl.cgi?cmd=zoomout',
  preset: 'preset.cgi?cmd=goto&preset=',
  home: 'ptzctrl.cgi?cmd=home'
};

/**
 * @route   POST /api/ptz/:cameraId/command
 * @desc    Send PTZ command to camera
 */
const sendPTZCommand = async (req, res) => {
  try {
    const { cameraId } = req.params;
    const { command, speed = 5, preset } = req.body;

    const camera = await Camera.findById(cameraId).select('+password');
    if (!camera) return res.status(404).json({ success: false, message: 'Camera not found' });

    if (!camera.ptzSupported) {
      return res.status(400).json({ 
        success: false, 
        message: 'This camera does not support PTZ controls',
        note: 'Your V380 cameras use a discovery protocol (UDP), but do not support HTTP-based PTZ command control. PTZ functionality is not available for this camera model.',
        cameraName: camera.name,
        cameraIp: camera.ipAddress
      });
    }

    const validCommands = Object.keys(V380_COMMANDS);
    if (!validCommands.includes(command)) {
      return res.status(400).json({
        success: false,
        message: `Invalid command. Valid: ${validCommands.join(', ')}`
      });
    }

    let result = { success: false, message: 'PTZ command not executed' };

    if (camera.ptzConfig?.protocol === 'http' || camera.ptzConfig?.protocol === 'v380api' || !camera.ptzConfig?.protocol) {
      result = await sendHttpPTZ(camera, command, speed, preset);
    } else if (camera.ptzConfig?.protocol === 'onvif') {
      logger.debug(`Camera ptzConfig: ${JSON.stringify(camera.ptzConfig)}`);
      result = await sendONVIFPTZ(camera, command, speed);
    }

    // Log PTZ action
    if (result.success) {
      await AuditLog.create({
        user: req.user._id,
        username: req.user.username,
        action: 'ptz_control',
        resource: 'camera',
        resourceId: cameraId,
        description: `PTZ command: ${command} on camera ${camera.name}`
      });
    }

    res.json(result);
  } catch (error) {
    logger.error('PTZ command error:', error);
    res.status(500).json({ success: false, message: error.message || 'Failed to send PTZ command' });
  }
};

/**
 * HTTP-based PTZ (V380 standard)
 * Build candidate base URLs (respecting manual controlUrl) and compose command URLs
 */
const buildPtzCommandUrls = (camera) => {
  const defaultControlPort = 80;
  const urls = [];
  const controlUrl = camera.ptzConfig?.controlUrl?.trim();

  const normalizeHttpUrl = (url) => url.replace(/\?$/, '').replace(/\/+$/, '');
  const formatAbsolute = (path) => {
    const cleaned = path.replace(/^\/+/, '').replace(/\/+$/, '');
    return `http://${camera.ipAddress}:${camera.port || defaultControlPort}/${cleaned}`;
  };

  if (controlUrl) {
    if (/^https?:\/\//i.test(controlUrl)) {
      urls.push(normalizeHttpUrl(controlUrl));
    } else {
      urls.push(formatAbsolute(controlUrl));
    }
  }

  if (urls.length > 0) {
    return urls;
  }

  const ports = [defaultControlPort, 8000, 8080, 8800, camera.port || defaultControlPort];
  Array.from(new Set(ports)).forEach((port) => {
    urls.push(`http://${camera.ipAddress}:${port}`);
  });

  return urls;
};

const buildPtzUrl = (baseUrl, command, preset) => {
  const endpoint = V380_COMMANDS[command];

  // If baseUrl already contains a cmd= param, replace it and keep query string
  if (baseUrl.includes('?cmd=')) {
    let next = baseUrl.replace(/cmd=[^&]*/i, `cmd=${command}`);
    if (command === 'preset' && preset) {
      if (next.includes('preset=')) {
        next = next.replace(/preset=[^&]*/i, `preset=${preset}`);
      } else {
        next += `&preset=${preset}`;
      }
    }
    return next;
  }

  if (command === 'preset' && preset) {
    return `${baseUrl}/${endpoint}${preset}`;
  }

  return `${baseUrl}/${endpoint}`;
};

const sendHttpPTZ = async (camera, command, speed, preset) => {
  const auth = camera.username
    ? { username: camera.username, password: camera.password }
    : undefined;

  const requestConfig = {
    timeout: 5000,
    headers: {},
    validateStatus: () => true
  };
  if (auth) requestConfig.auth = auth;

  const speedCommands = ['up', 'down', 'left', 'right', 'zoom_in', 'zoom_out'];
  if (speedCommands.includes(command)) {
    requestConfig.params = { speed: Math.max(1, Math.min(10, speed)) };
  }

  const baseUrls = buildPtzCommandUrls(camera);
  const errors = [];

  for (const baseUrl of baseUrls) {
    const url = buildPtzUrl(baseUrl, command, preset);
    logger.debug(`Trying PTZ command URL: ${url} (camera: ${camera.name})`);

    try {
      const response = await axios.get(url, requestConfig);
      if (response.status >= 200 && response.status < 300) {
        logger.info(`PTZ command '${command}' succeeded on ${url}`);
        return { success: true, message: `PTZ command '${command}' executed` };
      }

      errors.push(`${url} returned ${response.status}`);
      logger.debug(`PTZ command url ${url} responded with status ${response.status}`);
    } catch (error) {
      const errMsg = error.code || error.message;
      errors.push(`${url} error: ${errMsg}`);
      logger.debug(`PTZ command error on ${url}: ${errMsg}`);
    }
  }

  const message = `This camera does not respond to PTZ commands. It may not support HTTP PTZ or the control port is not accessible.`;
  logger.warn(`HTTP PTZ failed for ${camera.name}: No working endpoint found`);
  return {
    success: false,
    message,
    note: 'Camera may not support PTZ or requires manual configuration'
  };
};

/**
 * ONVIF PTZ (standard IP camera support for V380 and others)
 * Uses SOAP protocol to communicate with camera's ONVIF service
 */
const getOnvifPortCandidates = (camera) => {
  const camData = camera.toObject ? camera.toObject() : camera;
  const configuredPort = Number(camData.ptzConfig?.port);
  const cameraPort = Number(camData.port);
  const candidates = [
    configuredPort,
    8899,
    cameraPort && ![554, 8800].includes(cameraPort) ? cameraPort : null,
    80,
    8080,
    8888
  ].filter((port) => Number.isInteger(port) && port > 0);

  return Array.from(new Set(candidates));
};

const connectOnvifCamera = (camera, port, timeoutMs = 8000) => new Promise((resolve) => {
  const camData = camera.toObject ? camera.toObject() : camera;
  let settled = false;
  let timer;

  const finish = (result) => {
    if (settled) return;
    settled = true;
    if (timer) clearTimeout(timer);
    resolve(result);
  };

  timer = setTimeout(() => {
    finish({ error: new Error(`Connection timeout on port ${port}`) });
  }, timeoutMs);

  try {
    const cam = new Cam({
      hostname: camData.ipAddress,
      port,
      username: camData.username || 'admin',
      password: camData.password || '',
      path: camData.ptzConfig?.path || '/onvif/device_service'
    }, (err) => {
      if (err) return finish({ error: err });
      return finish({ cam, port });
    });
  } catch (err) {
    finish({ error: err });
  }
});

const runOnvifAction = (action, timeoutMs = 7000) => new Promise((resolve) => {
  let settled = false;
  const timer = setTimeout(() => {
    if (settled) return;
    settled = true;
    resolve(new Error('ONVIF command timed out'));
  }, timeoutMs);

  action((err) => {
    if (settled) return;
    settled = true;
    clearTimeout(timer);
    resolve(err || null);
  });
});

const getProfileToken = (profile) => profile?.$?.token || profile?.token || profile?.name;

const sendONVIFPTZ = async (camera, command, speed = 5) => {
  const normalizedSpeed = Math.max(0.1, Math.min(1.0, Number(speed || 5) / 10));
  const ports = getOnvifPortCandidates(camera);
  const connectionErrors = [];

  let cam;
  let connectedPort;

  for (const port of ports) {
    logger.debug(`ONVIF PTZ: Connecting to ${camera.ipAddress}:${port}`);
    const result = await connectOnvifCamera(camera, port);
    if (result.cam) {
      cam = result.cam;
      connectedPort = result.port;
      break;
    }

    connectionErrors.push(`${port}: ${result.error?.message || 'failed'}`);
  }

  if (!cam) {
    return {
      success: false,
      message: `Failed to connect to ONVIF PTZ service. Tried ports: ${ports.join(', ')}`,
      note: connectionErrors.join(' | ')
    };
  }

  const profiles = cam.profiles || [];
  const profile = profiles.find((item) => item?.PTZConfiguration || item?.ptzConfiguration) || profiles[0];
  const profileToken = getProfileToken(profile);

  if (!profileToken) {
    return {
      success: false,
      message: 'Connected to ONVIF, but no usable media profile token was found.'
    };
  }

  logger.debug(`Using ONVIF profile ${profileToken} on port ${connectedPort}`);

  if (command === 'preset') {
    return { success: false, message: 'Preset commands are not implemented for ONVIF yet' };
  }

  if (command === 'stop') {
    const err = await runOnvifAction((done) => cam.stop({ ProfileToken: profileToken }, done));
    if (err) {
      logger.debug(`ONVIF stop error for ${camera.name}: ${err.message}`);
      return { success: false, message: `Failed to stop PTZ: ${err.message}` };
    }

    return { success: true, message: 'PTZ stopped via ONVIF', port: connectedPort };
  }

  if (command === 'home') {
    const err = await runOnvifAction((done) => cam.gotoHomePosition({ ProfileToken: profileToken }, done));
    if (err) {
      logger.error(`ONVIF home position error for ${camera.name}: ${err.message}`);
      return { success: false, message: `Failed to execute home command: ${err.message}` };
    }

    return { success: true, message: 'PTZ home position executed via ONVIF', port: connectedPort };
  }

  const velocity = {
    up: { pan: 0, tilt: normalizedSpeed, zoom: 0 },
    down: { pan: 0, tilt: -normalizedSpeed, zoom: 0 },
    left: { pan: -normalizedSpeed, tilt: 0, zoom: 0 },
    right: { pan: normalizedSpeed, tilt: 0, zoom: 0 },
    zoom_in: { pan: 0, tilt: 0, zoom: normalizedSpeed },
    zoom_out: { pan: 0, tilt: 0, zoom: -normalizedSpeed }
  }[command];

  if (!velocity) {
    return { success: false, message: `Unknown ONVIF PTZ command: ${command}` };
  }

  const moveErr = await runOnvifAction((done) => cam.continuousMove({
    ProfileToken: profileToken,
    Velocity: {
      PanTilt: { x: velocity.pan, y: velocity.tilt },
      Zoom: { x: velocity.zoom }
    }
  }, done));

  if (moveErr) {
    logger.error(`ONVIF PTZ error for ${camera.name}/${command}: ${moveErr.message}`);
    return { success: false, message: `Failed to execute PTZ command: ${moveErr.message}` };
  }

  setTimeout(() => {
    cam.stop({ ProfileToken: profileToken }, (err) => {
      if (err) logger.debug(`ONVIF auto-stop error for ${camera.name}: ${err.message}`);
    });
  }, 800);

  logger.info(`ONVIF PTZ command '${command}' executed for ${camera.name} on port ${connectedPort}`);
  return { success: true, message: `PTZ command '${command}' executed via ONVIF`, port: connectedPort };
};

/**
 * @route   GET /api/ptz/:cameraId/presets
 * @desc    Get PTZ presets
 */
const getPresets = async (req, res) => {
  try {
    const camera = await Camera.findById(req.params.cameraId);
    if (!camera) return res.status(404).json({ success: false, message: 'Camera not found' });

    // Simplified preset list
    res.json({
      success: true,
      data: camera.ptzConfig?.presets || [
        { id: 1, name: 'Home Position' },
        { id: 2, name: 'Preset 2' },
        { id: 3, name: 'Preset 3' }
      ]
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

module.exports = { sendPTZCommand, getPresets };
