import { Router } from 'express';
import mongoose from 'mongoose';
import authRoutes from './auth.routes';
import userRoutes from './user.routes';
import dashboardRoutes from './dashboardRoutes';
import loadRoutes from './load.routes';
import vehicleRoutes from './vehicle.routes';
import truckRoutes from './truck.routes';
import trailerRoutes from './trailer.routes';
import driverRoutes from './driver.routes';
import notificationRoutes from './notification.routes';
import activityLogRoutes from './activityLog.routes';
import messageRoutes from './message.routes';
import assignmentRoutes from './assignment.routes';
import tripRoutes from './trip.routes';
import sosRoutes from './sos.routes';
import settingsRoutes from './settings.route';
import vehicleDocumentRoutes, { vehicleDocSubRouter } from './vehicleDocument.routes';
import pusherRoutes from './pusher.routes';

const router = Router();

router.get('/health', (_req, res) => {
  res.json({
    success: true,
    message: 'TMS API is running',
    version: '1.0',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

router.get('/health/ready', (_req, res) => {
  const dbState = mongoose.connection.readyState;
  const dbOk = dbState === 1;
  if (!dbOk) {
    return res.status(503).json({
      success: false,
      message: 'Service unavailable',
      database: dbState === 0 ? 'connecting' : dbState === 2 ? 'disconnecting' : 'disconnected',
    });
  }
  return res.json({
    success: true,
    message: 'Ready',
    database: 'connected',
    timestamp: new Date().toISOString(),
  });
});

router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/loads', loadRoutes);
router.use('/vehicles', vehicleRoutes);
router.use('/vehicles/:vehicleId/documents', vehicleDocSubRouter);
router.use('/vehicle-documents', vehicleDocumentRoutes);
router.use('/trucks', truckRoutes);
router.use('/trailers', trailerRoutes);
router.use('/drivers', driverRoutes);
router.use('/notifications', notificationRoutes);
router.use('/activity-logs', activityLogRoutes);
router.use('/messages', messageRoutes);
router.use('/assignments', assignmentRoutes);
router.use('/trips', tripRoutes);
router.use('/sos', sosRoutes);
router.use('/settings', settingsRoutes);
router.use('/pusher', pusherRoutes);

export default router;