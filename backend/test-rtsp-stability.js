#!/usr/bin/env node
/**
 * RTSP Connection Stability Test
 * Tests each camera's RTSP connection for stability and frame delivery
 */

const { spawn } = require('child_process');
const path = require('path');
require('dotenv').config();

const ffmpegPath = process.env.FFMPEG_PATH || 'ffmpeg';

const cameras = [
  { name: 'Living Room', url: 'rtsp://192.168.1.4:554/h264' },
  { name: 'Back Yard', url: 'rtsp://192.168.1.3:554/h264' },
  { name: 'Front Yard', url: 'rtsp://192.168.1.5:554/h264' }
];

async function testCamera(camera, durationSeconds = 10) {
  return new Promise((resolve) => {
    console.log(`\n🔍 Testing ${camera.name} (${camera.url})...`);
    console.log(`   Duration: ${durationSeconds} seconds`);
    
    const startTime = Date.now();
    let frameCount = 0;
    let lastTimestamp = null;
    let timestampResets = 0;
    let errors = [];
    let stderrData = '';

    const args = [
      '-rtsp_transport', 'tcp',
      '-timeout', '5000000',
      '-i', camera.url,
      '-c:v', 'copy',
      '-an',
      '-f', 'null',
      '-'
    ];

    const proc = spawn(ffmpegPath, args, {
      windowsHide: true,
      stdio: ['ignore', 'pipe', 'pipe']
    });

    const timeoutHandle = setTimeout(() => {
      if (!proc.killed) {
        proc.kill('SIGTERM');
      }
    }, durationSeconds * 1000 + 2000);

    proc.stderr.on('data', (chunk) => {
      const text = chunk.toString();
      stderrData += text;
      
      // Look for frame output
      const frameMatch = text.match(/frame=\s*(\d+)/);
      const timeMatch = text.match(/time=(\d+):(\d+):([\d.]+)/);
      
      if (frameMatch) {
        const newCount = parseInt(frameMatch[1]);
        if (newCount < frameCount) {
          timestampResets++;
          console.log(`   ⚠️  Frame jump detected: ${frameCount} -> ${newCount}`);
        }
        frameCount = newCount;
      }
      
      if (timeMatch) {
        const timestamp = `${timeMatch[1]}:${timeMatch[2]}:${timeMatch[3]}`;
        if (lastTimestamp === timestamp) {
          console.log(`   ⚠️  Timestamp frozen: ${timestamp}`);
        }
        lastTimestamp = timestamp;
      }
    });

    proc.on('error', (err) => {
      errors.push(err.message);
    });

    proc.on('exit', (code, signal) => {
      clearTimeout(timeoutHandle);
      const duration = ((Date.now() - startTime) / 1000).toFixed(2);
      
      console.log(`\n📊 ${camera.name} - Results:`);
      console.log(`   Duration: ${duration}s`);
      console.log(`   Frames: ${frameCount}`);
      console.log(`   Frame Rate: ${(frameCount / duration).toFixed(2)} fps`);
      console.log(`   Timestamp Resets: ${timestampResets}`);
      console.log(`   Exit Code: ${code}, Signal: ${signal}`);
      
      if (errors.length > 0) {
        console.log(`   Errors: ${errors.join(', ')}`);
      }

      // Check for connection issues in stderr
      if (stderrData.includes('Connection refused')) {
        console.log(`   ❌ Connection refused - Camera may be offline`);
      }
      if (stderrData.includes('Connection timed out')) {
        console.log(`   ⚠️  Connection timeout - Network issues`);
      }
      if (stderrData.includes('RTSP')) {
        console.log(`   ✓ RTSP connection established`);
      }

      resolve({
        name: camera.name,
        duration: parseFloat(duration),
        frames: frameCount,
        fps: parseFloat((frameCount / duration).toFixed(2)),
        timestampResets,
        exitCode: code,
        signal,
        hasErrors: errors.length > 0,
        isHealthy: timestampResets === 0 && !errors.length && frameCount > 0
      });
    });
  });
}

async function main() {
  console.log('\n╔════════════════════════════════════════╗');
  console.log('║  RTSP Connection Stability Test        ║');
  console.log('╚════════════════════════════════════════╝');

  const results = [];
  
  for (const camera of cameras) {
    const result = await testCamera(camera, 10);
    results.push(result);
  }

  console.log('\n\n╔════════════════════════════════════════╗');
  console.log('║  Summary                               ║');
  console.log('╚════════════════════════════════════════╝\n');

  results.forEach(r => {
    const status = r.isHealthy ? '✅' : '❌';
    console.log(`${status} ${r.name}`);
    console.log(`   FPS: ${r.fps.toFixed(1)} | Timestamp Resets: ${r.timestampResets} | Exit Code: ${r.exitCode}`);
  });

  const unhealthy = results.filter(r => !r.isHealthy);
  if (unhealthy.length > 0) {
    console.log('\n🔴 PROBLEMATIC CAMERAS:');
    unhealthy.forEach(cam => {
      console.log(`   - ${cam.name}`);
      if (cam.timestampResets > 0) {
        console.log(`     Issue: Timestamp is freezing/resetting (${cam.timestampResets} resets in 10s)`);
      }
      if (cam.fps < 5) {
        console.log(`     Issue: Very low FPS (${cam.fps.toFixed(1)} fps)`);
      }
      if (cam.hasErrors) {
        console.log(`     Issue: Connection errors detected`);
      }
    });
    
    console.log('\n💡 TROUBLESHOOTING STEPS:');
    unhealthy.forEach(cam => {
      console.log(`\nFor ${cam.name}:`);
      console.log('   1. Check network cable connection');
      console.log('   2. Verify camera IP is correct (check camera web UI)');
      console.log('   3. Try power cycle the camera (30 seconds)');
      console.log('   4. Check for firmware updates on camera');
      console.log('   5. Try changing RTSP port (test with :8554 if :554 fails)');
      console.log('   6. Check firewall/network settings');
    });
  } else {
    console.log('\n✅ All cameras are healthy!');
  }

  process.exit(unhealthy.length > 0 ? 1 : 0);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
