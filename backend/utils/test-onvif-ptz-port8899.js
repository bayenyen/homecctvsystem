const axios = require('axios');

/**
 * Test ONVIF PTZ endpoint on port 8899
 * Based on V380_Python GitHub documentation
 */

const testONVIFPTZ = async () => {
  console.log('\n╔═══════════════════════════════════════════════════╗');
  console.log('║   Testing ONVIF PTZ on Port 8899                ║');
  console.log('║   Endpoint: http://IP:8899/onvif/ptz           ║');
  console.log('╚═══════════════════════════════════════════════════╝\n');

  const ips = ['192.168.1.2', '192.168.1.3', '192.168.1.4'];

  for (const ip of ips) {
    console.log(`\n📍 ${ip}:8899/onvif/ptz`);
    
    try {
      const url = `http://${ip}:8899/onvif/ptz`;
      
      // Try simple OPTIONS request
      const response = await axios({
        method: 'OPTIONS',
        url,
        timeout: 3000,
        validateStatus: () => true
      });

      console.log(`  ✓ Response: ${response.status}`);
      
      if (response.headers['server']) {
        console.log(`    Server: ${response.headers['server']}`);
      }
      if (response.headers['allow']) {
        console.log(`    Allow: ${response.headers['allow']}`);
      }
      
      // Try GET request
      const getResp = await axios.get(url, {
        timeout: 3000,
        validateStatus: () => true
      });

      if (getResp.status < 400) {
        console.log(`  ✓ GET response: ${getResp.status}`);
        
        if (getResp.data && typeof getResp.data === 'string') {
          const preview = getResp.data.substring(0, 200);
          if (preview.includes('xml') || preview.includes('soap')) {
            console.log(`  ✓ Response contains SOAP/XML!`);
            console.log(`    ${preview.substring(0, 100)}`);
          }
        }
      }
      
    } catch (err) {
      console.log(`  ✗ Error: ${err.code || err.message}`);
    }
  }

  process.exit(0);
};

testONVIFPTZ();
