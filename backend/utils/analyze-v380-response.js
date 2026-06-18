require('dotenv').config();
const dgram = require('dgram');

/**
 * Analyze V380 UDP Discovery Response
 * Extract any management URLs from device info
 */

const analyzeV380Discovery = async () => {
  console.log('\n╔═══════════════════════════════════════════════════╗');
  console.log('║   Analyzing V380 UDP Discovery Responses          ║');
  console.log('║   Looking for management URLs/protocols           ║');
  console.log('╚═══════════════════════════════════════════════════╝\n');

  const client = dgram.createSocket('udp4');
  const results = {};

  client.on('message', (msg, rinfo) => {
    const response = msg.toString('utf8');
    console.log(`\n📨 Response from ${rinfo.address}:${rinfo.port}:`);
    console.log(`   Length: ${msg.length} bytes`);
    console.log(`   Raw: ${response.substring(0, 200)}`);
    
    // Parse response
    const lines = response.split('\n');
    lines.forEach((line, i) => {
      if (line.trim()) {
        console.log(`   Line ${i}: ${line.substring(0, 100)}`);
      }
    });

    // Look for URLs
    const urlPattern = /(https?:\/\/[^\s]+)/g;
    const urls = response.match(urlPattern);
    if (urls) {
      console.log(`\n   Found URLs: ${urls.join(', ')}`);
    }

    // Look for ports
    const portPattern = /(:(\d{2,5}))/g;
    const ports = response.match(portPattern);
    if (ports) {
      const uniquePorts = [...new Set(ports)];
      console.log(`   Found ports: ${uniquePorts.join(', ')}`);
    }

    // Look for service names
    if (response.includes('onvif')) console.log('   ✓ Contains: ONVIF');
    if (response.includes('rtsp')) console.log('   ✓ Contains: RTSP');
    if (response.includes('http')) console.log('   ✓ Contains: HTTP');
    if (response.includes('upnp')) console.log('   ✓ Contains: UPnP');
    if (response.includes('ptz')) console.log('   ✓ Contains: PTZ');
    if (response.includes('telnet')) console.log('   ✓ Contains: Telnet');
    if (response.includes('ssh')) console.log('   ✓ Contains: SSH');
  });

  client.on('error', (err) => {
    console.error('Error:', err.message);
  });

  // Set timeout for all responses
  setTimeout(() => {
    client.close();
    process.exit(0);
  }, 10000);

  try {
    client.bind(10009, () => {
      console.log('Listening for V380 discovery responses...\n');
      
      const message = Buffer.from('NVDEVSEARCH^100', 'utf8');
      const broadcastAddrs = [
        '255.255.255.255',
        '192.168.1.255',
        '192.168.255.255',
        '10.0.0.255',
        '172.16.0.255'
      ];

      broadcastAddrs.forEach(addr => {
        try {
          client.send(message, 0, message.length, 10008, addr, (err) => {
            if (err) {
              console.log(`  Sent to ${addr} (may have failed)`);
            } else {
              console.log(`  ✓ Sent discovery to ${addr}`);
            }
          });
        } catch (err) {
          // Continue
        }
      });
    });
  } catch (err) {
    console.error('Bind error:', err.message);
    process.exit(1);
  }
};

analyzeV380Discovery();
