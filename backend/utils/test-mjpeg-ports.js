const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

/**
 * Test if ports 8089/8899 are MJPEG or other video streaming
 */

const testMJPEGStreams = async () => {
  console.log('\n╔═══════════════════════════════════════════════════╗');
  console.log('║   Testing MJPEG/Video Streaming on Ports       ║');
  console.log('║   8089 and 8899                                 ║');
  console.log('╚═══════════════════════════════════════════════════╝\n');

  const ips = ['192.168.1.2'];
  const ports = [8089, 8899];
  const endpoints = ['', '/stream', '/video', '/mjpeg', '/live'];

  for (const ip of ips) {
    console.log(`\n📍 ${ip}:`);
    
    for (const port of ports) {
      console.log(`\n  Port ${port}:`);
      
      for (const endpoint of endpoints) {
        const url = `http://${ip}:${port}${endpoint}`;
        console.log(`    Testing: ${url}`);
        
        try {
          // Use ffprobe to check if it's a valid stream
          const { stdout, stderr } = await execPromise(
            `ffprobe -v error -select_streams v:0 -show_entries stream=codec_type,codec_name -of default=noprint_wrappers=1:nokey=1:noprint_wrappers=1 "${url}" 2>&1 | head -1`,
            { timeout: 3000 }
          );
          
          if (stdout.trim()) {
            console.log(`      ✓ Valid stream detected! Codec: ${stdout.trim()}`);
          } else {
            // Try to get ffprobe error details
            console.log(`      ? No codec detected`);
          }
        } catch (err) {
          const errStr = err.message || err.stderr || '';
          if (errStr.includes('Connection refused')) {
            // Skip, we know it refuses HTTP
          } else if (errStr.includes('Connection reset')) {
            console.log(`      ⚠ Connection reset`);
          } else if (errStr.includes('Unknown protocol')) {
            console.log(`      ? Unknown protocol`);
          } else {
            // console.log(`      Error: ${errStr.substring(0, 60)}`);
          }
        }
      }
    }
  }

  process.exit(0);
};

testMJPEGStreams();
