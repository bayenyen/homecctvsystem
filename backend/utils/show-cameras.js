#!/usr/bin/env node
/**
 * Camera Diagnostic Utility
 * Shows all cameras and their properties
 */

const mongoose = require('mongoose');
require('dotenv').config({ path: '../.env' });

const Camera = require('../models/Camera');
const { connectDb } = require('../config/database');

async function showCameras() {
  try {
    await connectDb();
    console.log('📹 All Cameras in Database:\n');

    const cameras = await Camera.find({}).select('+password');
    
    if (cameras.length === 0) {
      console.log('❌ No cameras found. Run discovery first.');
      process.exit(1);
    }

    cameras.forEach((camera, idx) => {
      console.log(`${idx + 1}. ${camera.name}`);
      console.log(`   ID: ${camera._id}`);
      console.log(`   IP: ${camera.ipAddress}:${camera.port || 554}`);
      console.log(`   Status: ${camera.status}`);
      console.log(`   RTSP URL: ${camera.streamUrl}`);
      console.log(`   Recording: ${camera.isRecording ? '🟢 Yes' : '🔴 No'}`);
      console.log(`   PTZ Supported: ${camera.ptzSupported ? '✓ Yes' : '✗ No'}`);
      console.log(`   Username: ${camera.username || 'none'}`);
      console.log(`   Password: ${camera.password ? '***' : 'none'}`);
      console.log('');
    });

    console.log(`\nTotal: ${cameras.length} cameras`);
    console.log(`With PTZ: ${cameras.filter(c => c.ptzSupported).length}`);
    console.log(`Recording: ${cameras.filter(c => c.isRecording).length}`);
    console.log(`Online: ${cameras.filter(c => c.status === 'online').length}`);

  } catch (err) {
    console.error('❌ Error:', err.message);
  } finally {
    await mongoose.disconnect();
  }
}

showCameras();
