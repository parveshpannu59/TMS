import { Router } from 'express';
import authRoutes from './auth.routes';
import userRoutes from './user.routes';
import dashboardRoutes from './dashboardRoutes';
import loadRoutes from './load.routes';
import truckRoutes from './truck.routes';
import trailerRoutes from './trailer.routes';
import driverRoutes from './driver.routes';
import notificationRoutes from './notification.routes';
import activityLogRoutes from './activityLog.routes';
import messageRoutes from './message.routes';
import assignmentRoutes from './assignment.routes';

const router = Router();

router.get('/health', (_req, res) => {
  res.json({ success: true, message: 'TMS API is running' });
});

router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/loads', loadRoutes);
router.use('/trucks', truckRoutes);
router.use('/trailers', trailerRoutes);
router.use('/drivers', driverRoutes);
router.use('/notifications', notificationRoutes);
router.use('/activity-logs', activityLogRoutes);
router.use('/messages', messageRoutes);
router.use('/assignments', assignmentRoutes);

export default router;