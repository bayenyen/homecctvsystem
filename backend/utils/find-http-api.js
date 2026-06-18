require('dotenv').config();
const net = require('net');
const axios = require('axios');

/**
 * Comprehensive Port Scanner & HTTP API Discovery
 * Scans all ports and probes for HTTP APIs
 */

const discoverHttpApi = async () => {
  console.log('\n╔═══════════════════════════════════════════════════╗');
  console.log('║   Finding V380 HTTP API - Comprehensive Scan     ║');
  console.log('║   Testing all TCP ports for responsiveness       ║');
  console.log('╚═══════════════════════════════════════════════════╝\n');

  const ips = ['192.168.1.2', '192.168.1.3', '192.168.1.4'];
  
  for (const ip of ips) {
    console.log(`\n📍 Scanning ${ip}...`);
    const openPorts = await scanAllPorts(ip);
    
    if (openPorts.length > 0) {
      console.log(`\n✓ Found ${openPorts.length} open port(s): ${openPorts.join(', ')}`);
      
      for (const port of openPorts) {
        console.log(`\n  Probing port ${port}:`);
        await probePort(ip, port);
      }
    } else {
      console.log('  No open ports found');
    }
  }

  console.log('\n\nNext steps:');
  console.log('1. If open ports found: Try accessing http://IP:PORT in browser');
  console.log('2. Check camera documentation for default credentials');
  console.log('3. Look for "API", "Management", or "Control" in web interface');
  console.log('4. Document any found endpoints for PTZ control\n');

  process.exit(0);
};

const scanAllPorts = async (ip) => {
  const ports = [];
  // Common ports used by cameras
  const commonPorts = [
    23,   // Telnet
    80,   // HTTP
    443,  // HTTPS
    554,  // RTSP
    1000, 1001, 1002,
    2000, 2001, 2002, 2020, 2021, 2022,
    3000, 3001, 3128,
    5000, 5001, 5555,
    8000, 8001, 8002, 8003, 8004, 8005,
    8008, 8080, 8081, 8082, 8083, 8084, 8085, 8086, 8087, 8088, 8089,
    8200, 8300, 8400, 8500, 8600, 8700, 8800, 8801, 8802, 8803, 8804, 8805, 8899, 8888,
    9000, 9001, 9080, 9081, 9082, 9083, 9090, 9091, 9200, 9300,
    10000, 10001, 10002, 10008, 10009, 10080, 10443,
    32768, 32769, 32770,
    49152, 49153, 49154, 49155
  ];

  console.log(`  Testing ${commonPorts.length} ports... (this may take 30 seconds)`);
  
  for (const port of commonPorts) {
    const isOpen = await isPortOpen(ip, port);
    if (isOpen) {
      ports.push(port);
      console.log(`    ✓ Port ${port}: OPEN`);
    }
  }

  return ports;
};

const isPortOpen = (ip, port) => {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    const timeout = setTimeout(() => {
      socket.destroy();
      resolve(false);
    }, 500);

    socket.connect(port, ip, () => {
      clearTimeout(timeout);
      socket.destroy();
      resolve(true);
    });

    socket.on('error', () => {
      clearTimeout(timeout);
      resolve(false);
    });
  });
};

const probePort = async (ip, port) => {
  // Try HTTP
  try {
    const response = await axios.get(`http://${ip}:${port}/`, {
      timeout: 2000,
      validateStatus: () => true,
      maxRedirects: 0
    });

    const serverHeader = response.headers['server'] || 'Unknown';
    const title = response.data ? response.data.substring(0, 100) : '';
    
    console.log(`    ✓ HTTP response: ${response.status}`);
    console.log(`    Server: ${serverHeader}`);
    
    if (response.status === 200) {
      console.log(`    🎉 FOUND ACTIVE WEB INTERFACE!`);
      
      // Try to find management/API endpoints
      const commonEndpoints = [
        '/cgi-bin/',
        '/api/',
        '/v1/',
        '/management/',
        '/control/',
        '/device/',
        '/streaming/',
        '/ptz/',
        '/admin/'
      ];
      
      for (const endpoint of commonEndpoints) {
        try {
          const res = await axios.get(`http://${ip}:${port}${endpoint}`, {
            timeout: 1000,
            validateStatus: () => true
          });
          if (res.status < 400) {
            console.log(`      Found: ${endpoint} (${res.status})`);
          }
        } catch (e) {
          // Continue
        }
      }
    }
  } catch (err) {
    // Not HTTP
  }

  // Try HTTPS
  try {
    const response = await axios.get(`https://${ip}:${port}/`, {
      timeout: 2000,
      validateStatus: () => true,
      maxRedirects: 0,
      rejectUnauthorized: false
    });

    console.log(`    ✓ HTTPS response: ${response.status}`);
    console.log(`    🎉 FOUND SECURE WEB INTERFACE!`);
  } catch (err) {
    // Not HTTPS
  }

  // Try Telnet
  if (port === 23) {
    console.log('    ℹ Port 23 is Telnet - try: telnet ' + ip + ' 23');
  }

  // Try SSH
  if (port === 22) {
    console.log('    ℹ Port 22 is SSH - try: ssh root@' + ip);
  }
};

discoverHttpApi();
