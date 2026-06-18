require('dotenv').config();
const connectDB = require('../config/database');
const Camera = require('../models/Camera');
const recordingService = require('../services/recordingService');
const logger = require('../utils/logger');

const run = async () => {
  try {
    await connectDB();

    const toReactivate = await Camera.find({ $or: [{ isActive: false }, { status: 'disabled' }] }).select('+password');
    if (!toReactivate.length) {
      console.log('No disabled cameras to reactivate');
      process.exit(0);
    }

    console.log(`Reactivating ${toReactivate.length} cameras...`);

    for (const cam of toReactivate) {
      cam.isActive = true;
      cam.status = 'unknown';
      await cam.save();
      console.log(`Reactivated ${cam.name} (${cam.ipAddress}) - checking online...`);

      try {
        const online = await recordingService.checkCameraOnline(cam);
        cam.status = online ? 'online' : 'offline';
        cam.lastChecked = new Date();
        await cam.save();
        console.log(` -> ${cam.ipAddress} is ${cam.status}`);
      } catch (err) {
        logger.error('Error checking camera online:', err.message || err);
        console.log(` -> check error for ${cam.ipAddress}`);
      }
    }

    console.log('Done.');
    process.exit(0);
  } catch (err) {
    console.error('Reactivate error:', err.message || err);
    process.exit(1);
  }
};

run();
