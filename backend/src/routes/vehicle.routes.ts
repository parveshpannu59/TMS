import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { uploadVehicleImage as uploadVehicleImg, uploadVehicleDocument as uploadVehicleDoc } from '../middleware/upload.middleware';
import {
  getVehicles,
  getVehicleStats,
  getVehiclesByStatus,
  getVehicleById,
  createVehicle,
  updateVehicle,
  deleteVehicle,
  uploadVehicleImage,
  uploadVehicleDocument,
} from '../controllers/vehicle.controller';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Stats & filtered queries
router.get('/stats', getVehicleStats);
router.get('/by-status', getVehiclesByStatus);

// CRUD operations
router.get('/', getVehicles);
router.get('/:id', getVehicleById);
router.post('/', createVehicle);
router.put('/:id', updateVehicle);
router.delete('/:id', deleteVehicle);

// File uploads
router.post('/:id/upload-image', uploadVehicleImg, uploadVehicleImage);
router.post('/:id/upload-document', uploadVehicleDoc, uploadVehicleDocument);

export default router;
