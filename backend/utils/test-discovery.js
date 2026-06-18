#!/usr/bin/env node
/**
 * Discovery Test Script
 * Tests camera discovery in detail
 */

const mongoose = require('mongoose');
require('dotenv').config();
const { discoverCameras } = require('../services/cameraDiscoveryService');
const connectDB = require('../config/database');

async function testDiscovery() {
  console.log('🔍 Starting camera discovery...\n');
  
  try {
    // Connect to MongoDB
    await connectDB();
    console.log('✓ Connected to database\n');
    
    const start = Date.now();
    const discovered = await discoverCameras();
    const elapsed = Date.now() - start;
    
    console.log(`\n✓ Discovery completed in ${elapsed}ms\n`);
    console.log(`Found ${discovered.length} camera(s):\n`);
    
    if (discovered.length === 0) {
      console.log('❌ No cameras found. Possible causes:');
      console.log('  1. No V380 cameras on the network');
      console.log('  2. Firewall blocking discovery ports (1900, 10008)');
      console.log('  3. Network interface detection failed');
      console.log('  4. FFmpeg not installed or ffprobe unavailable\n');
      console.log('Try:');
      console.log('  - Check network connectivity');
      console.log('  - Verify FFmpeg is installed: ffmpeg -version');
      console.log('  - Run ipconfig to check your network');
      console.log('  - Look for "Network Discovery" in Windows settings');
    } else {
      discovered.forEach((camera, idx) => {
        console.log(`${idx + 1}. ${camera.ipAddress}:${camera.port}`);
        console.log(`   URL: ${camera.streamUrl}`);
        console.log(`   Type: ${camera.streamType}`);
        console.log(`   Path: ${camera.streamPath}`);
        console.log(`   Source: ${camera.source || 'unknown'}`);
        console.log(`   PTZ: ${camera.ptzSupported ? '✓ Yes' : '✗ No'}`);
        console.log(`   Exists: ${camera.exists ? '✓ In DB' : '✗ New'}`);
        console.log('');
      });
    }
    
    process.exit(discovered.length > 0 ? 0 : 1);
  } catch (error) {
    console.error('❌ Discovery error:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
}

testDiscovery();
