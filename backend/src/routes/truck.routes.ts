import express from 'express';
import { TruckController } from '../controllers/truck.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';
import { UserRole } from '../types/auth.types';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Get all trucks (all roles)
router.get('/', TruckController.getTrucks);

// Get single truck (all roles)
router.get('/:id', TruckController.getTruckById);

// Create truck (Owner, Dispatcher)
router.post(
  '/',
  authorize(UserRole.OWNER, UserRole.DISPATCHER),
  TruckController.createTruck
);

// Update truck (Owner, Dispatcher)
router.put(
  '/:id',
  authorize(UserRole.OWNER, UserRole.DISPATCHER),
  TruckController.updateTruck
);

// Delete truck (Owner only)
router.delete(
  '/:id',
  authorize(UserRole.OWNER),
  TruckController.deleteTruck
);

export default router;
