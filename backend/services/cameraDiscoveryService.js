/**
 * Camera Discovery Service
 * Detects local V380 cameras using SSDP and RTSP probes.
 */
const os = require('os');
const dgram = require('dgram');
const net = require('net');
const { spawnSync } = require('child_process');
const path = require('path');
const Camera = require('../models/Camera');
const logger = require('../utils/logger');

const COMMON_CAMERA_PORTS = [554, 8554, 8800, 80, 8080, 8000, 8888];
const COMMON_RTSP_PATHS = [
  '/h264', '/stream', '/ch01/0', '/live', '/live.sdp',
  '/mpeg4', '/11', '/12', '/0',
  '/cam/realmonitor?channel=1&subtype=0',
  '/realmonitor?channel=1&subtype=0',
  '/h264/ch1/main/av_stream',
  '/h264/ch1/sub/av_stream',
  '/live/ch00?transportmode=unicast',
  '/live/ch0?transportmode=unicast',
  '/live/ch1?transportmode=unicast',
  '/live/ch00?transportmode=multicast',
  '/live/ch0?transportmode=multicast',
  '/live/ch1?transportmode=multicast',
  '/live/ch0?transportmode=unicast&user=admin&password=',
  '/user=admin&password=&channel=1&stream=0.sdp',
  '/user=admin&password=&channel=1&stream=0',
  '/user=admin&password=&channel=0&stream=0.sdp',
  '/user=admin&password=&channel=0&stream=0',
  '/media.sdp',
  '/video.cgi',
  '/live1.sdp',
  '/stream1',
  '/'
];
const CONNECT_TIMEOUT_MS = 1500; // Reduced from 3000 for faster scanning
const SSDP_TIMEOUT_MS = 2500;
const MAX_CONCURRENCY = 40;
const SSDP_ADDRESS = '239.255.255.250';
const SSDP_PORT = 1900;
const V380_DISCOVERY_PORT = 10008;
const V380_RESPONSE_PORT = 10009;
const V380_DISCOVERY_PAYLOAD = 'NVDEVSEARCH^100';
const V380_DISCOVERY_ATTEMPTS = 5;
const V380_DISCOVERY_INTERVAL_MS = 1000;
const V380_DISCOVERY_TIMEOUT_MS = V380_DISCOVERY_ATTEMPTS * V380_DISCOVERY_INTERVAL_MS + 1000;

const getLocalIpv4Interfaces = () => {
  const nets = os.networkInterfaces();
  const interfaces = [];

  Object.entries(nets).forEach(([name, addresses]) => {
    if (!addresses) return;
    addresses.forEach((addr) => {
      if (addr.family === 'IPv4' && !addr.internal && !addr.address.startsWith('169.254.')) {
        interfaces.push({ name, address: addr.address });
      }
    });
  });

  return interfaces;
};

const buildSubnetHosts = (localIp) => {
  const parts = localIp.split('.');
  if (parts.length !== 4) return [];
  const prefix = `${parts[0]}.${parts[1]}.${parts[2]}.`;
  const hosts = [];
  for (let i = 1; i < 255; i += 1) {
    const ip = `${prefix}${i}`;
    if (ip !== localIp) hosts.push(ip);
  }
  return hosts;
};

const parseSsdpResponse = (message) => {
  const text = message.toString();
  const lines = text.split(/\r?\n/);
  const data = {};
  lines.slice(1).forEach((line) => {
    const idx = line.indexOf(':');
    if (idx !== -1) {
      const key = line.slice(0, idx).trim().toUpperCase();
      const value = line.slice(idx + 1).trim();
      if (key && value) data[key] = value;
    }
  });
  return data;
};

