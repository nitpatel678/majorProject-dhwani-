import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { createServer } from 'http';
import { config } from './config';
import { initSocket } from './lib/socket';
import { errorHandler } from './middleware/errorHandler';
import path from 'path';

// Routes
import authRoutes from './routes/auth.routes';
import dashboardRoutes from './routes/dashboard.routes';
import deviceRoutes from './routes/device.routes';
import eventRoutes from './routes/event.routes';
import incidentRoutes from './routes/incident.routes';
import responderRoutes from './routes/responder.routes';
import audioRoutes from './routes/audio.routes';
import analyticsRoutes from './routes/analytics.routes';
import notificationRoutes from './routes/notification.routes';
import mapRoutes from './routes/map.routes';
import settingsRoutes from './routes/settings.routes';

const app = express();
const httpServer = createServer(app);

// Initialize Socket.io
const io = initSocket(httpServer);

// Middleware
app.use(helmet({ crossOriginResourcePolicy: false }));
app.use(cors({ origin: config.cors.origin, credentials: true }));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Static files
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/devices', deviceRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/incidents', incidentRoutes);
app.use('/api/responders', responderRoutes);
app.use('/api/audio', audioRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/map', mapRoutes);
app.use('/api/settings', settingsRoutes);

// Health check
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: '1.0.0',
  });
});

// Error handler
app.use(errorHandler);

// Start server
httpServer.listen(config.port, () => {
  console.log(`
  ╔══════════════════════════════════════════╗
  ║                                          ║
  ║     🎙️  DhwaniAI Backend Server          ║
  ║     📡  Port: ${config.port}                      ║
  ║     🌐  Env: ${config.nodeEnv}             ║
  ║     🔌  Socket.io: Active                ║
  ║                                          ║
  ╚══════════════════════════════════════════╝
  `);
});

export { app, httpServer, io };
