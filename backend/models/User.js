/**
 * User Model
 * Supports Admin and Security Staff roles
 */

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  fullName: {
    type: String,
    required: [true, 'Full name is required'],
    trim: true,
    maxlength: [100, 'Name cannot exceed 100 characters']
  },
  username: {
    type: String,
    required: [true, 'Username is required'],
    unique: true,
    trim: true,
    lowercase: true,
    minlength: [3, 'Username must be at least 3 characters'],
    maxlength: [30, 'Username cannot exceed 30 characters'],
    match: [/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores']
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email']
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [6, 'Password must be at least 6 characters'],
    select: false // Don't return password by default
  },
  role: {
    type: String,
    enum: ['admin', 'security'],
    default: 'security'
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'suspended'],
    default: 'active'
  },
  lastLogin: {
    type: Date
  },
  lastLoginIP: {
    type: String
  },
  loginAttempts: {
    type: Number,
    default: 0
  },
  lockedUntil: {
    type: Date
  },
  avatar: {
    type: String
  },
  permissions: {
    viewCameras: { type: Boolean, default: true },
    manageRecordings: { type: Boolean, default: false },
    downloadRecordings: { type: Boolean, default: false },
    manageCameras: { type: Boolean, default: false },
    manageUsers: { type: Boolean, default: false },
    viewReports: { type: Boolean, default: false },
    configureSystem: { type: Boolean, default: false }
  }
}, {
  timestamps: true
});

// Hash password before saving
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Set default permissions based on role
userSchema.pre('save', function (next) {
  if (this.isModified('role')) {
    if (this.role === 'admin') {
      this.permissions = {
        viewCameras: true,
        manageRecordings: true,
        downloadRecordings: true,
        manageCameras: true,
        manageUsers: true,
        viewReports: true,
        configureSystem: true
      };
    } else {
      this.permissions = {
        viewCameras: true,
        manageRecordings: false,
        downloadRecordings: false,
        manageCameras: false,
        manageUsers: false,
        viewReports: false,
        configureSystem: false
      };
    }
  }
  next();
});

// Compare password method
userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Check if account is locked
userSchema.methods.isLocked = function () {
  return this.lockedUntil && this.lockedUntil > Date.now();
};

// Increment failed login attempts
userSchema.methods.incrementLoginAttempts = async function () {
  this.loginAttempts += 1;
  if (this.loginAttempts >= 5) {
    this.lockedUntil = new Date(Date.now() + 15 * 60 * 1000); // Lock for 15 minutes
  }
  await this.save();
};

// Reset login attempts on successful login
userSchema.methods.resetLoginAttempts = async function () {
  this.loginAttempts = 0;
  this.lockedUntil = undefined;
  this.lastLogin = new Date();
  await this.save();
};

module.exports = mongoose.model('User', userSchema);