const discoverViaSsdp = () => new Promise((resolve) => {
  const socket = dgram.createSocket({ type: 'udp4', reuseAddr: true });
  const found = new Map();
  const message = Buffer.from(
    'M-SEARCH * HTTP/1.1\r\n' +
    `HOST: ${SSDP_ADDRESS}:${SSDP_PORT}\r\n` +
    'MAN: "ssdp:discover"\r\n' +
    'MX: 2\r\n' +
    'ST: ssdp:all\r\n' +
    '\r\n'
  );

  const cleanup = () => {
    if (socket) {
      try { socket.close(); } catch (err) { /* ignore */ }
    }
    resolve(Array.from(found.values()));
  };

  socket.on('message', (msg) => {
    const headers = parseSsdpResponse(msg);
    const location = headers.LOCATION;
    if (!location) return;

    try {
      const url = new URL(location);
      const port = url.port ? Number(url.port) : (url.protocol === 'https:' ? 443 : 80);
      const ipAddress = url.hostname;
      const key = `${ipAddress}:${port}`;
      if (!found.has(key)) {
        found.set(key, { ipAddress, port, streamType: 'rtsp', source: 'ssdp' });
      }
    } catch (err) {
      logger.error('SSDP parse error:', err.message);
    }
  });

  socket.on('error', (err) => {
    logger.error('SSDP socket error:', err.message);
    cleanup();
  });

  socket.on('listening', () => {
    try {
      socket.addMembership(SSDP_ADDRESS);
    } catch (err) {
      // ignore if not possible on some hosts
    }
    socket.send(message, 0, message.length, SSDP_PORT, SSDP_ADDRESS, (err) => {
      if (err) {
        logger.error('SSDP send error:', err.message);
      }
    });
  });

  socket.bind(0, () => {
    setTimeout(cleanup, SSDP_TIMEOUT_MS);
  });
});

const buildBroadcastAddresses = (localIp) => {
  const parts = localIp.split('.');
  if (parts.length !== 4) return [];
  return [`${parts[0]}.${parts[1]}.${parts[2]}.255`, '255.255.255.255'];
};

const parseV380Response = (message, rinfo) => {
  const text = message.toString('utf-8').trim();
  const parts = text.split('^');
  if (parts.length < 13 || parts[0] !== 'NVDEVRESULT') {
    return null;
  }
  return {
    ipAddress: rinfo.address,
    port: 8800,
    streamType: 'manual',
    source: 'v380-udp',
    deviceId: parts[12],
    rawResponse: parts
  };
};

const discoverViaV380Udp = () => new Promise((resolve) => {
  const socket = dgram.createSocket({ type: 'udp4', reuseAddr: true });
  const found = new Map();
  const localInterfaces = getLocalIpv4Interfaces();
  let cleaned = false;

  const cleanup = () => {
    if (cleaned) return;
    cleaned = true;
    if (socket) {
      try { socket.close(); } catch (err) { /* ignore */ }
    }
    resolve(Array.from(found.values()));
  };

  const sendDiscovery = () => {
    if (cleaned) return;
    const payload = Buffer.from(V380_DISCOVERY_PAYLOAD);
    const targets = new Set(['255.255.255.255']);
    localInterfaces.forEach((iface) => {
      buildBroadcastAddresses(iface.address).forEach((addr) => targets.add(addr));
    });

    targets.forEach((address) => {
      socket.send(payload, 0, payload.length, V380_DISCOVERY_PORT, address, (err) => {
        if (err) {
          logger.debug('V380 discovery send error:', err.message);
        }
      });
    });
  };

  socket.on('message', (msg, rinfo) => {
    const parsed = parseV380Response(msg, rinfo);
    if (!parsed) return;
    if (!found.has(parsed.ipAddress)) {
      found.set(parsed.ipAddress, parsed);
    }
  });

  socket.on('error', (err) => {
    logger.debug('V380 discovery socket error:', err.message);
    cleanup();
  });

  socket.on('listening', () => {
    try {
      socket.setBroadcast(true);
    } catch (err) {
      logger.debug('V380 socket broadcast error:', err.message);
    }

    sendDiscovery();
    let attempt = 1;
    const interval = setInterval(() => {
      if (attempt >= V380_DISCOVERY_ATTEMPTS) {
        clearInterval(interval);
        cleanup();
        return;
      }
      attempt += 1;
      sendDiscovery();
    }, V380_DISCOVERY_INTERVAL_MS);
  });

  // Bind with error handler
  socket.bind(V380_RESPONSE_PORT, '0.0.0.0', () => {
    // Binding successful, timeout will handle cleanup if no listening event
  });

  // Fallback timeout in case socket doesn't emit listening event
  setTimeout(() => {
    if (!cleaned) {
      cleanup();
    }
  }, V380_DISCOVERY_TIMEOUT_MS + 1000);
});

