const net = require('net');
const dgram = require('dgram');

/**
 * Send raw V380 protocol packets to ports 8089 and 8899
 * to probe what protocol is running
 */

const probeRawProtocol = async () => {
  console.log('\n╔═══════════════════════════════════════════════════╗');
  console.log('║   Raw Protocol Probe - Ports 8089 & 8899         ║');
  console.log('║   Testing V380 packet formats                    ║');
  console.log('╚═══════════════════════════════════════════════════╝\n');

  const ips = ['192.168.1.2', '192.168.1.3', '192.168.1.4'];
  const ports = [8089, 8899];

  for (const ip of ips) {
    console.log(`\n📍 ${ip}:`);
    
    for (const port of ports) {
      console.log(`\n  Port ${port}:`);
      
      // Test 1: Send NVDEVSEARCH^100 (UDP discovery packet format via TCP)
      await sendRawTCP(ip, port, Buffer.from('NVDEVSEARCH^100'));
      
      // Test 2: Send empty probe and capture response
      await sendRawTCP(ip, port, Buffer.alloc(0), true);
      
      // Test 3: Send bytes that might trigger a response
      await sendRawTCP(ip, port, Buffer.from([0x00, 0x00, 0x00, 0x01]));
    }
  }

  process.exit(0);
};

const sendRawTCP = (ip, port, data, captureResponse = false) => {
  return new Promise((resolve) => {
    const socket = net.createConnection({ host: ip, port, timeout: 2000 });
    let receivedData = Buffer.alloc(0);
    let connected = false;

    socket.on('connect', () => {
      connected = true;
      console.log(`    ✓ Connected`);
      
      if (data.length > 0) {
        console.log(`      Sent: ${data.toString('utf8', 0, Math.min(50, data.length)).replace(/[\x00-\x1f]/g, '.')}`);
        socket.write(data);
      } else if (captureResponse) {
        console.log(`      Waiting for response...`);
      }
      
      // Wait a bit for response
      if (captureResponse) {
        setTimeout(() => {
          socket.destroy();
        }, 500);
      } else {
        socket.destroy();
      }
    });

    socket.on('data', (chunk) => {
      receivedData = Buffer.concat([receivedData, chunk]);
      console.log(`      📬 Received ${chunk.length} bytes`);
      
      // Try to interpret response
      const str = chunk.toString('utf8', 0, Math.min(100, chunk.length));
      if (str.includes('NVDEV') || str.includes('^')) {
        console.log(`      ✓ V380 Protocol! Response: ${str.substring(0, 80)}`);
      } else if (chunk.length > 0) {
        // Show hex if not readable
        const hex = chunk.toString('hex', 0, Math.min(32, chunk.length));
        console.log(`      Hex: ${hex}`);
      }
    });

    socket.on('error', (err) => {
      if (err.code === 'ECONNREFUSED') {
        console.log(`    ✗ Connection refused`);
      } else if (err.code === 'ECONNRESET') {
        console.log(`    ⚠ Connection reset`);
      } else if (err.code === 'ETIMEDOUT') {
        console.log(`    ✗ Timeout`);
      } else {
        console.log(`    ✗ Error: ${err.code}`);
      }
      resolve();
    });

    socket.on('close', () => {
      resolve();
    });
  });
};

probeRawProtocol();
