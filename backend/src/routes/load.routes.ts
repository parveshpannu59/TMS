import express from 'express';
import { LoadController } from '../controllers/load.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';
import { UserRole } from '../types/auth.types';

const router = express.Router();

// All load routes require authentication
router.use(authenticate);

// Get my assigned loads (Driver) - must come before /:id
router.get(
  '/me/assigned',
  authorize(UserRole.DRIVER),
  LoadController.getMyAssignedLoads
);

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
// Unassign load from driver (Owner, Dispatcher)
router.post(
  '/:id/unassign',
  authorize(UserRole.OWNER, UserRole.DISPATCHER),
  LoadController.unassignLoad
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

// Broker confirms rate (Owner, Dispatcher, Broker)
router.post(
  '/:id/confirm-rate',
  authorize(UserRole.OWNER, UserRole.DISPATCHER),
  LoadController.confirmRate
);

// Driver accepts trip (Driver)
router.post(
  '/:id/accept-trip',
  authorize(UserRole.DRIVER),
  LoadController.acceptTrip
);

// Driver submits form details (Driver)
router.post(
  '/:id/driver-form',
  authorize(UserRole.DRIVER),
  LoadController.submitDriverForm
);

// Trip workflow endpoints (Driver)
router.post(
  '/:id/start-trip',
  authorize(UserRole.DRIVER),
  LoadController.startTrip
);

router.post(
  '/:id/shipper-check-in',
  authorize(UserRole.DRIVER),
  LoadController.shipperCheckIn
);

router.post(
  '/:id/shipper-load-in',
  authorize(UserRole.DRIVER),
  LoadController.shipperLoadIn
);

router.post(
  '/:id/shipper-load-out',
  authorize(UserRole.DRIVER),
  LoadController.shipperLoadOut
);

// Receiver check-in (Driver or Receiver role)
router.post(
  '/:id/receiver-check-in',
  authorize(UserRole.DRIVER),
  LoadController.receiverCheckIn
);

// Receiver offload (Driver or Receiver role)
router.post(
  '/:id/receiver-offload',
  authorize(UserRole.DRIVER),
  LoadController.receiverOffload
);

// End trip (Driver)
router.post(
  '/:id/end-trip',
  authorize(UserRole.DRIVER),
  LoadController.endTrip
);

// SOS/Emergency notification (Driver)
router.post(
  '/:id/sos',
  authorize(UserRole.DRIVER),
  LoadController.sendSOS
);

export default router;