const discoverViaV380UdpWithTimeout = async () => {
  try {
    return await Promise.race([
      discoverViaV380Udp(),
      new Promise((resolve) => setTimeout(() => resolve([]), V380_DISCOVERY_TIMEOUT_MS))
    ]);
  } catch (err) {
    logger.error('V380 discovery failed:', err.message);
    return [];
  }
};

const discoverViaSsdpWithTimeout = async () => {
  try {
    return await Promise.race([
      discoverViaSsdp(),
      new Promise((resolve) => setTimeout(() => resolve([]), SSDP_TIMEOUT_MS + 500))
    ]);
  } catch (err) {
    logger.error('SSDP discovery failed:', err.message);
    return [];
  }
};

const withTimeout = (promise, ms) => new Promise((resolve) => {
  let finished = false;
  const timer = setTimeout(() => {
    finished = true;
    resolve(false);
  }, ms);

  promise.then((result) => {
    if (!finished) {
      finished = true;
      clearTimeout(timer);
      resolve(result);
    }
  }).catch(() => {
    if (!finished) {
      finished = true;
      clearTimeout(timer);
      resolve(false);
    }
  });
});

const canConnect = (host, port) => new Promise((resolve) => {
  const socket = new net.Socket();
  let done = false;

  const finish = (result) => {
    if (done) return;
    done = true;
    socket.destroy();
    resolve(result);
  };

  socket.setTimeout(CONNECT_TIMEOUT_MS);
  socket.once('connect', () => finish(true));
  socket.once('timeout', () => finish(false));
  socket.once('error', () => finish(false));
  socket.once('close', () => finish(false));
  socket.connect(port, host);
});

const probeRtspUrl = (host, port, path) => new Promise((resolve) => {
  const socket = new net.Socket();
  let finished = false;
  const normalizedPath = path || '/';
  const url = `rtsp://${host}:${port}${normalizedPath}`;
  let response = '';

  const cleanup = (result) => {
    if (finished) return;
    finished = true;
    socket.destroy();
    resolve(result);
  };

  socket.setTimeout(CONNECT_TIMEOUT_MS);
  socket.once('connect', () => {
    const payload = `DESCRIBE ${url} RTSP/1.0\r\nCSeq: 1\r\nUser-Agent: V380-Discovery\r\nAccept: application/sdp\r\n\r\n`;
    socket.write(payload);
  });
  socket.on('data', (chunk) => {
    response += chunk.toString();
    if (response.includes('RTSP/1.0')) {
      const statusLine = response.split(/\r?\n/)[0] || '';
      // Accept any RTSP response (not 400+ errors in lower range, but 401/403 are auth)
      const success = /^RTSP\/1\.0\s+([12]\d{2}|401|403)/.test(statusLine);
      cleanup(success);
    }
  });
  socket.once('timeout', () => cleanup(false));
  socket.once('error', () => cleanup(false));
  socket.once('close', () => cleanup(false));
  socket.connect(port, host);
});

const getFfprobePath = () => {
  if (process.env.FFPROBE_PATH) return process.env.FFPROBE_PATH;
  if (process.env.FFMPEG_PATH) {
    const ffmpegDir = path.dirname(process.env.FFMPEG_PATH);
    return path.join(ffmpegDir, 'ffprobe.exe');
  }
  return 'ffprobe';
};

const probeRtspWithFfprobe = async (host, port, streamPath) => {
  const ffprobePath = getFfprobePath();
  const pathValue = streamPath || '/';
  const url = `rtsp://${host}:${port}${pathValue}`;
  const args = ['-v', 'error', '-show_streams', '-print_format', 'json', '-rtsp_transport', 'tcp', url];

  try {
    const result = spawnSync(ffprobePath, args, {
      encoding: 'utf8',
      timeout: 10000,
      windowsHide: true
    });
    return result.status === 0;
  } catch (err) {
    logger.debug('FFprobe probe error for', url, err.message);
    return false;
  }
};

