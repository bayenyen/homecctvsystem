require('dotenv').config();
const connectDB = require('../config/database');
const Camera = require('../models/Camera');

/**
 * Configure ONVIF PTZ for V380 cameras
 * V380 cameras support ONVIF PTZ protocol (not HTTP)
 */

const enableONVIFPtz = async () => {
  try {
    await connectDB();
    
    console.log('\n╔═══════════════════════════════════════════════════╗');
    console.log('║   Enable ONVIF PTZ for V380 Cameras               ║');
    console.log('╚═══════════════════════════════════════════════════╝\n');

    // Update all 3 main cameras to use ONVIF protocol and enable PTZ
    const mainCameras = [
      { ipAddress: '192.168.1.2', name: 'Living Room' },
      { ipAddress: '192.168.1.3', name: 'BackYard' },
      { ipAddress: '192.168.1.4', name: 'Entrance Camera' }
    ];

    console.log('Configuring ONVIF PTZ for main cameras:\n');

    for (const camInfo of mainCameras) {
      const result = await Camera.updateMany(
        { ipAddress: camInfo.ipAddress, ptzSupported: false },
        {
          ptzSupported: true,
          $set: {
            'ptzConfig.protocol': 'onvif',
            'ptzConfig.note': 'ONVIF PTZ enabled - V380 standard protocol'
          }
        }
      );

      if (result.modifiedCount > 0) {
        console.log(`✓ Updated ${result.modifiedCount} camera(s) at ${camInfo.ipAddress}`);
      }
    }

    // Also enable for the camera with ONVIF in name
    const onvifCamera = await Camera.findOne({ name: '122515864' });
    if (onvifCamera && !onvifCamera.ptzSupported) {
      await Camera.findByIdAndUpdate(onvifCamera._id, {
        ptzSupported: true,
        'ptzConfig.protocol': 'onvif'
      });
      console.log(`✓ Enabled PTZ for 122515864 (ONVIF)`);
    }

    // Show final status
    console.log('\n✓ ONVIF PTZ Configuration Complete!\n');
    
    const cameras = await Camera.find({
      ipAddress: { $in: ['192.168.1.2', '192.168.1.3', '192.168.1.4'] }
    });

    console.log('Camera PTZ Status:');
    cameras.forEach((cam, i) => {
      console.log(`  ${i + 1}. ${cam.name}`);
      console.log(`     IP: ${cam.ipAddress}:${cam.port}`);
      console.log(`     PTZ: ${cam.ptzSupported ? '✓ Enabled' : '✗ Disabled'}`);
      console.log(`     Protocol: ${cam.ptzConfig?.protocol || 'http'}`);
    });

    console.log('\n📝 PTZ Protocol Information:');
    console.log('  • ONVIF (Open Network Video Interface Format)');
    console.log('  • Standard protocol for IP cameras');
    console.log('  • Used for pan/tilt/zoom control via SOAP messages');
    console.log('  • Default ONVIF service path: /onvif/device_service');
    console.log('  • Your V380 cameras support ONVIF on port 80\n');

    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
};

enableONVIFPtz();
