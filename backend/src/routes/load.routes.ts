import express from 'express';
import { LoadController } from '../controllers/load.controller';
import { DocumentController } from '../controllers/document.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';
import { uploadDocument, uploadDocumentForAnalysis, uploadLoadImage } from '../middleware/upload.middleware';
import { UserRole } from '../types/auth.types';

const router = express.Router();

// All load routes require authentication
router.use(authenticate);

// Document analysis (OCR/PDF reading) - must come before /:id routes
router.post(
  '/documents/analyze',
  uploadDocumentForAnalysis,
  DocumentController.analyzeDocument
);

// Get my assigned loads (Driver) - must come before /:id
router.get(
  '/me/assigned',
  authorize(UserRole.DRIVER),
  LoadController.getMyAssignedLoads
);

// Export loads as CSV (Owner, Dispatcher) - must come before /:id
router.get(
  '/export/csv',
  authorize(UserRole.OWNER, UserRole.DISPATCHER),
  LoadController.exportLoadsCsv
);

// Get all loads (all roles)
router.get(
  '/',
  LoadController.getLoads
);

// Expense approval routes (Owner/Dispatcher) - MUST come before /:id routes
router.get(
  '/expenses/pending',
  authorize(UserRole.OWNER, UserRole.DISPATCHER),
  LoadController.getPendingExpenses
);

router.patch(
  '/expenses/:expenseId/approve',
  authorize(UserRole.OWNER, UserRole.DISPATCHER),
  LoadController.approveExpense
);

router.patch(
  '/expenses/:expenseId/reimburse',
  authorize(UserRole.OWNER, UserRole.DISPATCHER),
  LoadController.markExpenseReimbursed
);

// Get load expenses (Driver, Owner, Dispatcher)
router.get(
  '/:id/expenses',
  LoadController.getLoadExpenses
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
// Edit assignment (change driver/truck/trailer/rate) before rate confirmation
router.patch(
  '/:id/edit-assignment',
  authorize(UserRole.OWNER, UserRole.DISPATCHER),
  LoadController.editAssignment
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

// Upload document for load (odometer, BOL, POD)
router.post(
  '/:id/upload-document',
  authorize(UserRole.DRIVER),
  uploadDocument,
  LoadController.uploadDocument
);

// Upload load/cargo image (Owner, Dispatcher)
router.post(
  '/:id/upload-image',
  authorize(UserRole.OWNER, UserRole.DISPATCHER),
  uploadLoadImage,
  LoadController.uploadLoadImage
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

// Confirm completion (Owner/Dispatcher reviews delivered load)
router.post(
  '/:id/confirm-completion',
  authorize(UserRole.OWNER, UserRole.DISPATCHER),
  LoadController.confirmCompletion
);

// Mark payment as paid (Owner/Dispatcher)
router.post(
  '/:id/mark-paid',
  authorize(UserRole.OWNER, UserRole.DISPATCHER),
  LoadController.markPaymentPaid
);

// Update location during trip (Driver - live tracking)
router.post(
  '/:id/update-location',
  authorize(UserRole.DRIVER),
  LoadController.updateLocation
);

// Get location tracking history (Owner/Dispatcher/Driver)
router.get(
  '/:id/location-history',
  LoadController.getLocationHistory
);

// Report delay (Driver)
router.post(
  '/:id/report-delay',
  authorize(UserRole.DRIVER),
  LoadController.reportDelay
);

// Log expense during trip (Driver)
router.post(
  '/:id/expenses',
  authorize(UserRole.DRIVER),
  LoadController.addExpense
);

// Get load expenses
router.get(
  '/:id/expenses',
  LoadController.getLoadExpenses
);

// SOS/Emergency notification (Driver)
router.post(
  '/:id/sos',
  authorize(UserRole.DRIVER),
  LoadController.sendSOS
);

export default router;
