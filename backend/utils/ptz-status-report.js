require('dotenv').config();
const connectDB = require('../config/database');
const Camera = require('../models/Camera');

/**
 * PTZ Status Report
 * Shows which cameras have PTZ and why, and allows users to manually configure it
 */

const showPtzStatus = async () => {
  try {
    await connectDB();
    
    console.log('\n╔════════════════════════════════════════╗');
    console.log('║   PTZ Support Status Report            ║');
    console.log('╚════════════════════════════════════════╝\n');

    const cameras = await Camera.find({});
    
    if (cameras.length === 0) {
      console.log('No cameras found in database');
      process.exit(0);
    }

    const withPtz = cameras.filter(c => c.ptzSupported);
    const withoutPtz = cameras.filter(c => !c.ptzSupported);

    console.log(`Total cameras: ${cameras.length}`);
    console.log(`  • With PTZ enabled: ${withPtz.length}`);
    console.log(`  • Without PTZ: ${withoutPtz.length}\n`);

    if (withPtz.length > 0) {
      console.log('📍 Cameras WITH PTZ:');
      withPtz.forEach((cam, i) => {
        console.log(`  ${i + 1}. ${cam.name}`);
        console.log(`     IP: ${cam.ipAddress}:${cam.port}`);
        console.log(`     Protocol: ${cam.ptzConfig?.protocol || 'http'}`);
        console.log(`     Control URL: ${cam.ptzConfig?.controlUrl || '(auto-detected)'}`);
      });
    }

    if (withoutPtz.length > 0) {
      console.log('\n🚫 Cameras WITHOUT PTZ:');
      const discovered = withoutPtz.filter(c => c.name.includes('Discovered'));
      const manual = withoutPtz.filter(c => !c.name.includes('Discovered'));
      
      if (discovered.length > 0) {
        console.log('\n  Discovered V380 cameras:');
        discovered.forEach((cam, i) => {
          console.log(`    ${i + 1}. ${cam.name}`);
          console.log(`       IP: ${cam.ipAddress}:${cam.port}`);
          console.log(`       Note: V380 UDP discovery doesn't indicate PTZ support`);
          console.log(`       To enable PTZ: Manually test the camera and edit to enable`);
        });
      }

      if (manual.length > 0) {
        console.log('\n  Manually added cameras:');
        manual.forEach((cam, i) => {
          console.log(`    ${i + 1}. ${cam.name}`);
          console.log(`       IP: ${cam.ipAddress}:${cam.port}`);
          console.log(`       Note: No PTZ support detected during setup`);
        });
      }
    }

    console.log('\n💡 PTZ Support Status:');
    console.log('  • HTTP PTZ: Camera responds to ptzctrl.cgi requests on ports 80, 8000, 8080, 8800');
    console.log('  • V380 UDP Discovery: Finds cameras but doesn\'t test PTZ capability');
    console.log('  • Manual Configuration: You can enable PTZ for any camera via the API\n');
    
    console.log('📝 To manually enable PTZ for a camera:');
    console.log('  1. Test if camera responds: http://<camera-ip>:<port>/ptzctrl.cgi?cmd=home');
    console.log('  2. If it returns 200-299 status, PTZ is supported');
    console.log('  3. Update camera in database with ptzSupported: true');
    console.log('  4. Set ptzConfig.protocol to "http" and controlUrl if needed\n');

    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
};

showPtzStatus();
