require('dotenv').config();
const connectDB = require('../config/database');
const Camera = require('../models/Camera');
const { Cam } = require('onvif');

/**
 * Test ONVIF PTZ connection on cameras
 */

const testONVIFPtz = async () => {
  try {
    await connectDB();
    
    console.log('\n╔═══════════════════════════════════════════════════╗');
    console.log('║   Testing ONVIF PTZ Connection                   ║');
    console.log('╚═══════════════════════════════════════════════════╝\n');

    // Get unique cameras
    const cameras = await Camera.find({
      ipAddress: { $in: ['192.168.1.2', '192.168.1.3', '192.168.1.4'] },
      ptzSupported: true
    }).limit(3);

    if (cameras.length === 0) {
      console.log('No cameras with PTZ enabled found');
      process.exit(0);
    }

    console.log(`Testing ONVIF PTZ on ${cameras.length} cameras\n`);

    for (const camera of cameras) {
      console.log(`📹 Testing: ${camera.name}`);
      console.log(`   IP: ${camera.ipAddress}:${camera.port}`);
      console.log(`   Auth: ${camera.username || 'admin'}`);
      
      try {
        const cam = new Cam({
          hostname: camera.ipAddress,
          port: camera.port || 80,
          username: camera.username || 'admin',
          password: camera.password || '',
          path: '/onvif/device_service'
        }, (err) => {
          if (err) {
            console.log(`   ✗ Connection failed: ${err.message}\n`);
            testNext();
            return;
          }

          try {
            if (cam.profiles && cam.profiles.length > 0) {
              console.log(`   ✓ Connected to ONVIF service`);
              console.log(`   ✓ Found ${cam.profiles.length} PTZ profile(s)`);
              console.log(`   ✓ ONVIF PTZ is available\n`);
            } else {
              console.log(`   ⚠ Connected but no PTZ profiles found\n`);
            }
          } catch (e) {
            console.log(`   ✗ Profile error: ${e.message}\n`);
          }
          
          testNext();
        });

        const testNext = async () => {
          const idx = cameras.indexOf(camera);
          if (idx < cameras.length - 1) {
            const nextCam = cameras[idx + 1];
            // Test next camera after delay
            await new Promise(r => setTimeout(r, 500));
          } else {
            console.log('✓ ONVIF PTZ testing complete\n');
            process.exit(0);
          }
        };
      } catch (err) {
        console.log(`   ✗ Test error: ${err.message}\n`);
      }
    }

    // Set timeout in case connection hangs
    setTimeout(() => {
      console.log('⚠ Test timeout - check if ONVIF is enabled on cameras\n');
      process.exit(1);
    }, 15000);

  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
};

testONVIFPtz();
