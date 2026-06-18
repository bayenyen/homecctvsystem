/**
 * Audit Log Model
 * Tracks all user actions for security and reporting
 */

const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  username: {
    type: String // Denormalized
  },
  action: {
    type: String,
    required: true,
    enum: [
      'login', 'logout', 'login_failed',
      'camera_add', 'camera_edit', 'camera_delete',
      'recording_start', 'recording_stop', 'recording_delete', 'recording_download',
      'user_add', 'user_edit', 'user_delete',
      'alert_acknowledge',
      'settings_change',
      'ptz_control',
      'report_export'
    ]
  },
  resource: {
    type: String // camera, recording, user, etc.
  },
  resourceId: {
    type: String
  },
  description: {
    type: String
  },
  ipAddress: {
    type: String
  },
  userAgent: {
    type: String
  },
  success: {
    type: Boolean,
    default: true
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed
  }
}, {
  timestamps: true
});

auditLogSchema.index({ createdAt: -1 });
auditLogSchema.index({ user: 1 });
auditLogSchema.index({ action: 1 });

module.exports = mongoose.model('AuditLog', auditLogSchema);
