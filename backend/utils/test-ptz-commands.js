require('dotenv').config();
const mongoose = require('mongoose');
const { Cam } = require('onvif');
const Camera = require('../models/Camera');
const logger = require('../utils/logger');

/**
 * Test ONVIF PTZ commands on port 8899
 */

const testONVIFPTZCommands = async () => {
  console.log('\n╔═══════════════════════════════════════════════════╗');
  console.log('║   Testing ONVIF PTZ Commands on Port 8899       ║');
  console.log('║   Simulating real PTZ operations                ║');
  console.log('╚═══════════════════════════════════════════════════╝\n');

  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✓ Connected to MongoDB');

    // Get cameras from database
    const cameras = await Camera.find({ ptzSupported: true }).limit(3);
    console.log(`\nFound ${cameras.length} PTZ-enabled cameras\n`);

    for (const camera of cameras) {
      console.log(`\n📹 Testing: ${camera.name} (${camera.ipAddress})`);
      console.log(`   RTSP: ${camera.streamUrl}`);
      console.log(`   Protocol: ${camera.ptzConfig?.protocol || 'http'}`);
      console.log(`   Port: ${camera.ptzConfig?.port || 8899}`);

      const onvifPort = camera.ptzConfig?.port || 8899;

      await new Promise((resolve) => {
        let testTimeout = setTimeout(() => {
          console.log(`   ✗ Test timeout`);
          resolve();
        }, 10000);

        const cam = new Cam({
          hostname: camera.ipAddress,
          port: onvifPort,
          username: camera.username || 'admin',
          password: camera.password || '',
          path: '/onvif/device_service'
        }, async (err) => {
          if (err) {
            clearTimeout(testTimeout);
            console.log(`   ✗ Connection failed: ${err.message}`);
            return resolve();
          }

          console.log(`   ✓ Connected to ONVIF service`);

          try {
            // Get profiles
            const profiles = cam.profiles;
            if (!profiles || profiles.length === 0) {
              console.log(`   ✗ No PTZ profiles found`);
              clearTimeout(testTimeout);
              return resolve();
            }

            const profile = profiles[0];
            console.log(`   ✓ Profile found: ${profile.$.token}`);

            // Test continuous move UP
            console.log(`   Testing: Pan/Tilt UP...`);
            cam.continuousMove({
              ProfileToken: profile.$.token,
              Velocity: {
                PanTilt: { x: 0, y: 0.5 },
                Zoom: { x: 0 }
              }
            }, (err) => {
              if (err) {
                console.log(`   ✗ Move UP failed: ${err.message}`);
              } else {
                console.log(`   ✓ Move UP command sent`);
              }

              // Wait a second then stop
              setTimeout(() => {
                console.log(`   Testing: Stop...`);
                cam.stop({ ProfileToken: profile.$.token }, (err) => {
                  if (err) {
                    console.log(`   ? Stop: ${err.message || 'completed anyway'}`);
                  } else {
                    console.log(`   ✓ Stop command sent`);
                  }

                  clearTimeout(testTimeout);
                  resolve();
                });
              }, 1000);
            });
          } catch (e) {
            console.log(`   ✗ Error: ${e.message}`);
            clearTimeout(testTimeout);
            resolve();
          }
        });
      });
    }

    console.log('\n✓ PTZ test complete\n');
    process.exit(0);

  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
};

testONVIFPTZCommands();
