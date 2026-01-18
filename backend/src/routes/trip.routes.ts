import { Router } from 'express';
import { TripController } from '../controllers/trip.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Driver routes
router.post('/start', TripController.startTrip);
router.get('/current', TripController.getCurrentTrip);
router.get('/history', TripController.getTripHistory);
router.patch('/:id/location', TripController.updateLocation);
router.patch('/:id/complete', TripController.completeTrip);
router.patch('/:id/status', TripController.updateTripStatus);

// General routes
router.get('/:id', TripController.getTripById);

export default router;
