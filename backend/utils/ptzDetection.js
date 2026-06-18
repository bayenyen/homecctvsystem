/**
 * PTZ Detection Utility
 * Tests if a camera supports PTZ controls
 */

const axios = require('axios');
const { Cam } = require('onvif');
const logger = require('./logger');

const ONVIF_PORTS = [8899, 80, 8080, 8888];

const detectONVIFPTZSupport = (ipAddress, username = null, password = null) => new Promise((resolve) => {
  const ports = [...ONVIF_PORTS];
  let index = 0;
  let finished = false;

  const finish = (result) => {
    if (finished) return;
    finished = true;
    resolve(result);
  };

  const tryNext = () => {
    if (index >= ports.length) {
      return finish({ supported: false });
    }

    const port = ports[index];
    index += 1;

    let timer;
    let settled = false;
    const settle = (result) => {
      if (settled || finished) return;
      settled = true;
      if (timer) clearTimeout(timer);
      if (result.supported) return finish(result);
      return tryNext();
    };

    timer = setTimeout(() => {
      logger.debug(`ONVIF PTZ probe timeout on ${ipAddress}:${port}`);
      settle({ supported: false });
    }, 3500);

    try {
      const cam = new Cam({
        hostname: ipAddress,
        port,
        username: username || 'admin',
        password: password || '',
        path: '/onvif/device_service'
      }, (err) => {
        if (err) {
          logger.debug(`ONVIF PTZ probe failed on ${ipAddress}:${port} - ${err.message}`);
          return settle({ supported: false });
        }

        const profiles = cam.profiles || [];
        if (profiles.length > 0) {
          logger.info(`ONVIF PTZ support detected on ${ipAddress}:${port}`);
          return settle({
            supported: true,
            protocol: 'onvif',
            port,
            baseUrl: `http://${ipAddress}:${port}/onvif/device_service`
          });
        }

        return settle({ supported: false });
      });
    } catch (err) {
      logger.debug(`ONVIF PTZ probe setup failed on ${ipAddress}:${port} - ${err.message}`);
      settle({ supported: false });
    }
  };

  tryNext();
});

/**
 * Test if camera supports HTTP-based PTZ (V380)
 * @param {string} ipAddress - Camera IP address
 * @param {string} username - Optional username
 * @param {string} password - Optional password
 * @returns {Promise<Object>} - PTZ support result
 */
async function detectPTZSupport(ipAddress, username = null, password = null) {
  const onvifResult = await detectONVIFPTZSupport(ipAddress, username, password);
  if (onvifResult.supported) {
    return onvifResult;
  }

  const ports = [80, 8800, 8000, 8080];
  const auth = username ? { username, password } : undefined;

  for (const port of ports) {
    const baseUrl = `http://${ipAddress}:${port}`;
    try {
      const response = await axios.get(`${baseUrl}/ptzctrl.cgi?cmd=home`, {
        auth,
        timeout: 2000,
        validateStatus: () => true
      });

      // Only consider 200-299 status codes as successful PTZ support
      if (response.status >= 200 && response.status < 300) {
        logger.info(`PTZ support detected on ${ipAddress}:${port}`);
        return { supported: true, port, baseUrl };
      }
      
      // 401/403 auth errors might mean PTZ exists but needs auth
      if (response.status === 401 || response.status === 403) {
        logger.info(`PTZ endpoint exists but requires authentication on ${ipAddress}:${port}`);
        return { supported: true, port, baseUrl, requiresAuth: true };
      }
    } catch (error) {
      logger.debug(`PTZ probe failed on ${ipAddress}:${port} - ${error.code}`);
    }
  }

  logger.debug(`No PTZ support detected on ${ipAddress}`);
  return { supported: false };
}

/**
 * Batch detect PTZ support for multiple cameras
 * @param {Array} cameras - Array of camera objects with ipAddress, port, username, password
 * @returns {Promise<Array>} - Array of camera objects with ptzSupported flag added
 */
async function detectPTZForCameras(cameras) {
  const results = await Promise.all(
    cameras.map(async (camera) => {
      const supported = await detectPTZSupport(
        camera.ipAddress,
        camera.username,
        camera.password
      );
      return { ...camera, ptzSupported: supported };
    })
  );
  return results;
}

module.exports = { detectPTZSupport, detectPTZForCameras };
