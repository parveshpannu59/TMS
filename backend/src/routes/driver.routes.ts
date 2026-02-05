import express from 'express';
import { DriverController } from '../controllers/driver.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';
import { uploadDriverDocument } from '../middleware/upload.middleware';
import { UserRole } from '../types/auth.types';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Get my profile (Driver role - must be before /:id to avoid route conflict)
router.get('/me/profile', DriverController.getMyProfile);

// Get all drivers (all roles)
router.get('/', DriverController.getDrivers);

// Get single driver (all roles)
router.get('/:id', DriverController.getDriverById);

// Create driver (Owner, Dispatcher)
router.post(
  '/',
  authorize(UserRole.OWNER, UserRole.DISPATCHER),
  DriverController.createDriver
);

// Update driver (Owner, Dispatcher)
router.put(
  '/:id',
  authorize(UserRole.OWNER, UserRole.DISPATCHER),
  DriverController.updateDriver
);

// Delete driver (Owner only)
router.delete(
  '/:id',
  authorize(UserRole.OWNER),
  DriverController.deleteDriver
);

// Upload driver photo (Owner, Dispatcher)
router.post(
  '/:id/photo',
  authorize(UserRole.OWNER, UserRole.DISPATCHER),
  uploadDriverDocument,
  DriverController.uploadPhoto
);

// Upload driver document (Owner, Dispatcher)
router.post(
  '/:id/document',
  authorize(UserRole.OWNER, UserRole.DISPATCHER),
  uploadDriverDocument,
  DriverController.uploadDocument
);

export default router;
