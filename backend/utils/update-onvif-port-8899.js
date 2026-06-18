require('dotenv').config();
const mongoose = require('mongoose');
const Camera = require('../models/Camera');

/**
 * Update all ONVIF cameras to use port 8899
 */

const updateONVIFPort = async () => {
  console.log('\n╔═══════════════════════════════════════════════════╗');
  console.log('║   Updating ONVIF Port Configuration           ║');
  console.log('║   Setting all ONVIF cameras to port 8899      ║');
  console.log('╚═══════════════════════════════════════════════════╝\n');

  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✓ Connected to MongoDB\n');

    // Update all ONVIF cameras
    const result = await Camera.updateMany(
      { 'ptzConfig.protocol': 'onvif', ptzSupported: true },
      { 
        $set: { 
          'ptzConfig.port': 8899,
          'ptzConfig.protocol': 'onvif'
        }
      }
    );

    console.log(`Updated ${result.modifiedCount} cameras with ONVIF protocol`);
    console.log(`Matched: ${result.matchedCount} cameras\n`);

    // Show updated cameras
    const cameras = await Camera.find({ ptzSupported: true });
    console.log('Updated cameras:\n');
    cameras.forEach(cam => {
      console.log(`  ${cam.name} (${cam.ipAddress})`);
      console.log(`    Protocol: ${cam.ptzConfig?.protocol || 'http'}`);
      console.log(`    Port: ${cam.ptzConfig?.port || 'not set'}`);
    });

    console.log('\n✓ Configuration updated successfully');
    process.exit(0);

  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
};

updateONVIFPort();