const getCameraCandidate = async (host, port) => {
  if (![554, 8554, 80, 8800].includes(port)) return null;

  const portOpen = await withTimeout(canConnect(host, port), CONNECT_TIMEOUT_MS + 500);
  if (!portOpen) return null;

  if (port === 80) {
    // Only treat a host as a camera on port 80 if a known RTSP path responds.
    for (const path of COMMON_RTSP_PATHS) {
      if (await withTimeout(probeRtspUrl(host, port, path), CONNECT_TIMEOUT_MS + 500)) {
        return {
          ipAddress: host,
          port,
          streamType: 'rtsp',
          streamPath: path,
          streamUrl: `rtsp://${host}:${port}${path}`,
          source: 'http-rtsp',
          ptzSupported: false
        };
      }
    }
    return null;
  }

  for (const path of COMMON_RTSP_PATHS) {
    // Check with ffprobe first (has 10s timeout built-in)
    const ffprobeOk = await probeRtspWithFfprobe(host, port, path);
    if (ffprobeOk) {
      logger.debug(`Discovery: Found camera at ${host}:${port}${path}`);
      // Test for PTZ support by checking if HTTP port responds
      let ptzSupported = false;
      try {
        // Try to connect to HTTP port for PTZ control
        if (port !== 80) {
          const httpPort = 80;
          ptzSupported = await withTimeout(canConnect(host, httpPort), 1000);
        }
      } catch (err) {
        // Ignore PTZ detection errors
      }

      return {
        ipAddress: host,
        port,
        streamType: 'rtsp',
        streamPath: path,
        streamUrl: `rtsp://${host}:${port}${path}`,
        ptzSupported
      };
    }

    // Fallback: try basic RTSP probe
    if (await withTimeout(probeRtspUrl(host, port, path), CONNECT_TIMEOUT_MS + 500)) {
      logger.debug(`Discovery: Found camera at ${host}:${port}${path} (RTSP probe)`);
      return {
        ipAddress: host,
        port,
        streamType: 'rtsp',
        streamPath: path,
        streamUrl: `rtsp://${host}:${port}${path}`
      };
    }
  }

  return null;
};

const scanHost = async (host) => {
  const candidates = [];
  for (const port of COMMON_CAMERA_PORTS) {
    const candidate = await getCameraCandidate(host, port);
    if (candidate) {
      logger.debug(`scanHost: Found camera at ${host}:${port}`);
      candidates.push(candidate);
      break;
    }
  }
  return candidates[0] || null;
};

const limitedMap = async (items, mapper, concurrency) => {
  const results = [];
  const queue = [...items];
  const workers = new Array(Math.min(concurrency, items.length)).fill(null).map(async () => {
    while (queue.length) {
      const item = queue.shift();
      try {
        const result = await mapper(item);
        if (result) results.push(result);
      } catch (err) {
        logger.error('Discovery worker error:', err.message);
      }
    }
  });
  await Promise.all(workers);
  return results;
};

