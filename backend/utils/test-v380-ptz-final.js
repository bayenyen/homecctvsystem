require('dotenv').config();
const connectDB = require('../config/database');
const Camera = require('../models/Camera');
const axios = require('axios');

/**
 * Test PTZ on manually configured V380 cameras
 * Diagnose why PTZ is not working
 */

const testV380Cameras = async () => {
  try {
    await connectDB();
    
    console.log('\n╔═══════════════════════════════════════════════════╗');
    console.log('║   Testing V380 Camera PTZ Connectivity            ║');
    console.log('╚═══════════════════════════════════════════════════╝\n');

    // Find the three main cameras (192.168.1.2, 3, 4)
    const cameras = await Camera.find({
      ipAddress: { $in: ['192.168.1.2', '192.168.1.3', '192.168.1.4'] },
      ptzSupported: true
    });

    if (cameras.length === 0) {
      console.log('No cameras with PTZ enabled found for 192.168.1.2/3/4');
      process.exit(0);
    }

    console.log(`Testing ${cameras.length} cameras with PTZ enabled\n`);

    for (const cam of cameras) {
      console.log(`📹 Testing: ${cam.name} (${cam.ipAddress}:${cam.port})`);
      console.log(`   Protocol: ${cam.ptzConfig?.protocol || 'http'}`);
      console.log(`   Stream: ${cam.streamUrl}`);
      
      const ports = [80, 8000, 8080, 8800, cam.port];
      let foundWorking = false;

      for (const port of ports) {
        const url = `http://${cam.ipAddress}:${port}/ptzctrl.cgi?cmd=home`;
        try {
          const response = await axios.get(url, {
            timeout: 1000,
            validateStatus: () => true
          });
          
          const statusOk = response.status >= 200 && response.status < 300;
          const status = statusOk ? '✓ 200 OK' : `✗ ${response.status}`;
          
          console.log(`   Port ${port}: ${status}`);
          
          if (statusOk) {
            foundWorking = true;
          }
        } catch (err) {
          const code = err.code || err.message;
          console.log(`   Port ${port}: ✗ ${code}`);
        }
      }

      if (foundWorking) {
        console.log(`   ✓ PTZ working on one of the ports!\n`);
      } else {
        console.log(`   ✗ PTZ not responding on any port\n`);
      }
    }

    console.log('\n📝 Analysis:');
    console.log('  If no ports returned 200 OK:');
    console.log('    1. These V380 cameras do NOT support HTTP-based PTZ');
    console.log('    2. V380 protocol is for DISCOVERY only, not PTZ control');
    console.log('    3. PTZ may not be available for this camera model');
    console.log('\n  Recommendation:');
    console.log('    • Disable PTZ for these cameras');
    console.log('    • Check camera manual for actual PTZ support');
    console.log('    • Some V380 cameras only support PTZ via their native app\n');

    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
};

testV380Cameras();
