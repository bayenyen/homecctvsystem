require('dotenv').config();
const connectDB = require('../config/database');
const os = require('os');
const dgram = require('dgram');
const net = require('net');

/**
 * Comprehensive Discovery Diagnostic
 * Tests each discovery method individually
 */

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
];

const COMMON_CAMERA_PORTS = [554, 8554, 8800];
const CONNECT_TIMEOUT_MS = 3000;

const canConnect = (host, port) => new Promise((resolve) => {
  console.log(`  Testing connection: ${host}:${port}...`);
  const socket = new net.Socket();
  let done = false;

  const finish = (result) => {
    if (done) return;
    done = true;
    socket.destroy();
    resolve(result);
  };

  socket.setTimeout(CONNECT_TIMEOUT_MS);
  socket.once('connect', () => {
    console.log(`    ✓ Connected to ${host}:${port}`);
    finish(true);
  });
  socket.once('timeout', () => {
    console.log(`    ✗ Timeout on ${host}:${port}`);
    finish(false);
  });
  socket.once('error', (err) => {
    console.log(`    ✗ Error on ${host}:${port}: ${err.code}`);
    finish(false);
  });
  socket.once('close', () => finish(false));
  socket.connect(port, host);
});

const probeRtspWithFfprobe = async (host, port, streamPath) => {
  const ffprobePath = process.env.FFPROBE_PATH || 'ffprobe';
  const pathValue = streamPath || '/';
  const url = `rtsp://${host}:${port}${pathValue}`;
  const args = ['-v', 'error', '-show_streams', '-print_format', 'json', '-rtsp_transport', 'tcp', url];

  console.log(`    Probing RTSP: ${url}`);
  
  try {
    const result = spawnSync(ffprobePath, args, {
      encoding: 'utf8',
      timeout: 10000,
      windowsHide: true,
      stdio: ['pipe', 'pipe', 'pipe']
    });
    
    if (result.status === 0) {
      console.log(`      ✓ FFprobe OK: valid RTSP stream found`);
      return true;
    } else {
      const stderr = result.stderr || result.error || 'Unknown error';
      console.log(`      ✗ FFprobe failed (code ${result.status}): ${stderr.substring(0, 100)}`);
      return false;
    }
  } catch (err) {
    console.log(`    ✗ FFprobe error: ${err.message}`);
    return false;
  }
};

const testSingleCamera = async (host) => {
  console.log(`\n📹 Testing camera at: ${host}`);
  
  for (const port of COMMON_CAMERA_PORTS) {
    console.log(`\n  Port ${port}:`);
    
    const portOpen = await canConnect(host, port);
    if (!portOpen) {
      console.log(`    → Port ${port} is closed, skipping RTSP probes\n`);
      continue;
    }

    console.log(`    Port ${port} is open! Testing RTSP paths...`);
    let found = false;
    
    for (const path of COMMON_RTSP_PATHS) {
      const ffprobeOk = await probeRtspWithFfprobe(host, port, path);
      if (ffprobeOk) {
        console.log(`    ✅ CAMERA FOUND: rtsp://${host}:${port}${path}`);
        found = true;
        break;
      }
    }
    
    if (!found) {
      console.log(`    No valid RTSP streams found on port ${port}`);
    }
  }
};

const testSubnet = async () => {
  const interfaces = os.networkInterfaces();
  const localIp = Object.values(interfaces)
    .flat()
    .find(addr => addr.family === 'IPv4' && !addr.internal)?.address;

  if (!localIp) {
    console.error('No IPv4 interface found!');
    return;
  }

  console.log(`Local IP: ${localIp}`);
  console.log(`Network: ${localIp.split('.').slice(0, 3).join('.')}.0/24`);
  
  const parts = localIp.split('.');
  const prefix = `${parts[0]}.${parts[1]}.${parts[2]}.`;
  
  console.log(`\nScanning ${prefix}1 - ${prefix}254 for cameras...`);
  console.log('(Testing first 50 IPs, then every 5th IP for speed)\n');

  // Test first 50 IPs thoroughly, then sample
  for (let i = 1; i < 255; i++) {
    if (i > 50 && i % 5 !== 0) continue; // Skip after first 50 except every 5th
    
    const ip = `${prefix}${i}`;
    if (ip === localIp) continue;
    
    // Quick port check before full probe
    const hasOpenPort = await Promise.race([
      Promise.all(COMMON_CAMERA_PORTS.map(p => canConnect(ip, p).then(r => r ? p : null))),
      new Promise(r => setTimeout(() => r([null]), 2000))
    ]);
    
    const openPort = hasOpenPort.find(p => p !== null);
    if (openPort) {
      await testSingleCamera(ip);
    }
  }
};

// Main
const testIp = process.argv[2];
if (testIp) {
  testSingleCamera(testIp).catch(console.error);
} else {
  testSubnet().catch(console.error);
}
