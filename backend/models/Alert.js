/**
 * Alert Model
 * System-wide alerts and notifications
 */

const mongoose = require('mongoose');

const alertSchema = new mongoose.Schema({
  type: {
    type: String,
    required: true,
    enum: [
      'camera_offline',
      'camera_online',
      'motion_detected',
      'storage_low',
      'storage_critical',
      'recording_failed',
      'recording_started',
      'recording_stopped',
      'unauthorized_access',
      'system_error',
      'user_login',
      'user_login_failed'
    ]
  },
  severity: {
    type: String,
    enum: ['info', 'warning', 'critical', 'success'],
    default: 'info'
  },
  title: {
    type: String,
    required: true
  },
  message: {
    type: String,
    required: true
  },
  camera: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Camera'
  },
  cameraName: {
    type: String // Denormalized
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed
  },
  isRead: {
    type: Boolean,
    default: false
  },
  readBy: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    readAt: { type: Date }
  }],
  acknowledged: {
    type: Boolean,
    default: false
  },
  acknowledgedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  acknowledgedAt: {
    type: Date
  }
}, {
  timestamps: true
});

alertSchema.index({ createdAt: -1 });
alertSchema.index({ type: 1 });
alertSchema.index({ severity: 1 });
alertSchema.index({ isRead: 1 });

module.exports = mongoose.model('Alert', alertSchema);
