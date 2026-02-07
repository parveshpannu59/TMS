import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { uploadVehicleDocFile } from '../middleware/upload.middleware';
import {
  getVehicleDocuments,
  getDocumentHistory,
  uploadVehicleDocumentFile,
  deleteVehicleDocument,
  searchVehicleDocuments,
  getExpiringDocuments,
} from '../controllers/vehicleDocument.controller';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Search & expiring alerts (company-wide)
router.get('/search', searchVehicleDocuments);
router.get('/expiring', getExpiringDocuments);

export default router;

// These routes are mounted under /api/vehicles/:vehicleId/documents
// via the vehicle routes or a separate sub-router
export const vehicleDocSubRouter = Router({ mergeParams: true });

vehicleDocSubRouter.use(authenticate);

// Get all latest documents for a vehicle
vehicleDocSubRouter.get('/', getVehicleDocuments);

// Get document history (all versions)
vehicleDocSubRouter.get('/history', getDocumentHistory);

// Upload new document
vehicleDocSubRouter.post('/', uploadVehicleDocFile, uploadVehicleDocumentFile);

// Delete a document
vehicleDocSubRouter.delete('/:documentId', deleteVehicleDocument);
