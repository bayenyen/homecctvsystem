#!/usr/bin/env node
/**
 * PTZ Test Utility
 * Tests PTZ commands against a specific camera
 */

const axios = require('axios');
const mongoose = require('mongoose');
require('dotenv').config({ path: '../.env' });

const Camera = require('../models/Camera');
const { connectDb } = require('../config/database');

const BASE_URL = 'http://localhost:5000/api';

async function testPTZ() {
  try {
    // Connect to database
    await connectDb();
    console.log('✓ Connected to database');

    // Get first camera with PTZ support
    const camera = await Camera.findOne({ ptzSupported: true, isActive: true }).select('+password');
    
    if (!camera) {
      console.error('✗ No active camera with PTZ support found');
      console.log('\nTo enable PTZ:');
      console.log('1. Update a camera: db.cameras.updateOne({_id: ObjectId("...")}, {$set: {ptzSupported: true}})');
      console.log('2. Or add a camera with detectPTZ: true');
      process.exit(1);
    }

    console.log(`✓ Found camera: ${camera.name} (${camera.ipAddress}:${camera.port})`);
    console.log(`  - PTZ Supported: ${camera.ptzSupported}`);
    console.log(`  - Has Username: ${!!camera.username}`);
    console.log(`  - Has Password: ${!!camera.password}`);

    // Test API endpoint with sample JWT token (needs valid token from actual login)
    const token = process.env.JWT_SECRET ? 'demo-token' : null;
    
    console.log('\nTesting PTZ API endpoints:');
    const commands = ['home', 'up', 'down', 'left', 'right', 'zoom_in', 'zoom_out'];

    for (const cmd of commands) {
      try {
        const response = await axios.post(
          `${BASE_URL}/ptz/${camera._id}/command`,
          { command: cmd, speed: 5 },
          {
            headers: token ? { Authorization: `Bearer ${token}` } : {},
            timeout: 5000
          }
        );
        
        const status = response.data.success ? '✓' : '✗';
        console.log(`${status} ${cmd}: ${response.data.message}`);
      } catch (err) {
        const msg = err.response?.data?.message || err.message;
        console.log(`✗ ${cmd}: ${msg}`);
      }
    }

    console.log('\nDirect HTTP PTZ Test:');
    // Test direct HTTP connection to camera
    const camUrl = `http://${camera.ipAddress}:${camera.port || 80}`;
    console.log(`  Testing: ${camUrl}/ptzctrl.cgi?cmd=home`);
    
    try {
      const response = await axios.get(`${camUrl}/ptzctrl.cgi?cmd=home`, {
        auth: camera.username ? { username: camera.username, password: camera.password } : undefined,
        timeout: 3000
      });
      console.log(`  ✓ Camera responded: ${response.status}`);
    } catch (err) {
      console.log(`  ✗ Camera error: ${err.code} - ${err.message}`);
    }

  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await mongoose.disconnect();
  }
}

testPTZ();
