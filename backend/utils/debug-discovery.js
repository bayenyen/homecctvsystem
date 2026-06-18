require('dotenv').config();
const connectDB = require('../config/database');
const { discoverCameras } = require('../services/cameraDiscoveryService');
const os = require('os');

(async () => {
  try {
    await connectDB();
    
    // Show network interfaces
    const nets = os.networkInterfaces();
    console.log('\n📡 Network Interfaces:');
    Object.entries(nets).forEach(([name, addresses]) => {
      if (addresses) {
        addresses.forEach((addr) => {
          if (addr.family === 'IPv4') {
            const isLocal = addr.internal || addr.address.startsWith('169.254.');
            console.log(`  ${name}: ${addr.address}${isLocal ? ' (local/loopback)' : ' ✓ ACTIVE'}`);
          }
        });
      }
    });
    
    console.log('\n🔍 Starting camera discovery...\n');
    const start = Date.now();
    const result = await discoverCameras();
    const elapsed = Date.now() - start;
    
    console.log(`\n✓ Discovery completed in ${elapsed}ms`);
    console.log(`\nDISCOVERY RESULT: Found ${result.length} camera(s):\n`);
    
    if (result.length === 0) {
      console.log('No cameras found. This is normal if:');
      console.log('  • No V380 cameras are on your network');
      console.log('  • Cameras are offline or not responding');
      console.log('  • Firewall is blocking discovery ports');
    } else {
      result.forEach((cam, i) => {
        console.log(`${i + 1}. ${cam.ipAddress}:${cam.port} (${cam.source})`);
        console.log(`   URL: ${cam.streamUrl || '<detected>'}`);
        console.log(`   Type: ${cam.streamType}`);
        if (cam.exists) console.log('   ✓ Already in database');
      });
    }
    
    process.exit(0);
  } catch (err) {
    console.error('\n❌ DISCOVERY ERROR:', err.message);
    console.error(err.stack);
    process.exit(1);
  }
})();
