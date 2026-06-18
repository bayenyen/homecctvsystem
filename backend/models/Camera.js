/**
 * Camera Model
 * V380 / V380PRO compatible camera configuration
 */

const mongoose = require('mongoose');

const cameraSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Camera name is required'],
    trim: true,
    maxlength: [100, 'Camera name cannot exceed 100 characters']
  },
  ipAddress: {
    type: String,
    required: [true, 'IP address is required'],
    trim: true
  },
  port: {
    type: Number,
    default: 554 // Default RTSP port
  },
  username: {
    type: String,
    trim: true,
    default: 'admin'
  },
  password: {
    type: String,
    select: false // Don't return password by default
  },
  streamUrl: {
    type: String,
    trim: true
    // e.g., rtsp://admin:password@192.168.1.100:554/stream
  },
  streamType: {
    type: String,
    enum: ['rtsp', 'rtmp', 'http', 'hls', 'manual'],
    default: 'rtsp'
  },
  location: {
    type: String,
    trim: true,
    maxlength: [200, 'Location cannot exceed 200 characters']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [500, 'Description cannot exceed 500 characters']
  },
  status: {
    type: String,
    enum: ['online', 'offline', 'error', 'unknown', 'disabled'],
    default: 'unknown'
  },
  isRecording: {
    type: Boolean,
    default: false
  },
  recordingMode: {
    type: String,
    enum: ['continuous', 'scheduled', 'manual', 'motion', 'disabled'],
    default: 'continuous'
  },
  recordingSchedule: {
    enabled: { type: Boolean, default: false },
    startTime: { type: String, default: '00:00' },
    endTime: { type: String, default: '23:59' },
    days: {
      type: [String],
      default: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
    }
  },
  ptzSupported: {
    type: Boolean,
    default: false
  },
  ptzConfig: {
    protocol: { type: String, enum: ['http', 'onvif', 'v380api'], default: 'http' },
    controlUrl: { type: String },
    port: { type: Number, default: 8899 } // ONVIF port (V380 default is 8899)
  },
  resolution: {
    type: String,
    enum: ['360p', '480p', '720p', '1080p', '4K'],
    default: '1080p'
  },
  fps: {
    type: Number,
    default: 15
  },
  thumbnailPath: {
    type: String
  },
  lastSeen: {
    type: Date
  },
  lastChecked: {
    type: Date
  },
  addedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  tags: [String],
  // V380-specific settings
  v380Settings: {
    deviceId: { type: String },
    model: { type: String },
    firmware: { type: String }
  }
}, {
  timestamps: true
});

// Generate RTSP URL if not manually provided
cameraSchema.methods.getRtspUrl = function () {
  if (this.streamUrl) {
    try {
      const url = new URL(this.streamUrl);
      if (!url.username && this.username) {
        url.username = encodeURIComponent(this.username);
        url.password = encodeURIComponent(this.password || '');
      }
      return url.toString();
    } catch (err) {
      return this.streamUrl;
    }
  }

  const auth = (this.username && this.password) ? `${encodeURIComponent(this.username)}:${encodeURIComponent(this.password)}@` : '';
  return `rtsp://${auth}${this.ipAddress}:${this.port}/stream`;
};

// Virtual for display info
cameraSchema.virtual('displayInfo').get(function () {
  return `${this.name} (${this.ipAddress}:${this.port})`;
});

module.exports = mongoose.model('Camera', cameraSchema);
