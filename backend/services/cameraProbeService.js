/**
 * Camera probe utilities: port scan, reprobe, optional ONVIF fallback
 */
const net = require('net');
const logger = require('../utils/logger');
const { findRtspForHost } = require('./cameraDiscoveryService');

const COMMON_PORTS = [554, 8554, 8800, 8899, 80];

const portOpen = (host, port, timeout = 2000) => new Promise((resolve) => {
  const s = new net.Socket();
  let done = false;
  const finish = (res) => { if (done) return; done = true; s.destroy(); resolve(res); };
  s.setTimeout(timeout);
  s.once('connect', () => finish(true));
  s.once('error', () => finish(false));
  s.once('timeout', () => finish(false));
  s.connect(port, host);
});

const scanPorts = async (host, ports = COMMON_PORTS) => {
  const results = {};
  await Promise.all(ports.map(async (p) => {
    try {
      results[p] = await portOpen(host, p);
    } catch (err) {
      results[p] = false;
    }
  }));
  return results;
};

// Try ONVIF if available (optional dependency)
const tryOnvif = async (host) => {
  try {
    const Onvif = require('onvif'); // optional
    return new Promise((resolve) => {
      const dev = new Onvif.Device({ xaddr: `http://${host}:80` });
      dev.init((err) => {
        if (err) return resolve(null);
        // try to get stream URI (may require credentials)
        dev.getUdpStreamUrl((err2, info) => {
          if (err2) return resolve(null);
          resolve(info && info.uri ? info.uri : null);
        });
      });
    });
  } catch (err) {
    return null;
  }
};

const reprobeCamera = async (camera) => {
  const host = camera.ipAddress;
  const port = camera.port || undefined;

  const portResults = await scanPorts(host, port ? [port, ...COMMON_PORTS.filter(p => p !== port)] : COMMON_PORTS);

  // Try RTSP finder with preferred port if available
  let streamUrl = null;
  try {
    streamUrl = await findRtspForHost(host, port);
  } catch (err) {
    logger.warn('findRtspForHost failed:', err.message || err);
  }

  if (!streamUrl) {
    // Try ONVIF fallback
    try {
      const onvifUrl = await tryOnvif(host);
      if (onvifUrl) streamUrl = onvifUrl;
    } catch (err) {
      logger.warn('ONVIF probe failed:', err.message || err);
    }
  }

  return { portResults, streamUrl };
};

module.exports = { scanPorts, reprobeCamera, tryOnvif };
