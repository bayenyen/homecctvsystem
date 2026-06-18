require('dotenv').config();
const connectDB = require('../config/database');
const Camera = require('../models/Camera');
const { findRtspForHost } = require('../services/cameraDiscoveryService');

const run = async () => {
  try {
    await connectDB();
    const cams = await Camera.find({}).select('+password').lean();
    if (!cams || cams.length === 0) {
      console.log('No cameras in DB');
      process.exit(0);
    }

    for (const c of cams) {
      console.log('---');
      console.log(`id: ${c._id}`);
      console.log(`name: ${c.name}`);
      console.log(`ip: ${c.ipAddress}:${c.port}`);
      console.log(`isActive: ${c.isActive} | status: ${c.status} | isRecording: ${c.isRecording}`);
      console.log(`streamUrl: ${c.streamUrl || '<none>'}`);
      console.log(`username: ${c.username || ''} | password: ${c.password ? '***' : '<none>'}`);
      console.log(`lastSeen: ${c.lastSeen}`);

      process.stdout.write('Probing for RTSP (all ports)... ');
      try {
        const url = await findRtspForHost(c.ipAddress, c.port);
        console.log(url ? `found: ${url}` : 'not found');
      } catch (err) {
        console.log('probe error:', err.message || err);
      }
    }

    process.exit(0);
  } catch (err) {
    console.error('Debug check error:', err.message || err);
    process.exit(1);
  }
};

run();
