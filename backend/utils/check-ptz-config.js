require('dotenv').config();
const mongoose = require('mongoose');
const Camera = require('../models/Camera');

const checkCameraConfig = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('\n📊 Checking camera PTZ configuration:\n');

    const cameras = await Camera.find({ ptzSupported: true }).limit(5);
    
    cameras.forEach(cam => {
      console.log(`Camera: ${cam.name}`);
      console.log(`  IP: ${cam.ipAddress}`);
      console.log(`  port (RTSP): ${cam.port}`);
      console.log(`  ptzSupported: ${cam.ptzSupported}`);
      console.log(`  ptzConfig: ${JSON.stringify(cam.ptzConfig, null, 2)}`);
      console.log('');
    });

    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
};

checkCameraConfig();
