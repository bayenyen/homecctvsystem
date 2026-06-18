/**
 * Socket.IO Configuration
 * Handles real-time notifications, alerts, and camera status updates
 */

const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const logger = require('../utils/logger');
const { getAllowedOrigins } = require('./origins');

let io;

const initSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: getAllowedOrigins(),
      methods: ['GET', 'POST'],
      credentials: true,
    },
    pingTimeout: 60000,
    pingInterval: 25000,
  });

  // Authentication middleware for socket connections
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization?.split(' ')[1];

    if (!token) {
      return next(new Error('Authentication token required'));
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.user = decoded;
      next();
    } catch (err) {
      next(new Error('Invalid authentication token'));
    }
  });

  io.on('connection', (socket) => {
    logger.info(`Socket connected: ${socket.id} | User: ${socket.user?.username}`);

    // Join user-specific room for targeted notifications
    socket.join(`user_${socket.user.id}`);

    // Join role-based room
    socket.join(`role_${socket.user.role}`);

    // Join admin room for all alerts
    if (socket.user.role === 'admin') {
      socket.join('admin_room');
    }

    socket.on('disconnect', () => {
      logger.info(`Socket disconnected: ${socket.id}`);
    });

    // Camera monitoring room
    socket.on('join_camera', (cameraId) => {
      socket.join(`camera_${cameraId}`);
    });

    socket.on('leave_camera', (cameraId) => {
      socket.leave(`camera_${cameraId}`);
    });
  });

  return io;
};

const getIO = () => {
  if (!io) throw new Error('Socket.IO not initialized');
  return io;
};

// Emit helpers
const emitAlert = (alert) => {
  if (io) {
    io.emit('new_alert', alert);
  }
};

const emitCameraStatus = (cameraId, status) => {
  if (io) {
    io.emit('camera_status', { cameraId, status, timestamp: new Date() });
  }
};

const emitStorageWarning = (data) => {
  if (io) {
    io.to('admin_room').emit('storage_warning', data);
  }
};

const emitRecordingEvent = (event) => {
  if (io) {
    io.emit('recording_event', event);
  }
};

module.exports = { initSocket, getIO, emitAlert, emitCameraStatus, emitStorageWarning, emitRecordingEvent };
