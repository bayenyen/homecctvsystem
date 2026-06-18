#!/usr/bin/env node
/**
 * Comprehensive network diagnostics for camera discovery
 * Checks network connectivity, ARP, and port scanning
 */

const { execSync, exec } = require('child_process');
const net = require('net');
const os = require('os');

function runCommand(cmd) {
  try {
    return execSync(cmd, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }).trim();
  } catch (err) {
    return null;
  }
}

function canConnect(host, port, timeout = 2000) {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    let done = false;

    const finish = (result) => {
      if (done) return;
      done = true;
      socket.destroy();
      resolve(result);
    };

    socket.setTimeout(timeout);
    socket.once('connect', () => finish(true));
    socket.once('timeout', () => finish(false));
    socket.once('error', () => finish(false));
    socket.connect(port, host);
  });
}

async function main() {
  console.log('\n' + '='.repeat(70));
  console.log('🔍 NETWORK DIAGNOSTICS FOR CAMERA DISCOVERY');
  console.log('='.repeat(70));

  // Get local network info
  console.log('\n📡 LOCAL NETWORK CONFIGURATION:');
  const interfaces = os.networkInterfaces();
  Object.entries(interfaces).forEach(([name, addrs]) => {
    const ipv4 = addrs.find(a => a.family === 'IPv4' && !a.internal);
    if (ipv4) {
      console.log(`  ${name}: ${ipv4.address} (${ipv4.netmask})`);
    }
  });

  // Check gateway
  const gateway = runCommand('ipconfig | findstr /I "Default Gateway" | findstr /V "^$"');
  if (gateway) {
    console.log(`\n  Gateway: ${gateway}`);
  }

  // Test specific IPs
  const testIps = ['192.168.1.100', '192.168.1.3', '192.168.1.2', '192.168.1.4'];
  
  console.log('\n🎯 TESTING CAMERA IP ADDRESSES:');
  console.log('-'.repeat(70));

  for (const ip of testIps) {
    console.log(`\n${ip}:`);

    // Try ping
    console.log('  Ping test...');
    const pingResult = runCommand(`ping -n 1 -w 1000 ${ip}`);
    if (pingResult && pingResult.includes('Reply from')) {
      console.log(`    ✓ PING SUCCESSFUL - Camera is reachable`);
    } else if (pingResult && pingResult.includes('timeout')) {
      console.log(`    ⚠ PING TIMEOUT - Camera may be blocking ICMP`);
    } else {
      console.log(`    ✗ PING FAILED - Camera is not on network or offline`);
    }

    // Try ARP
    console.log('  ARP lookup...');
    const arpResult = runCommand(`arp -a | findstr "${ip}"`);
    if (arpResult) {
      console.log(`    ✓ ARP FOUND - MAC: ${arpResult}`);
    } else {
      console.log(`    ✗ ARP NOT FOUND - IP not in ARP table`);
    }

    // Check specific ports
    const commonPorts = [554, 8554, 8800, 80, 8080, 8000];
    console.log(`  Port scan...`);
    let openPorts = [];
    for (const port of commonPorts) {
      if (await canConnect(ip, port, 2000)) {
        openPorts.push(port);
      }
    }

    if (openPorts.length > 0) {
      console.log(`    ✓ OPEN PORTS: ${openPorts.join(', ')}`);
    } else {
      console.log(`    ✗ NO OPEN PORTS on [${commonPorts.join(', ')}]`);
    }

    // Try netstat for established connections
    const netstatResult = runCommand(`netstat -an | findstr "${ip}"`);
    if (netstatResult) {
      console.log(`    📊 Active connections: ${netstatResult}`);
    }
  }

  console.log('\n' + '='.repeat(70));
  console.log('💡 TROUBLESHOOTING RECOMMENDATIONS:');
  console.log('='.repeat(70));
  console.log(`
1. Verify cameras are powered ON and connected to the network
2. Check router/DHCP to see if camera IPs are actually assigned
3. Verify firewall isn't blocking access to camera ports
4. Cameras might be on different network (check subnet mask)
5. Try scanning full subnet: ipconfig /all
6. Use network scanner to find actual camera IPs

NEXT STEPS:
- Run: ipconfig /all (to see your actual network)
- Run: arp -a (to see all devices on network)
- Verify camera IP addresses with your camera/router
  `);

  console.log('='.repeat(70) + '\n');
}

main().catch(console.error);
