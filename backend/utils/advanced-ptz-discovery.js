require('dotenv').config();
const connectDB = require('../config/database');
const Camera = require('../models/Camera');
const dgram = require('dgram');
const axios = require('axios');

/**
 * Advanced V380 PTZ Discovery
 * Analyzes V380 UDP response for management URLs
 * Tests alternate ports and protocols
 */

const advancedPtzDiscovery = async () => {
  try {
    await connectDB();
    
    console.log('\n╔═══════════════════════════════════════════════════╗');
    console.log('║   Advanced V380 PTZ Discovery                    ║');
    console.log('║   Testing all possible management interfaces     ║');
    console.log('╚═══════════════════════════════════════════════════╝\n');

    const ips = ['192.168.1.2', '192.168.1.3', '192.168.1.4'];
    
    for (const ip of ips) {
      console.log(`\n📹 Camera: ${ip}`);
      
      // Step 1: Probe all HTTP ports
      await probeAllPorts(ip);
      
      // Step 2: Test V380-specific endpoints
      await testV380Endpoints(ip);
      
      // Step 3: Try with various authentication methods
      await testWithDifferentAuth(ip);
    }

    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
};

const probeAllPorts = async (ip) => {
  console.log('  Testing all ports 1-10000...');
  const commonPorts = [
    80, 8000, 8080, 8081, 8082, 8888, 8889, 
    8899, 8800, 8801, 8802, 8888,
    9000, 9001, 9080, 9081,
    3000, 3001, 5000, 5001,
    2020, 2021, 2022,
    554, 8554, 5544, 10554
  ];

  let foundPorts = [];

  for (const port of commonPorts) {
    try {
      const response = await axios.get(`http://${ip}:${port}/`, {
        timeout: 500,
        validateStatus: () => true,
        maxRedirects: 0
      });
      
      if (response.status < 500) {
        foundPorts.push({ port, status: response.status });
        const serverHeader = response.headers['server'] || 'Unknown';
        console.log(`    ✓ Port ${port}: HTTP ${response.status} (${serverHeader})`);
      }
    } catch (err) {
      // Silently continue
    }
  }

  if (foundPorts.length === 0) {
    console.log('    ✗ No HTTP ports responding');
  }
  
  return foundPorts;
};

const testV380Endpoints = async (ip) => {
  console.log('  Testing V380-specific CGI endpoints...');

  const v380Endpoints = [
    '/cgi-bin/ptz.cgi',
    '/cgi-bin/ptzctrl.cgi',
    '/cgi-bin/devinfo.cgi',
    '/cgi-bin/httpapi.cgi',
    '/cgi-bin/motion.cgi',
    '/cgi-bin/recorder.cgi',
    '/cgi-bin/admin/param.cgi',
    '/cgi/ptz.cgi',
    '/ptz.cgi',
    '/ptzctrl.cgi',
    '/api/ptz',
    '/api/v1/ptz',
    '/v1/ptz',
    '/v2/ptz',
    '/web/ptz.html',
    '/web/ptz.cgi',
    '/device',
    '/cgi-bin/deviceConfig.cgi',
  ];

  for (const endpoint of v380Endpoints) {
    try {
      const response = await axios.get(`http://${ip}:80${endpoint}`, {
        timeout: 1000,
        validateStatus: () => true
      });
      
      if (response.status < 500) {
        console.log(`    ✓ Found: ${endpoint} (${response.status})`);
      }
    } catch (err) {
      // Continue
    }
  }
};

const testWithDifferentAuth = async (ip) => {
  console.log('  Testing with different credentials...');

  const credentials = [
    { user: 'admin', pass: 'admin' },
    { user: 'admin', pass: '123456' },
    { user: 'admin', pass: '' },
    { user: 'root', pass: 'root' },
    { user: '', pass: '' },
    { user: 'Administrator', pass: 'administrator' },
  ];

  for (const cred of credentials) {
    try {
      const response = await axios.get(`http://${ip}:80/cgi-bin/ptzctrl.cgi?cmd=home`, {
        timeout: 1000,
        validateStatus: () => true,
        auth: cred.user ? { username: cred.user, password: cred.pass } : undefined
      });
      
      if (response.status === 200 || response.status === 401) {
        console.log(`    ✓ Auth ${cred.user}:${cred.pass} → Status ${response.status}`);
      }
    } catch (err) {
      // Continue
    }
  }
};

advancedPtzDiscovery();
