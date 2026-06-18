/**
 * Database Seed Script
 * Creates default admin account
 * Run with: npm run seed
 */

require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');

const seed = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    const adminUsername = process.env.SEED_ADMIN_USERNAME || 'admin';
    const adminPassword = process.env.SEED_ADMIN_PASSWORD || 'Admin@123';
    const adminEmail = process.env.SEED_ADMIN_EMAIL || 'admin@v380cctv.local';

    const existing = await User.findOne({ username: adminUsername });
    if (existing) {
      console.log(`Admin user '${adminUsername}' already exists. Skipping...`);
      process.exit(0);
    }

    await User.create({
      fullName: 'System Administrator',
      username: adminUsername,
      email: adminEmail,
      password: adminPassword,
      role: 'admin',
      status: 'active'
    });

    console.log('Admin account created successfully!');
    console.log(`   Username: ${adminUsername}`);
    console.log(`   Password: ${adminPassword}`);
    console.log(`   Email:    ${adminEmail}`);
    console.log('\n Please change the password after first login!');

    process.exit(0);
  } catch (error) {
    console.error('Seed error:', error.message);
    process.exit(1);
  }
};

seed();
