#!/usr/bin/env node
/**
 * Network scanner - finds all active devices on your network
 */

const { execSync } = require('child_process');

console.log('\n' + '='.repeat(70));
console.log('🔍 NETWORK DEVICE SCANNER');
console.log('='.repeat(70));
console.log('\nScanning for all devices on 192.168.1.0/24...\n');

// Use arp -a to find all devices on network
try {
  const result = execSync('arp -a', { encoding: 'utf8' });
  const lines = result.split('\n').filter(l => l.includes('192.168.1'));
  
  console.log('ACTIVE DEVICES ON NETWORK:');
  console.log('-'.repeat(70));
  
  if (lines.length === 0) {
    console.log('No devices found in ARP table');
  } else {
    lines.forEach(line => {
      const match = line.match(/(\d+\.\d+\.\d+\.\d+)\s+([\w\-]+)/);
      if (match) {
        const ip = match[1];
        const mac = line.match(/([0-9a-f\-]+)/i)?.[1] || 'unknown';
        console.log(`  ${ip} - ${mac}`);
      }
    });
  }
  
  console.log('\n' + '='.repeat(70));
  console.log('ALTERNATIVE - Check connected devices:');
  console.log('='.repeat(70));
  console.log(`
Run this command to see DHCP leases (cameras might get IPs from DHCP):
  ipconfig /all
  
Or check your router's admin interface to see all connected devices.
  `);
  
} catch (err) {
  console.log('Error running ARP scan:', err.message);
}
