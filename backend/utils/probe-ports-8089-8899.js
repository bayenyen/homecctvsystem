require('dotenv').config();
const axios = require('axios');

/**
 * Probe unknown ports for HTTP API
 */

const probeUnknownPorts = async () => {
  console.log('\n╔═══════════════════════════════════════════════════╗');
  console.log('║   Probing Found Ports 8089 & 8899               ║');
  console.log('║   Testing for HTTP Management Interface         ║');
  console.log('╚═══════════════════════════════════════════════════╝\n');

  const ips = ['192.168.1.2', '192.168.1.3', '192.168.1.4'];
  const ports = [8089, 8899];

  for (const ip of ips) {
    console.log(`\n📍 ${ip}:`);
    
    for (const port of ports) {
      console.log(`\n  Port ${port}:`);
      
      // Test basic HTTP
      await testHttp(ip, port);
      
      // Test common paths
      await testCommonPaths(ip, port);
    }
  }

  process.exit(0);
};

const testHttp = async (ip, port) => {
  try {
    const response = await axios.get(`http://${ip}:${port}/`, {
      timeout: 3000,
      validateStatus: () => true,
      maxRedirects: 5
    });

    console.log(`    ✓ HTTP ${response.status}`);
    
    if (response.status === 200) {
      console.log(`    🎉 FOUND ACTIVE WEB INTERFACE!`);
      
      // Try to get more info
      if (response.headers['server']) {
        console.log(`       Server: ${response.headers['server']}`);
      }
      if (response.headers['www-authenticate']) {
        console.log(`       Auth: ${response.headers['www-authenticate']}`);
      }
      
      // Check content
      const content = response.data || '';
      if (content.includes('admin') || content.includes('login') || content.includes('password')) {
        console.log(`       ✓ Contains: Login interface`);
      }
      if (content.includes('ptz') || content.includes('PTZ') || content.includes('pan') || content.includes('tilt')) {
        console.log(`       ✓ Contains: PTZ references`);
      }
    } else if (response.status === 401 || response.status === 403) {
      console.log(`    ⚠ Authentication required (${response.status})`);
      if (response.headers['www-authenticate']) {
        console.log(`       Realm: ${response.headers['www-authenticate']}`);
      }
    }
  } catch (err) {
    if (err.code === 'ECONNREFUSED') {
      console.log(`    ✗ Connection refused`);
    } else if (err.code === 'ECONNRESET') {
      console.log(`    ⚠ Connection reset (might be non-HTTP service)`);
    } else {
      console.log(`    ✗ Error: ${err.message.substring(0, 50)}`);
    }
  }
};

const testCommonPaths = async (ip, port) => {
  const paths = [
    '/api',
    '/api/',
    '/api/v1',
    '/api/v2',
    '/cgi-bin/',
    '/cgi-bin/ptzctrl.cgi',
    '/ptz',
    '/control',
    '/device',
    '/config',
    '/status',
    '/info',
    '/admin',
    '/login',
    '/web',
    '/stream',
    '/rtsp',
    '/onvif',
    '/v1/ptz',
    '/v2/ptz'
  ];

  for (const path of paths) {
    try {
      const response = await axios.get(`http://${ip}:${port}${path}`, {
        timeout: 1000,
        validateStatus: () => true,
        maxRedirects: 0
      });

      if (response.status < 400) {
        console.log(`    ✓ Path found: ${path} (${response.status})`);
      }
    } catch (err) {
      // Silent continue
    }
  }
};

probeUnknownPorts();
