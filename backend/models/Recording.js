/**
 * Recording Model
 * Tracks all video recordings stored on the server
 */

const mongoose = require('mongoose');

const recordingSchema = new mongoose.Schema({
  camera: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Camera',
    required: true
  },
  cameraName: {
    type: String // Denormalized for quick access
  },
  filename: {
    type: String,
    required: true
  },
  filePath: {
    type: String,
    required: true
  },
  fileSize: {
    type: Number, // in bytes
    default: 0
  },
  duration: {
    type: Number, // in seconds
    default: 0
  },
  startTime: {
    type: Date,
    required: true,
    default: Date.now
  },
  endTime: {
    type: Date
  },
  status: {
    type: String,
    enum: ['recording', 'completed', 'failed', 'corrupted'],
    default: 'recording'
  },
  recordingType: {
    type: String,
    enum: ['continuous', 'scheduled', 'manual', 'motion'],
    default: 'continuous'
  },
  resolution: {
    type: String
  },
  thumbnailPath: {
    type: String
  },
  isDeleted: {
    type: Boolean,
    default: false
  },
  deletedAt: {
    type: Date
  },
  deletedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  metadata: {
    codec: String,
    bitrate: Number,
    fps: Number,
    format: { type: String, default: 'mp4' }
  },
  // For organizing by date
  dateString: {
    type: String // e.g., "2024-01-15"
  }
}, {
  timestamps: true
});

// Index for efficient queries
recordingSchema.index({ camera: 1, startTime: -1 });
recordingSchema.index({ dateString: 1 });
recordingSchema.index({ status: 1 });
recordingSchema.index({ isDeleted: 1 });

// Pre-save hook to set dateString
recordingSchema.pre('save', function (next) {
  if (this.startTime) {
    const d = new Date(this.startTime);
    this.dateString = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }
  next();
});

// Format file size helper
recordingSchema.virtual('fileSizeFormatted').get(function () {
  const bytes = this.fileSize;
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
});

// Duration formatted
recordingSchema.virtual('durationFormatted').get(function () {
  const secs = this.duration;
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = Math.floor(secs % 60);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
});

module.exports = mongoose.model('Recording', recordingSchema);
