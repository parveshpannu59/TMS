import { Router } from 'express';
import { SOSController } from '../controllers/sos.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Driver routes
router.post('/', SOSController.createSOS);
router.get('/my-history', SOSController.getDriverSOSHistory);

// Dispatcher/Owner routes
router.get('/active', SOSController.getActiveSOS);
router.patch('/:id/acknowledge', SOSController.acknowledgeSOS);
router.patch('/:id/resolve', SOSController.resolveSOS);

export default router;
