import { Router } from 'express';
import { SOSController } from '../controllers/sos.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';
import { UserRole } from '../types/auth.types';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Driver routes
router.post('/', authorize(UserRole.DRIVER), SOSController.createSOS);
router.get('/my-history', authorize(UserRole.DRIVER), SOSController.getDriverSOSHistory);

// Dispatcher/Owner routes
router.get('/active', authorize(UserRole.OWNER, UserRole.DISPATCHER), SOSController.getActiveSOS);
router.patch('/:id/acknowledge', authorize(UserRole.OWNER, UserRole.DISPATCHER), SOSController.acknowledgeSOS);
router.patch('/:id/resolve', authorize(UserRole.OWNER, UserRole.DISPATCHER), SOSController.resolveSOS);

export default router;
