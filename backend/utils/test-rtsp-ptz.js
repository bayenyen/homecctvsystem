require('dotenv').config();
const connectDB = require('../config/database');
const Camera = require('../models/Camera');
const { exec } = require('child_process');
const util = require('util');
const execAsync = util.promisify(exec);

/**
 * Test RTSP PTZ Commands
 * Some cameras support PTZ via RTSP SETUP/PLAY commands
 */

const testRtspPtz = async () => {
  try {
    await connectDB();
    
    console.log('\n╔═══════════════════════════════════════════════════╗');
    console.log('║   Testing RTSP-based PTZ Control Methods         ║');
    console.log('║   (Some cameras support PTZ via RTSP)            ║');
    console.log('╚═══════════════════════════════════════════════════╝\n');

    const camera = await Camera.findOne({
      ipAddress: '192.168.1.2',
      streamUrl: { $exists: true }
    }).select('+password');

    if (!camera) {
      console.log('Camera not found');
      process.exit(0);
    }

    console.log(`📹 Testing camera: ${camera.name}`);
    console.log(`   IP: ${camera.ipAddress}`);
    console.log(`   RTSP: ${camera.streamUrl}\n`);

    // Method 1: Try RTSP SETUP with PTZ parameter
    console.log('Method 1: RTSP SETUP with PTZ options');
    await testRtspSetup(camera);

    // Method 2: Try special RTSP URLs
    console.log('\nMethod 2: Testing alternate RTSP URLs for PTZ');
    await testAltRtspUrls(camera);

    // Method 3: Check ffprobe for PTZ info
    console.log('\nMethod 3: Checking camera capabilities with ffprobe');
    await checkCameraCapabilities(camera);

    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
};

const testRtspSetup = async (camera) => {
  // Try using ffmpeg to test RTSP protocol options
  try {
    const rtspUrl = camera.streamUrl;
    const { stdout, stderr } = await execAsync(
      `ffmpeg -rtsp_transport tcp -i "${rtspUrl}" -f null - -t 1 2>&1 | head -50`,
      { timeout: 5000 }
    );
    
    const output = stdout + stderr;
    
    // Look for PTZ or control information
    if (output.includes('ptz') || output.includes('PTZ')) {
      console.log('  ✓ Found PTZ information in stream');
      const lines = output.split('\n').filter(l => l.includes('ptz') || l.includes('PTZ'));
      lines.forEach(l => console.log(`    ${l}`));
    } else if (output.includes('control') || output.includes('control')) {
      console.log('  ✓ Found control information');
    } else {
      console.log('  ✗ No PTZ information in RTSP headers');
    }
  } catch (err) {
    console.log(`  ✗ Error: ${err.message.substring(0, 100)}`);
  }
};

const testAltRtspUrls = async (camera) => {
  // Some cameras have alternate RTSP URLs for different features
  const altUrls = [
    `rtsp://${camera.ipAddress}:554/ptz`,
    `rtsp://${camera.ipAddress}:554/control`,
    `rtsp://${camera.ipAddress}:554/h264/ch1/main/ptz`,
    `rtsp://${camera.ipAddress}:554/stream/ptz`,
    `rtsp://${camera.ipAddress}:554/Streaming/channels/1?tcp`,
  ];

  for (const url of altUrls) {
    try {
      const { stdout, stderr } = await execAsync(
        `ffprobe -v error -show_format "${url}" -t 1 2>&1 | head -5`,
        { timeout: 2000 }
      );
      
      if (stdout && !stdout.includes('error')) {
        console.log(`  ✓ Valid URL: ${url}`);
      }
    } catch (err) {
      // Continue
    }
  }
};

const checkCameraCapabilities = async (camera) => {
  try {
    const { stdout, stderr } = await execAsync(
      `ffprobe -v debug -show_format "${camera.streamUrl}" 2>&1 | grep -i "ptz\\|control\\|codec" | head -20`,
      { timeout: 5000 }
    );
    
    const output = stdout + stderr;
    if (output.trim()) {
      console.log('  Capabilities found:');
      output.split('\n').forEach(line => {
        if (line.trim()) console.log(`    ${line.substring(0, 100)}`);
      });
    } else {
      console.log('  No special capabilities detected');
    }
  } catch (err) {
    console.log('  Unable to detect special capabilities');
  }
};

testRtspPtz();
