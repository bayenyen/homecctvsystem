const { Cam } = require('onvif');

/**
 * Test ONVIF connection on port 8899 using onvif library
 */

const testONVIFLibrary = async () => {
  console.log('\n╔═══════════════════════════════════════════════════╗');
  console.log('║   Testing ONVIF Library on Port 8899            ║');
  console.log('║   Using onvif npm package                       ║');
  console.log('╚═══════════════════════════════════════════════════╝\n');

  const ips = ['192.168.1.2', '192.168.1.3', '192.168.1.4'];

  for (const ip of ips) {
    console.log(`\n📍 ${ip}:8899`);
    
    await new Promise((resolve) => {
      // Try connecting to port 8899
      const cam = new Cam({
        hostname: ip,
        port: 8899,
        username: 'admin',
        password: 'admin',
        timeout: 5000
      }, (err) => {
        if (err) {
          console.log(`  ✗ Connection failed: ${err.message}`);
        } else {
          console.log(`  ✓ Connected successfully!`);
          console.log(`    Device: ${cam.hostname}`);
          console.log(`    Port: ${cam.port}`);
          
          // Try to get device info
          if (cam.getDeviceInformation) {
            cam.getDeviceInformation((err, info) => {
              if (!err) {
                console.log(`    ✓ Device Info retrieved`);
              }
              resolve();
            });
          } else {
            console.log(`    Available services: ${Object.keys(cam).slice(0, 5).join(', ')}`);
            resolve();
          }
        }
      });

      setTimeout(() => resolve(), 6000);
    });
  }

  process.exit(0);
};

testONVIFLibrary();
