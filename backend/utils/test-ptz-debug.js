require('dotenv').config();
const connectDB = require('../config/database');
const Camera = require('../models/Camera');
const axios = require('axios');

const testPtzCommand = async (cameraIp, port, command) => {
  const commands = {
    up: 'ptzctrl.cgi?cmd=up',
    down: 'ptzctrl.cgi?cmd=down',
    left: 'ptzctrl.cgi?cmd=left',
    right: 'ptzctrl.cgi?cmd=right',
    stop: 'ptzctrl.cgi?cmd=stop',
    home: 'ptzctrl.cgi?cmd=home'
  };

  const ports = [80, 8000, 8080, 8800, port];
  const endpoint = commands[command] || 'ptzctrl.cgi?cmd=up';

  for (const p of ports) {
    const url = `http://${cameraIp}:${p}/${endpoint}`;
    try {
      console.log(`  Trying: ${url}`);
      const response = await axios.get(url, { timeout: 2000, validateStatus: () => true });
      console.log(`    Status: ${response.status}`);
      if (response.status >= 200 && response.status < 400) {
        console.log(`    ✓ SUCCESS on port ${p}`);
        return { port: p, status: response.status };
      }
    } catch (err) {
      console.log(`    Error: ${err.code || err.message}`);
    }
  }
  return null;
};

(async () => {
  try {
    await connectDB();
    
    console.log('\n╔════════════════════════════════════════╗');
    console.log('║   PTZ Control Debug Test               ║');
    console.log('╚════════════════════════════════════════╝\n');

    const cameras = await Camera.find({}).select('+password');
    
    if (cameras.length === 0) {
      console.log('No cameras in database');
      process.exit(0);
    }

    console.log(`Found ${cameras.length} camera(s)\n`);

    for (const cam of cameras) {
      console.log(`📷 ${cam.name}`);
      console.log(`   IP: ${cam.ipAddress}:${cam.port}`);
      console.log(`   RTSP URL: ${cam.streamUrl}`);
      console.log(`   PTZ Supported: ${cam.ptzSupported}`);
      console.log(`   PTZ Config:`, cam.ptzConfig || 'none');
      
      if (cam.ptzSupported) {
        console.log(`\n   Testing PTZ commands...`);
        const result = await testPtzCommand(cam.ipAddress, cam.port, 'up');
        if (result) {
          console.log(`\n   ✓ PTZ working on port ${result.port}`);
        } else {
          console.log(`\n   ✗ No PTZ endpoint found`);
          console.log(`     Try testing manually:`);
          console.log(`     http://${cam.ipAddress}:80/ptzctrl.cgi?cmd=up`);
          console.log(`     http://${cam.ipAddress}:8800/ptzctrl.cgi?cmd=up`);
          console.log(`     http://${cam.ipAddress}:${cam.port}/ptzctrl.cgi?cmd=up`);
        }
      } else {
        console.log(`   ⚠️  PTZ not enabled for this camera`);
      }
      console.log('');
    }

    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
})();
