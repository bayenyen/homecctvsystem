/**
 * User Management Controller (Admin only)
 */

const User = require('../models/User');
const AuditLog = require('../models/AuditLog');
const logger = require('../utils/logger');

const getUsers = async (req, res) => {
  try {
    const users = await User.find().sort({ createdAt: -1 });
    res.json({ success: true, count: users.length, data: users });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

const getUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    res.json({ success: true, data: user });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

const createUser = async (req, res) => {
  try {
    const { fullName, username, email, password, role, status } = req.body;

    const existingUser = await User.findOne({ $or: [{ username }, { email }] });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: existingUser.username === username ? 'Username already taken' : 'Email already registered'
      });
    }

    const user = await User.create({ fullName, username, email, password, role: role || 'security', status: status || 'active' });

    await AuditLog.create({
      user: req.user._id,
      username: req.user.username,
      action: 'user_add',
      resource: 'user',
      resourceId: user._id.toString(),
      description: `Created user: ${username} (${role})`
    });

    res.status(201).json({ success: true, message: 'User created successfully', data: { ...user.toObject(), password: undefined } });
  } catch (error) {
    logger.error('Create user error:', error);
    res.status(500).json({ success: false, message: error.message || 'Server error' });
  }
};

const updateUser = async (req, res) => {
  try {
    const { fullName, email, role, status, permissions } = req.body;
    const updates = {};

    if (fullName) updates.fullName = fullName;
    if (email) updates.email = email;
    if (role) updates.role = role;
    if (status) updates.status = status;
    if (permissions) updates.permissions = permissions;

    const user = await User.findByIdAndUpdate(req.params.id, { $set: updates }, { new: true, runValidators: true });

    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    await AuditLog.create({
      user: req.user._id,
      username: req.user.username,
      action: 'user_edit',
      resource: 'user',
      resourceId: user._id.toString(),
      description: `Updated user: ${user.username}`
    });

    res.json({ success: true, message: 'User updated successfully', data: user });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

const deleteUser = async (req, res) => {
  try {
    if (req.params.id === req.user.id) {
      return res.status(400).json({ success: false, message: 'Cannot delete your own account' });
    }

    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    await AuditLog.create({
      user: req.user._id,
      username: req.user.username,
      action: 'user_delete',
      resource: 'user',
      resourceId: req.params.id,
      description: `Deleted user: ${user.username}`
    });

    res.json({ success: true, message: 'User deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

const resetUserPassword = async (req, res) => {
  try {
    const { newPassword } = req.body;
    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters' });
    }

    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    user.password = newPassword;
    await user.save();

    res.json({ success: true, message: 'Password reset successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

module.exports = { getUsers, getUser, createUser, updateUser, deleteUser, resetUserPassword };
