import { Router } from 'express';
import { TripController } from '../controllers/trip.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';
import { UserRole } from '../types/auth.types';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Export trips as CSV (Owner, Dispatcher) - must come before /:id routes
router.get('/export/csv', authorize(UserRole.OWNER, UserRole.DISPATCHER), TripController.exportTripsCsv);

// Driver routes
router.post('/start', authorize(UserRole.DRIVER), TripController.startTrip);
router.get('/current', authorize(UserRole.DRIVER), TripController.getCurrentTrip);
router.get('/history', TripController.getTripHistory);
router.patch('/:id/location', authorize(UserRole.DRIVER), TripController.updateLocation);
router.patch('/:id/complete', authorize(UserRole.DRIVER), TripController.completeTrip);
router.patch('/:id/status', authorize(UserRole.DRIVER), TripController.updateTripStatus);

// General routes (Owner/Dispatcher/Driver)
router.get('/:id', TripController.getTripById);

export default router;
