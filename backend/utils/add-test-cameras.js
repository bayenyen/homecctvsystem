#!/usr/bin/env node
/**
 * Add test/mock cameras to database for development and testing
 * Usage: node add-test-cameras.js
 */

require('dotenv').config({ path: `${__dirname}/../.env` });
const mongoose = require('mongoose');
const Camera = require('../models/Camera');
const logger = require('../utils/logger');

const testCameras = [
  {
    name: 'Living Room Camera',
    ipAddress: '192.168.1.10',
    port: 554,
    username: 'admin',
    password: 'admin123',
    streamUrl: 'rtsp://admin:admin123@192.168.1.10:554/h264',
    streamType: 'rtsp',
    location: 'Living Room',
    description: 'Main living room camera',
    recordingMode: 'continuous',
    resolution: '1080p',
    fps: 25,
    ptzSupported: true,
    ptzConfig: {
      protocol: 'http',
      controlUrl: 'http://192.168.1.10:80',
      supportedCommands: ['up', 'down', 'left', 'right', 'zoom_in', 'zoom_out', 'preset']
    },
    status: 'online',
    tags: ['main', 'living-room'],
    isActive: true,
    lastSeen: new Date(),
    lastChecked: new Date()
  },
  {
    name: 'Bedroom Camera',
    ipAddress: '192.168.1.14',
    port: 554,
    username: 'admin',
    password: 'admin123',
    streamUrl: 'rtsp://admin:admin123@192.168.1.14:554/h264',
    streamType: 'rtsp',
    location: 'Bedroom',
    description: 'Bedroom camera',
    recordingMode: 'continuous',
    resolution: '720p',
    fps: 20,
    ptzSupported: true,
    ptzConfig: {
      protocol: 'http',
      controlUrl: 'http://192.168.1.14:80'
    },
    status: 'online',
    tags: ['bedroom'],
    isActive: true,
    lastSeen: new Date(),
    lastChecked: new Date()
  },
  {
    name: 'Backyard Camera',
    ipAddress: '192.168.1.15',
    port: 554,
    username: 'admin',
    password: 'admin123',
    streamUrl: 'rtsp://admin:admin123@192.168.1.15:554/stream',
    streamType: 'rtsp',
    location: 'Backyard',
    description: 'Outdoor backyard surveillance',
    recordingMode: 'continuous',
    resolution: '1080p',
    fps: 15,
    ptzSupported: false,
    ptzConfig: {},
    status: 'online',
    tags: ['outdoor', 'backyard'],
    isActive: true,
    lastSeen: new Date(),
    lastChecked: new Date()
  }
];

async function addTestCameras() {
  try {
    const mongoUri = process.env.MONGO_URI;
    if (!mongoUri) {
      console.error('❌ Error: MONGO_URI not set in .env');
      process.exit(1);
    }

    console.log('Connecting to MongoDB...');
    await mongoose.connect(mongoUri);
    console.log('✓ Connected to MongoDB\n');

    // Check for existing test cameras
    const existing = await Camera.find({ name: { $in: testCameras.map(c => c.name) } });
    if (existing.length > 0) {
      console.log(`⚠️  Found ${existing.length} existing test camera(s):`);
      existing.forEach(c => console.log(`   - ${c.name} (${c.ipAddress})`));
      console.log('\nRemoving old test cameras...');
      await Camera.deleteMany({ name: { $in: testCameras.map(c => c.name) } });
      console.log('✓ Removed old test cameras\n');
    }

    console.log(`Adding ${testCameras.length} test cameras...\n`);
    
    for (const camData of testCameras) {
      const camera = await Camera.create(camData);
      console.log(`✓ Added: ${camera.name}`);
      console.log(`  IP: ${camera.ipAddress}:${camera.port}`);
      console.log(`  RTSP: ${camera.streamUrl}`);
      console.log(`  PTZ: ${camera.ptzSupported ? '✓ Enabled' : '✗ Disabled'}`);
      console.log(`  Status: ${camera.status}\n`);
    }

    const count = await Camera.countDocuments({ name: { $in: testCameras.map(c => c.name) } });
    console.log('='.repeat(60));
    console.log(`✅ Successfully added ${count} test cameras!`);
    console.log('='.repeat(60));
    console.log(`
📊 Test Cameras Created:
   - Living Room Camera (192.168.1.10) - PTZ Enabled
   - Bedroom Camera (192.168.1.14) - PTZ Enabled
   - Backyard Camera (192.168.1.15) - No PTZ

🧪 Now you can:
   1. Open http://localhost:5173/cameras to see them
   2. Test PTZ controls on the first two cameras
   3. Verify recording and playback features
   4. Check the dashboard stats

💡 When you power on the real cameras, they'll be added to the same database!
    `);

    await mongoose.disconnect();
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

addTestCameras();
