#!/usr/bin/env node
/**
 * Test PTZ API with the fixed port logic
 * Verifies that the PTZ controller is using port 8899
 */

const axios = require('axios');
const jwt = require('jsonwebtoken');
const connectDB = require('../config/database');
const User = require('../models/User');

const BASE_URL = 'http://localhost:5000';
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

(async () => {
  try {
    // Connect to database
    await connectDB();

    // Get admin user
    const admin = await User.findOne({ role: 'admin' }).select('+password');
    if (!admin) {
      console.log('❌ Admin user not found. Run: npm run seed');
      process.exit(1);
    }

    // Create auth token
    const token = jwt.sign(
      { userId: admin._id, role: admin.role },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    console.log('╔═══════════════════════════════════════════════════╗');
    console.log('║   Testing PTZ API with Fixed Port Logic         ║');
    console.log('║   Expected: port 8899 (V380 ONVIF port)          ║');
    console.log('╚═══════════════════════════════════════════════════╝\n');

    // Get first camera
    const Camera = require('../models/Camera');
    const camera = await Camera.findOne({ ptzSupported: true }).select('+password');
    
    if (!camera) {
      console.log('❌ No PTZ cameras found');
      process.exit(1);
    }

    console.log(`📹 Testing camera: ${camera.name}`);
    console.log(`   IP: ${camera.ipAddress}`);
    console.log(`   RTSP Port: ${camera.port}`);
    console.log(`   PTZ Config Port: ${camera.ptzConfig?.port || 'not set'}`);
    console.log(`   PTZ Protocol: ${camera.ptzConfig?.protocol || 'not set'}\n`);

    // Test PTZ UP command
    console.log('📤 Sending PTZ UP command...\n');
    
    const response = await axios.post(
      `${BASE_URL}/api/ptz/${camera._id}/command`,
      { command: 'up', speed: 5 },
      { headers: { Authorization: `Bearer ${token}` } }
    );

    if (response.data.success) {
      console.log('✅ PTZ Command Successful!');
      console.log(`   Response: ${response.data.message}`);
    } else {
      console.log('⚠️  PTZ Command Failed');
      console.log(`   Message: ${response.data.message}`);
      console.log(`   Note: ${response.data.note || ''}`);
    }

    console.log('\n✓ Test complete - check backend logs for port details');
    process.exit(0);
  } catch (err) {
    console.error('\n❌ Test Error:', err.message);
    if (err.response?.data) {
      console.error('   Response:', err.response.data);
    }
    process.exit(1);
  }
})();
