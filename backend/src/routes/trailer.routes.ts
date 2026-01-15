import express from 'express';
import { TrailerController } from '../controllers/trailer.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';
import { UserRole } from '../types/auth.types';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Get all trailers (all roles)
router.get('/', TrailerController.getTrailers);

// Get single trailer (all roles)
router.get('/:id', TrailerController.getTrailerById);

// Create trailer (Owner, Dispatcher)
router.post(
  '/',
  authorize(UserRole.OWNER, UserRole.DISPATCHER),
  TrailerController.createTrailer
);

// Update trailer (Owner, Dispatcher)
router.put(
  '/:id',
  authorize(UserRole.OWNER, UserRole.DISPATCHER),
  TrailerController.updateTrailer
);

// Delete trailer (Owner only)
router.delete(
  '/:id',
  authorize(UserRole.OWNER),
  TrailerController.deleteTrailer
);

export default router;
