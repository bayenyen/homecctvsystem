const net = require('net');
const http = require('http');

/**
 * Advanced port probing
 * Test for MJPEG, HTTP with various methods, and streaming protocols
 */

const advancedProbe = async () => {
  console.log('\n╔═══════════════════════════════════════════════════╗');
  console.log('║   Advanced Protocol Detection                    ║');
  console.log('║   Testing MJPEG, HTTP, Streaming Protocols       ║');
  console.log('╚═══════════════════════════════════════════════════╝\n');

  const ips = ['192.168.1.2'];
  const ports = [8089, 8899];

  for (const ip of ips) {
    for (const port of ports) {
      console.log(`\n📍 ${ip}:${port}`);
      
      // Test various HTTP methods
      await testHTTPMethods(ip, port);
      
      // Test streaming endpoints
      await testStreamingEndpoints(ip, port);
      
      // Test with raw requests that might trigger a response
      await testRawRequests(ip, port);
    }
  }

  process.exit(0);
};

const testHTTPMethods = async (ip, port) => {
  const methods = ['GET', 'POST', 'OPTIONS', 'HEAD', 'PUT'];
  
  for (const method of methods) {
    const request = `${method} / HTTP/1.1\r\nHost: ${ip}:${port}\r\nConnection: close\r\n\r\n`;
    
    await new Promise((resolve) => {
      const socket = net.createConnection({ host: ip, port, timeout: 1500 });
      let response = Buffer.alloc(0);
      let startTime = Date.now();

      socket.on('connect', () => {
        socket.write(request);
      });

      socket.on('data', (chunk) => {
        response = Buffer.concat([response, chunk]);
      });

      socket.on('error', () => {
        resolve();
      });

      socket.on('close', () => {
        const elapsed = Date.now() - startTime;
        if (response.length > 0) {
          const str = response.toString('utf8', 0, Math.min(200, response.length));
          if (str.includes('HTTP') || str.includes('Content')) {
            console.log(`  ✓ ${method}: Response (${response.length} bytes)`);
            console.log(`     ${str.split('\r\n')[0]}`);
          } else {
            console.log(`  ? ${method}: Got data but not HTTP (${response.length} bytes)`);
          }
        }
        resolve();
      });
    });
  }
};

const testStreamingEndpoints = async (ip, port) => {
  const endpoints = [
    '/video',
    '/stream',
    '/mjpeg',
    '/mjpeg.cgi',
    '/cgi-bin/mjpeg.cgi',
    '/cgi-bin/video.cgi',
    '/live.cgi',
    '/stream.cgi',
    '/axis-cgi/mjpg/video.cgi',
    '/ipcam.cgi',
    '/?action=stream',
  ];

  for (const endpoint of endpoints) {
    const request = `GET ${endpoint} HTTP/1.1\r\nHost: ${ip}:${port}\r\nConnection: close\r\n\r\n`;

    await new Promise((resolve) => {
      const socket = net.createConnection({ host: ip, port, timeout: 1000 });
      let response = Buffer.alloc(0);

      socket.on('connect', () => {
        socket.write(request);
      });

      socket.on('data', (chunk) => {
        response = Buffer.concat([response, chunk]);
      });

      socket.on('close', () => {
        if (response.length > 0 && response.toString('utf8').includes('200') === false && response.toString('utf8').includes('HTTP')) {
          console.log(`  ✓ ${endpoint}: ${response.toString('utf8', 0, 50)}`);
        }
        resolve();
      });

      socket.on('error', () => {
        resolve();
      });
    });
  }
};

const testRawRequests = async (ip, port) => {
  // Test telnet-like connection with carriage returns
  const probes = [
    '\r\n',                                    // Blank line
    'help\r\n',                               // Simple text command
    Buffer.from([0x01, 0x02, 0x03]),         // Binary probe
    'OPTIONS * HTTP/1.1\r\nHost: *\r\n\r\n', // OPTIONS *
  ];

  let index = 0;
  for (const probe of probes) {
    const socket = net.createConnection({ host: ip, port, timeout: 1000 });
    let response = Buffer.alloc(0);
    const probeStr = typeof probe === 'string' ? probe : probe.toString('hex');

    socket.on('connect', () => {
      socket.write(probe);
    });

    socket.on('data', (chunk) => {
      response = Buffer.concat([response, chunk]);
    });

    socket.on('close', () => {
      if (response.length > 0) {
        const str = response.toString('utf8', 0, Math.min(100, response.length));
        console.log(`  Probe ${++index}: Response (${response.length} b) - ${str.replace(/[\r\n]/g, '|')}`);
      }
    });

    socket.on('error', () => {
      // Ignore
    });

    await new Promise(resolve => setTimeout(resolve, 200));
  }
};

advancedProbe();
