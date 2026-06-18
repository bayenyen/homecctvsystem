require('dotenv').config();
const connectDB = require('../config/database');
const Camera = require('../models/Camera');

/**
 * Fix PTZ configuration for V380 discovered cameras
 * V380 UDP discovery protocol doesn't mean cameras support HTTP PTZ
 */

const fixPtzConfig = async () => {
  try {
    await connectDB();
    
    console.log('\n╔════════════════════════════════════════╗');
    console.log('║   Fix V380 Camera PTZ Configuration    ║');
    console.log('╚════════════════════════════════════════╝\n');

    // Find all discovered V380 cameras (port 8800 or name includes "Discovered")
    const v380Cameras = await Camera.find({
      $or: [
        { port: 8800 },
        { name: { $regex: 'Discovered', $options: 'i' } }
      ]
    });

    if (v380Cameras.length === 0) {
      console.log('No V380 discovered cameras found.');
      process.exit(0);
    }

    console.log(`Found ${v380Cameras.length} V380 discovered camera(s)\n`);
    console.log('⚠️  V380 UDP discovery does NOT indicate HTTP PTZ support');
    console.log('    These cameras respond to NVDEVSEARCH^100 discovery protocol');
    console.log('    But may not support standard HTTP ptzctrl.cgi commands\n');

    let updated = 0;
    for (const cam of v380Cameras) {
      if (cam.ptzSupported) {
        console.log(`Disabling PTZ for: ${cam.name} (${cam.ipAddress}:${cam.port})`);
        await Camera.findByIdAndUpdate(cam._id, {
          ptzSupported: false,
          ptzConfig: { protocol: 'http' } // Reset to default
        });
        updated++;
      }
    }

    console.log(`\n✓ Updated ${updated} camera(s)`);
    console.log(`\n💡 Next Steps:`);
    console.log(`  1. Test camera PTZ manually:`);
    console.log(`     http://<camera-ip>:80/ptzctrl.cgi?cmd=home`);
    console.log(`  2. If it responds with 200-299, enable PTZ via API`);
    console.log(`  3. Otherwise, this camera does not support HTTP PTZ\n`);

    // Show all V380 cameras for reference
    console.log('V380 Discovered Cameras:');
    const updated_cameras = await Camera.find({
      $or: [
        { port: 8800 },
        { name: { $regex: 'Discovered', $options: 'i' } }
      ]
    });
    
    updated_cameras.forEach((cam, i) => {
      console.log(`  ${i + 1}. ${cam.name}`);
      console.log(`     IP: ${cam.ipAddress}:${cam.port}`);
      console.log(`     RTSP: ${cam.streamUrl}`);
      console.log(`     PTZ: ${cam.ptzSupported ? '✓ Enabled' : '✗ Disabled'}`);
    });

    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
};

fixPtzConfig();