const discoverCameras = async () => {
  const interfaces = getLocalIpv4Interfaces();
  if (interfaces.length === 0) {
    logger.debug('No IPv4 interfaces found');
    return [];
  }

  logger.debug(`Discovery: Found ${interfaces.length} IPv4 interface(s)`);
  interfaces.forEach((iface) => {
    logger.debug(`  Interface: ${iface.name} (${iface.address})`);
  });

  // Add overall timeout - discovery should complete within 25 seconds
  const overallTimeout = new Promise((resolve) => {
    setTimeout(() => {
      logger.debug('Discovery timeout reached, returning partial results');
      resolve(null);
    }, 25000);
  });

  const discoverAsync = async () => {
    const hostsToScan = new Set();
    const allIps = new Set();
    
    interfaces.forEach((iface) => {
      const hosts = buildSubnetHosts(iface.address);
      logger.debug(`Discovery: Subnet ${iface.address}/24 has ${hosts.length} hosts to scan`);
      hosts.forEach((host) => {
        hostsToScan.add(host);
        allIps.add(host);
      });
    });

    logger.debug(`Discovery: Starting SSDP discovery...`);
    const ssdpResults = await discoverViaSsdpWithTimeout();
    logger.debug(`Discovery: SSDP found ${ssdpResults.length} device(s)`);
    ssdpResults.forEach((res) => {
      hostsToScan.add(res.ipAddress);
      allIps.add(res.ipAddress);
    });

    logger.debug(`Discovery: Starting V380 UDP discovery...`);
    const v380Results = await discoverViaV380UdpWithTimeout();
    logger.debug(`Discovery: V380 UDP found ${v380Results.length} device(s)`);
    if (v380Results.length > 0) {
      v380Results.forEach((res) => {
        logger.debug(`  V380 Device: ${res.ipAddress}:${res.port} (${res.source})`);
      });
    }
    
    // Remove already-found IPs from subnet scan to save time
    v380Results.forEach((res) => {
      hostsToScan.delete(res.ipAddress);
      allIps.add(res.ipAddress);
    });

    // If we found devices via V380 or SSDP, skip full subnet scan and return immediately
    const foundViaUdp = ssdpResults.length + v380Results.length;
    if (foundViaUdp > 0) {
      logger.debug(`Discovery: Found ${foundViaUdp} devices via UDP methods, skipping full subnet scan`);
      const unique = new Map();
      
      // Add SSDP results
      ssdpResults.forEach((entry) => {
        if (!unique.has(entry.ipAddress)) {
          unique.set(entry.ipAddress, entry);
        }
      });

      // Add V380 UDP results (these are the most reliable for V380 cameras)
      v380Results.forEach((entry) => {
        if (!unique.has(entry.ipAddress)) {
          unique.set(entry.ipAddress, entry);
        }
      });

      const discovered = Array.from(unique.values());
      logger.debug(`Discovery: Total cameras from UDP discovery: ${discovered.length}`);
      if (discovered.length > 0) {
        discovered.forEach((cam) => {
          logger.debug(`  Final Result: ${cam.ipAddress}:${cam.port} - ${cam.streamUrl || '<no RTSP URL>'}`);
        });
      }
      
      if (discovered.length === 0) {
        return [];
      }

      const existingCameras = await Camera.find({ ipAddress: { $in: discovered.map((item) => item.ipAddress) } }).select('ipAddress');
      const existingSet = new Set(existingCameras.map((camera) => camera.ipAddress));

      return discovered.map((item) => ({
        ...item,
        exists: existingSet.has(item.ipAddress)
      }));
    }

    // No results from UDP methods, proceed with subnet scan
    logger.debug(`Discovery: Starting subnet scan of ${hostsToScan.size} hosts...`);
    const scanned = await limitedMap(Array.from(hostsToScan), scanHost, MAX_CONCURRENCY);
    const foundInScan = scanned.filter(s => s).length;
    logger.debug(`Discovery: Subnet scan completed, found ${foundInScan} camera(s)`);
    
    const unique = new Map();
    
    // Add subnet scan results
    scanned.forEach((entry) => {
      if (entry && !unique.has(entry.ipAddress)) {
        unique.set(entry.ipAddress, entry);
      }
    });

    const discovered = Array.from(unique.values());
    logger.debug(`Discovery: Total unique cameras found from subnet scan: ${discovered.length}`);
    
    if (discovered.length === 0) {
      return [];
    }

    const existingCameras = await Camera.find({ ipAddress: { $in: discovered.map((item) => item.ipAddress) } }).select('ipAddress');
    const existingSet = new Set(existingCameras.map((camera) => camera.ipAddress));

    return discovered.map((item) => ({
      ...item,
      exists: existingSet.has(item.ipAddress)
    }));
  };

  try {
    const result = await Promise.race([discoverAsync(), overallTimeout]);
    return result || [];
  } catch (err) {
    logger.error('Discovery error:', err.message);
    return [];
  }
};

// Try to find an RTSP URL for a given host by probing common ports/paths
// Accepts an optional port to try first (useful for V380 UDP discovery giving port 8800)
const findRtspForHost = async (host, preferredPort) => {
  const portsToTry = [];
  if (preferredPort && Number.isFinite(Number(preferredPort))) {
    portsToTry.push(Number(preferredPort));
  }
  // include common RTSP ports and V380 native port 8800
  [554, 8554, 8800].forEach((p) => { if (!portsToTry.includes(p)) portsToTry.push(p); });

  for (const port of portsToTry) {
    const portOpen = await withTimeout(canConnect(host, port), CONNECT_TIMEOUT_MS + 500);
    if (!portOpen) continue;

    for (const path of COMMON_RTSP_PATHS) {
      const ffprobeOk = await probeRtspWithFfprobe(host, port, path);
      if (ffprobeOk) {
        return `rtsp://${host}:${port}${path}`;
      }

      const ok = await withTimeout(probeRtspUrl(host, port, path), CONNECT_TIMEOUT_MS + 500);
      if (ok) return `rtsp://${host}:${port}${path}`;
    }
  }
  return null;
};

module.exports = { discoverCameras, findRtspForHost };
