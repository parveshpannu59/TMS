import express from 'express';
import { LoadController } from '../controllers/load.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';
import { UserRole } from '../types/auth.types';

const router = express.Router();

// All load routes require authentication
router.use(authenticate);

// Get all loads (all roles)
router.get(
  '/',
  LoadController.getLoads
);

// Get single load (all roles)
router.get(
  '/:id',
  LoadController.getLoadById
);

// Create load (Owner, Dispatcher)
router.post(
  '/',
  authorize(UserRole.OWNER, UserRole.DISPATCHER),
  LoadController.createLoad
);

// Update load (Owner, Dispatcher)
router.put(
  '/:id',
  authorize(UserRole.OWNER, UserRole.DISPATCHER),
  LoadController.updateLoad
);

// Assign load (Owner, Dispatcher)
router.post(
  '/:id/assign',
  authorize(UserRole.OWNER, UserRole.DISPATCHER),
  LoadController.assignLoad
);

// Update status (Owner, Dispatcher, Driver)
router.patch(
  '/:id/status',
  authorize(UserRole.OWNER, UserRole.DISPATCHER, UserRole.DRIVER),
  LoadController.updateStatus
);

// Delete load (Owner, Dispatcher)
router.delete(
  '/:id',
  authorize(UserRole.OWNER, UserRole.DISPATCHER),
  LoadController.deleteLoad
);

export default router;
