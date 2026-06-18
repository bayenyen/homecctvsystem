require('dotenv').config();
const net = require('net');
const { spawnSync } = require('child_process');

const CAMERA_IPS = ['192.168.1.2', '192.168.1.3', '192.168.1.4'];
const COMMON_PORTS = [80, 554, 8554, 8800, 8080, 8000];
const COMMON_RTSP_PATHS = [
  '/h264', '/stream', '/ch01/0', '/live',
  '/mpeg4', '/11', '/12', '/0',
  '/cam/realmonitor?channel=1&subtype=0',
  '/realmonitor?channel=1&subtype=0',
  '/h264/ch1/main/av_stream',
  '/'
];

const testConnection = (host, port) => new Promise((resolve) => {
  console.log(`    Testing ${host}:${port}...`);
  const socket = new net.Socket();
  let done = false;

  const finish = (result) => {
    if (done) return;
    done = true;
    socket.destroy();
    resolve(result);
  };

  socket.setTimeout(1000);
  socket.once('connect', () => {
    finish(true);
  });
  socket.once('timeout', () => finish(false));
  socket.once('error', () => finish(false));
  socket.connect(port, host);
});

const probeRtspUrl = (host, port, path) => new Promise((resolve) => {
  console.log(`      RTSP ${host}:${port}${path}...`);
  const socket = new net.Socket();
  let finished = false;
  let response = '';

  const cleanup = (result) => {
    if (finished) return;
    finished = true;
    socket.destroy();
    resolve(result);
  };

  socket.setTimeout(1500);
  socket.once('connect', () => {
    const url = `rtsp://${host}:${port}${path}`;
    const payload = `DESCRIBE ${url} RTSP/1.0\r\nCSeq: 1\r\nUser-Agent: Test\r\n\r\n`;
    socket.write(payload);
  });
  socket.on('data', (chunk) => {
    response += chunk.toString();
    if (response.includes('RTSP/1.0')) {
      const statusLine = response.split(/\r?\n/)[0] || '';
      const success = /^RTSP\/1\.0\s+([12]\d{2}|401|403)/.test(statusLine);
      console.log(`        ✓ Response: ${statusLine.slice(0, 50)}`);
      cleanup(success);
    }
  });
  socket.once('timeout', () => cleanup(false));
  socket.once('error', () => cleanup(false));
  socket.connect(port, host);
});

const probeWithFfprobe = (host, port, path) => {
  const url = `rtsp://${host}:${port}${path}`;
  console.log(`      FFprobe ${url}...`);
  
  const result = spawnSync('ffprobe', [
    '-v', 'error',
    '-show_streams',
    '-print_format', 'json',
    '-rtsp_transport', 'tcp',
    url
  ], {
    encoding: 'utf8',
    timeout: 5000,
    windowsHide: true,
    stdio: ['pipe', 'pipe', 'pipe']
  });

  if (result.status === 0 && result.stdout) {
    try {
      const data = JSON.parse(result.stdout);
      if (data.streams && data.streams.length > 0) {
        console.log(`        ✓ FFprobe found stream(s)`);
        return true;
      }
    } catch (e) {
      // ignore parse error
    }
  }
  return false;
};

(async () => {
  console.log('\n╔════════════════════════════════════════╗');
  console.log('║   Camera Connectivity Test             ║');
  console.log('╚════════════════════════════════════════╝\n');

  for (const ip of CAMERA_IPS) {
    console.log(`\n📷 Testing ${ip}:`);
    
    // Test each port
    let foundPort = null;
    for (const port of COMMON_PORTS) {
      const canConnect = await testConnection(ip, port);
      if (canConnect) {
        console.log(`  ✓ Port ${port} is open`);
        foundPort = port;
        break;
      }
    }

    if (!foundPort) {
      console.log(`  ✗ No open ports found on ${ip}`);
      console.log(`    Tried: ${COMMON_PORTS.join(', ')}`);
      continue;
    }

    // Found a port, now probe RTSP paths
    console.log(`  Probing RTSP paths on port ${foundPort}:`);
    let foundStream = false;

    for (const path of COMMON_RTSP_PATHS) {
      // Try FFprobe first
      if (probeWithFfprobe(ip, foundPort, path)) {
        console.log(`    ✓✓✓ RTSP stream found: rtsp://${ip}:${foundPort}${path}`);
        foundStream = true;
        break;
      }

      // Fallback to raw RTSP probe
      const result = await probeRtspUrl(ip, foundPort, path);
      if (result) {
        console.log(`    ✓✓ RTSP probe successful: rtsp://${ip}:${foundPort}${path}`);
        foundStream = true;
        break;
      }
    }

    if (!foundStream) {
      console.log(`  ⚠️  No RTSP streams found on port ${foundPort}`);
    }
  }

  console.log('\n╔════════════════════════════════════════╗');
  console.log('║           ANALYSIS                     ║');
  console.log('╚════════════════════════════════════════╝\n');
  console.log('If cameras were found above:');
  console.log('  • They are reachable on the network');
  console.log('  • Discovery service may need adjustment');
  console.log('  • Try manually adding cameras with known IPs\n');
  console.log('If cameras were NOT found:');
  console.log('  • Check if cameras are powered on');
  console.log('  • Verify they are on the same network (192.168.1.x)');
  console.log('  • Check firewall settings\n');

  process.exit(0);
})();
