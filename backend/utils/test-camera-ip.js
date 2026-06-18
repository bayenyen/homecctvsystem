#!/usr/bin/env node
/**
 * Test specific camera IPs to diagnose discovery issues
 * Usage: node test-camera-ip.js <ip1> [ip2] [ip3] ...
 * Example: node test-camera-ip.js 192.168.1.100 192.168.1.101 192.168.1.102
 */

const net = require('net');
const { spawnSync } = require('child_process');

const RTSP_PATHS = [
  '/h264', '/stream', '/ch01/0', '/live', '/live.sdp',
  '/mpeg4', '/11', '/12', '/0',
];

const PORTS_TO_TEST = [554, 8554, 8800, 80, 8080, 8000];
const CONNECT_TIMEOUT_MS = 3000;

function canConnect(host, port) {
  return new Promise((resolve) => {
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
    socket.connect(port, host);
  });
}

function probeRtspSocket(host, port, path) {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    let finished = false;
    const url = `rtsp://${host}:${port}${path || '/'}`;
    let response = '';

    const cleanup = (result) => {
      if (finished) return;
      finished = true;
      socket.destroy();
      resolve(result);
    };

    socket.setTimeout(CONNECT_TIMEOUT_MS);
    socket.once('connect', () => {
      const payload = `DESCRIBE ${url} RTSP/1.0\r\nCSeq: 1\r\nUser-Agent: Discovery\r\n\r\n`;
      socket.write(payload);
    });
    
    socket.on('data', (chunk) => {
      response += chunk.toString();
      if (response.includes('RTSP/1.0')) {
        const statusLine = response.split(/\r?\n/)[0] || '';
        const success = /^RTSP\/1\.0\s+\d{3}/.test(statusLine);
        if (success) {
          cleanup({
            success: true,
            statusLine,
            response: response.substring(0, 200)
          });
        }
      }
    });

    socket.once('timeout', () => cleanup({ success: false, reason: 'timeout' }));
    socket.once('error', (err) => cleanup({ success: false, reason: err.code }));
    socket.once('close', () => cleanup({ success: false, reason: 'closed' }));
    socket.connect(port, host);
  });
}

async function testCamera(ip) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`📹 Testing Camera: ${ip}`);
  console.log('='.repeat(60));

  for (const port of PORTS_TO_TEST) {
    console.log(`\nPort ${port}:`);
    const connected = await canConnect(ip, port);
    
    if (!connected) {
      console.log(`  ✗ Port closed/unreachable`);
      continue;
    }

    console.log(`  ✓ Port OPEN`);

    // Test RTSP paths on this port
    let foundStream = false;
    for (const path of RTSP_PATHS) {
      const result = await probeRtspSocket(ip, port, path);
      if (result.success || (result.statusLine && /^RTSP\/1\.0\s+\d+/.test(result.statusLine))) {
        console.log(`    ✅ STREAM FOUND: rtsp://${ip}:${port}${path}`);
        console.log(`       Response: ${result.statusLine}`);
        foundStream = true;
        break;
      }
    }

    if (!foundStream) {
      console.log(`  ✗ No valid RTSP streams on port ${port}`);
    }
  }
}

async function main() {
  const ips = process.argv.slice(2);

  if (ips.length === 0) {
    console.log('Usage: node test-camera-ip.js <ip1> [ip2] [ip3] ...');
    console.log('Example: node test-camera-ip.js 192.168.1.100 192.168.1.101');
    process.exit(1);
  }

  console.log(`\n🔍 Camera Discovery Diagnostics`);
  console.log(`Testing ${ips.length} camera IP(s)...`);
  console.log(`Ports: ${PORTS_TO_TEST.join(', ')}`);
  console.log(`Timeout: ${CONNECT_TIMEOUT_MS}ms per connection`);

  for (const ip of ips) {
    await testCamera(ip);
  }

  console.log(`\n${'='.repeat(60)}`);
  console.log('✅ Diagnostics complete');
  console.log('='.repeat(60) + '\n');
}

main().catch(console.error);
