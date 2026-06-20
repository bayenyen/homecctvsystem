/**
 * V380 CCTV Management and Recording System
 * Main Server Entry Point
 */

require('dotenv').config();
const express = require('express');
const http = require('http');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
const fs = require('fs');

const connectDB = require('./config/database');
const { initSocket } = require('./config/socket');
const { getAllowedOrigins } = require('./config/origins');
const logger = require('./utils/logger');
const { initSchedulers } = require('./services/schedulerService');
const { ensureDirectories } = require('./utils/fileSystem');

// Route imports
const authRoutes = require('./routes/authRoutes');
const cameraRoutes = require('./routes/cameraRoutes');
const recordingRoutes = require('./routes/recordingRoutes');
const userRoutes = require('./routes/userRoutes');
const alertRoutes = require('./routes/alertRoutes');
const reportRoutes = require('./routes/reportRoutes');
const storageRoutes = require('./routes/storageRoutes');
const ptzRoutes = require('./routes/ptzRoutes');

const app = express();
const server = http.createServer(app);

// Initialize Socket.IO
const io = initSocket(server);

// Make io accessible throughout the app
app.set('io', io);

// ─── Middleware ───────────────────────────────────────────────────────────────
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
const allowedOrigins = getAllowedOrigins();

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error(`CORS blocked origin: ${origin}`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(morgan('combined', { stream: { write: msg => logger.info(msg.trim()) } }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Serve recordings as static files (protected by auth middleware in routes)
app.use('/recordings', express.static(path.join(__dirname, 'recordings')));

// ─── API Routes ───────────────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/cameras', cameraRoutes);
app.use('/api/recordings', recordingRoutes);
app.use('/api/users', userRoutes);
app.use('/api/alerts', alertRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/storage', storageRoutes);
app.use('/api/ptz', ptzRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'online',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    system: 'V380 CCTV Management System'
  });
});

// ─── Frontend Static Files (Production) ───────────────────────────────────────
// Serve frontend build files (when deployed)
const frontendBuildPath = path.join(__dirname, '../frontend/dist');
if (fs.existsSync(frontendBuildPath)) {
  app.use(express.static(frontendBuildPath));
  // SPA routing: serve index.html for all non-API routes
  app.get('*', (req, res) => {
    res.sendFile(path.join(frontendBuildPath, 'index.html'));
  });
}

// ─── Error Handling ───────────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  logger.error(`${err.message} - ${req.originalUrl} - ${req.method} - ${req.ip}`);
  const statusCode = err.statusCode || 500;
  res.status(statusCode).json({
    success: false,
    message: err.message || 'Internal Server Error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

// ─── Startup ──────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    // Ensure required directories exist
    await ensureDirectories();

    // Connect to MongoDB
    await connectDB();

    // Start scheduled jobs
    initSchedulers(io);

    server.listen(PORT, () => {
      logger.info(`\n╔══════════════════════════════════════════════╗`);
      logger.info(`║   V380 CCTV Management System - Backend      ║`);
      logger.info(`║   Server running on port ${PORT}                 ║`);
      logger.info(`║   Environment: ${process.env.NODE_ENV || 'development'}                  ║`);
      logger.info(`╚══════════════════════════════════════════════╝\n`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

module.exports = { app, server, io };
