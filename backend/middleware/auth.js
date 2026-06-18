/**
 * Authentication & Authorization Middleware
 */

const jwt = require('jsonwebtoken');
const User = require('../models/User');
const logger = require('../utils/logger');

/**
 * Protect routes - require valid JWT
 */
const protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token && req.query?.token) {
    token = req.query.token;
  }

  if (!token) {
    return res.status(401).json({ success: false, message: 'Not authorized, no token' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findById(decoded.id).select('-password');

    if (!user) {
      return res.status(401).json({ success: false, message: 'Token invalid, user not found' });
    }

    if (user.status !== 'active') {
      return res.status(401).json({ success: false, message: 'Account is inactive or suspended' });
    }

    req.user = user;
    next();
  } catch (error) {
    logger.error('Auth middleware error:', error.message);
    return res.status(401).json({ success: false, message: 'Not authorized, token failed' });
  }
};

/**
 * Restrict to specific roles
 */
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Role '${req.user.role}' is not authorized to access this resource`
      });
    }
    next();
  };
};

/**
 * Check specific permission
 */
const checkPermission = (permission) => {
  return (req, res, next) => {
    if (req.user.role === 'admin') return next(); // Admin has all permissions

    if (!req.user.permissions || !req.user.permissions[permission]) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to perform this action'
      });
    }
    next();
  };
};

module.exports = { protect, authorize, checkPermission };
