require('dotenv').config();
const connectDB = require('../config/database');
const Camera = require('../models/Camera');

/**
 * Disable PTZ for all cameras - V380 cameras don't support HTTP PTZ
 */

const disableAllPTZ = async () => {
  try {
    await connectDB();
    
    console.log('\n╔═══════════════════════════════════════════════════╗');
    console.log('║   Disabling PTZ for All Cameras                  ║');
    console.log('║   (V380 cameras don\'t support HTTP PTZ control)  ║');
    console.log('╚═══════════════════════════════════════════════════╝\n');

    const result = await Camera.updateMany(
      { ptzSupported: true },
      {
        ptzSupported: false,
        ptzConfig: { 
          protocol: 'http',
          note: 'PTZ disabled - cameras do not respond to HTTP PTZ commands'
        }
      }
    );

    console.log(`✓ Updated ${result.modifiedCount} cameras`);
    console.log('\n📝 Summary:');
    console.log('  • V380 discovery protocol only finds cameras (UDP port 10008)');
    console.log('  • V380 cameras do NOT support standard HTTP ptzctrl.cgi commands');
    console.log('  • All tested ports (80, 8000, 8080, 8800, etc) returned connection errors');
    console.log('  • PTZ control is not available for these camera models');
    console.log('\n✓ PTZ has been disabled for all cameras');
    console.log('  PTZ API endpoints will now return clear error messages\n');

    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
};

disableAllPTZ();
