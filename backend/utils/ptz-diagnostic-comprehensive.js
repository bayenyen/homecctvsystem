require('dotenv').config();
const connectDB = require('../config/database');
const Camera = require('../models/Camera');
const axios = require('axios');
const { Cam } = require('onvif');

/**
 * Comprehensive PTZ Diagnostic
 * Tests multiple PTZ protocols on cameras
 */

const testPtzMethods = async () => {
  try {
    await connectDB();
    
    console.log('\n╔═══════════════════════════════════════════════════╗');
    console.log('║   Comprehensive PTZ Protocol Testing              ║');
    console.log('╚═══════════════════════════════════════════════════╝\n');

    // Get a sample camera
    const camera = await Camera.findOne({
      ipAddress: { $in: ['192.168.1.2', '192.168.1.3', '192.168.1.4'] }
    }).select('+password');

    if (!camera) {
      console.log('No cameras found');
      process.exit(0);
    }

    console.log(`📹 Testing camera: ${camera.name}`);
    console.log(`   IP: ${camera.ipAddress}:${camera.port}`);
    console.log(`   Username: ${camera.username || 'admin'}`);
    console.log(`   RTSP: ${camera.streamUrl}\n`);

    // Test 1: ONVIF on port 80
    console.log('Test 1: ONVIF on Port 80');
    await testONVIFPort(camera, 80);

    // Test 2: ONVIF on port 8080
    console.log('\nTest 2: ONVIF on Port 8080');
    await testONVIFPort(camera, 8080);

    // Test 3: V380-specific endpoints
    console.log('\nTest 3: V380 HTTP API Endpoints');
    await testV380Endpoints(camera);

    // Test 4: HTTP probing
    console.log('\nTest 4: HTTP Port Probing');
    await probeHttpPorts(camera);

    console.log('\n✓ Diagnostic complete\n');
    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
};

const testONVIFPort = async (camera, port) => {
  return new Promise(resolve => {
    const timeout = setTimeout(() => {
      console.log(`  ⚠ Timeout on port ${port}`);
      resolve();
    }, 5000);

    const cam = new Cam({
      hostname: camera.ipAddress,
      port: port,
      username: camera.username || 'admin',
      password: camera.password || '',
      path: '/onvif/device_service'
    }, (err) => {
      clearTimeout(timeout);
      if (err) {
        console.log(`  ✗ Error: ${err.message}`);
      } else {
        if (cam.profiles && cam.profiles.length > 0) {
          console.log(`  ✓ ONVIF connected!`);
          console.log(`    Profiles: ${cam.profiles.length}`);
          console.log(`    Profile token: ${cam.profiles[0].$.token}`);
        } else {
          console.log(`  ⚠ Connected but no profiles`);
        }
      }
      resolve();
    });
  });
};

const testV380Endpoints = async (camera) => {
  const ports = [80, 8080, 8000, 8888];
  const endpoints = [
    '/v1/open/ptz',
    '/api/v1/ptz',
    '/ptz.cgi',
    '/cgi-bin/ptzctrl',
    '/cgi-bin/ptz',
    '/ptzctrl.cgi',
    '/onvif/device_service',
  ];

  for (const port of ports) {
    for (const endpoint of endpoints) {
      try {
        const url = `http://${camera.ipAddress}:${port}${endpoint}`;
        const response = await axios.head(url, {
          timeout: 1000,
          validateStatus: () => true,
          auth: camera.username ? {
            username: camera.username,
            password: camera.password
          } : undefined
        });
        
        if (response.status < 400) {
          console.log(`  ✓ Found: ${url} (${response.status})`);
        }
      } catch (err) {
        // Silently fail
      }
    }
  }
};

const probeHttpPorts = async (camera) => {
  const ports = [80, 8080, 8000, 8888, 8899, 8800, 8081];
  
  for (const port of ports) {
    try {
      const response = await axios.get(`http://${camera.ipAddress}:${port}/`, {
        timeout: 1000,
        validateStatus: () => true,
        auth: camera.username ? {
          username: camera.username,
          password: camera.password
        } : undefined
      });
      
      if (response.status < 400) {
        console.log(`  ✓ Port ${port}: Responsive (${response.status})`);
        if (response.headers['server']) {
          console.log(`    Server: ${response.headers['server']}`);
        }
      }
    } catch (err) {
      // Silently fail
    }
  }
};

testPtzMethods();
