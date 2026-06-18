/**
 * Authentication Controller
 */

const jwt = require('jsonwebtoken');
const User = require('../models/User');
const AuditLog = require('../models/AuditLog');
const Alert = require('../models/Alert');
const logger = require('../utils/logger');
const { emitAlert } = require('../config/socket');

// Generate JWT Token
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '7d'
  });
};

// Log audit event
const logAudit = async (userId, username, action, req, metadata = {}) => {
  try {
    await AuditLog.create({
      user: userId,
      username,
      action,
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.headers['user-agent'],
      ...metadata
    });
  } catch (err) {
    logger.error('Audit log error:', err);
  }
};

/**
 * @route   POST /api/auth/login
 * @desc    Login user
 * @access  Public
 */
const login = async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ success: false, message: 'Username and password are required' });
  }

  try {
    // Find user by username or email
    const user = await User.findOne({
      $or: [{ username: username.toLowerCase() }, { email: username.toLowerCase() }]
    }).select('+password');

    if (!user) {
      // Log failed attempt
      await logAudit(null, username, 'login_failed', req, {
        success: false,
        description: `Failed login attempt for username: ${username}`
      });

      // Create security alert
      const alert = await Alert.create({
        type: 'user_login_failed',
        severity: 'warning',
        title: 'Failed Login Attempt',
        message: `Failed login attempt for username: ${username}`,
        metadata: { username, ip: req.ip }
      });
      emitAlert(alert);

      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    // Check if account is locked
    if (user.isLocked()) {
      const lockTime = Math.ceil((user.lockedUntil - Date.now()) / 60000);
      return res.status(401).json({
        success: false,
        message: `Account locked. Try again in ${lockTime} minutes`
      });
    }

    // Check if account is active
    if (user.status !== 'active') {
      return res.status(401).json({ success: false, message: 'Account is inactive or suspended' });
    }

    // Verify password
    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      await user.incrementLoginAttempts();

      await logAudit(user._id, user.username, 'login_failed', req, {
        success: false,
        description: 'Incorrect password'
      });

      const remainingAttempts = 5 - user.loginAttempts;
      return res.status(401).json({
        success: false,
        message: `Invalid credentials. ${remainingAttempts > 0 ? `${remainingAttempts} attempts remaining` : 'Account locked for 15 minutes'}`
      });
    }

    // Reset login attempts
    await user.resetLoginAttempts();
    user.lastLoginIP = req.ip;
    await user.save({ validateBeforeSave: false });

    // Generate token
    const token = generateToken(user._id);

    // Log successful login
    await logAudit(user._id, user.username, 'login', req, {
      description: 'Successful login'
    });

    res.json({
      success: true,
      token,
      user: {
        id: user._id,
        fullName: user.fullName,
        username: user.username,
        email: user.email,
        role: user.role,
        permissions: user.permissions,
        lastLogin: user.lastLogin
      }
    });
  } catch (error) {
    logger.error('Login error:', error);
    res.status(500).json({ success: false, message: 'Server error during login' });
  }
};

/**
 * @route   GET /api/auth/me
 * @desc    Get current user
 * @access  Private
 */
const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    res.json({
      success: true,
      user: {
        id: user._id,
        fullName: user.fullName,
        username: user.username,
        email: user.email,
        role: user.role,
        permissions: user.permissions,
        lastLogin: user.lastLogin,
        status: user.status,
        createdAt: user.createdAt
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

/**
 * @route   POST /api/auth/logout
 * @desc    Logout user (log the event)
 * @access  Private
 */
const logout = async (req, res) => {
  await logAudit(req.user._id, req.user.username, 'logout', req, {
    description: 'User logged out'
  });
  res.json({ success: true, message: 'Logged out successfully' });
};

/**
 * @route   PUT /api/auth/change-password
 * @desc    Change own password
 * @access  Private
 */
const changePassword = async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    return res.status(400).json({ success: false, message: 'Both current and new password are required' });
  }

  if (newPassword.length < 6) {
    return res.status(400).json({ success: false, message: 'New password must be at least 6 characters' });
  }

  try {
    const user = await User.findById(req.user.id).select('+password');
    const isMatch = await user.matchPassword(currentPassword);

    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Current password is incorrect' });
    }

    user.password = newPassword;
    await user.save();

    res.json({ success: true, message: 'Password changed successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

module.exports = { login, getMe, logout, changePassword };
