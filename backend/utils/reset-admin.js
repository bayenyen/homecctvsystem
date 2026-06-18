require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');

const resetAdmin = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    const adminUsername = process.env.SEED_ADMIN_USERNAME || 'admin';
    const adminPassword = process.env.SEED_ADMIN_PASSWORD || 'Admin@123';
    const adminEmail = process.env.SEED_ADMIN_EMAIL || 'admin@v380cctv.local';

    const deleted = await User.deleteMany({});
    console.log(`Deleted ${deleted.deletedCount} user(s)`);

    const admin = await User.create({
      fullName: 'System Administrator',
      username: adminUsername,
      email: adminEmail,
      password: adminPassword,
      role: 'admin',
      status: 'active'
    });

    console.log('New admin account created successfully!');
    console.log(`   Username: ${adminUsername}`);
    console.log(`   Password: ${adminPassword}`);
    console.log(`   Email:    ${adminEmail}`);
    process.exit(0);
  } catch (error) {
    console.error('Error resetting admin:', error);
    process.exit(1);
  }
};

resetAdmin();
