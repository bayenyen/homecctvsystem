const mongoose = require('mongoose');
const Camera = require('./models/Camera');
require('dotenv').config();

(async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    const cameras = await Camera.find({ isActive: true }).select('_id name ipAddress port streamUrl status fps resolution streamType').lean();
    console.log('\n📹 CAMERAS IN DATABASE:\n');
    cameras.forEach((cam, idx) => {
      console.log(`Camera ${idx}: ${cam.name}`);
      console.log(`  ID: ${cam._id}`);
      console.log(`  IP: ${cam.ipAddress}:${cam.port}`);
      console.log(`  Stream: ${cam.streamUrl}`);
      console.log(`  Status: ${cam.status}, FPS: ${cam.fps}, Resolution: ${cam.resolution}`);
      console.log('');
    });
    process.exit(0);
  } catch (e) {
    console.error('Error:', e.message);
    process.exit(1);
  }
})();
