import express from 'express';
import { LoadController } from '../controllers/loadController';
import { authMiddleware } from '../middleware/authMiddleware';
import { roleMiddleware } from '../middleware/roleMiddleware';

const router = express.Router();

// All routes require authentication
router.use(authMiddleware);

// Create load - Owner & Dispatcher only
router.post(
  '/',
  roleMiddleware(['Owner', 'Dispatcher']),
  LoadController.createLoad
);

// Get all loads
router.get('/', LoadController.getAllLoads);

// Get load by ID
router.get('/:id', LoadController.getLoadById);

// Assign load - Owner & Dispatcher only
router.post(
  '/:id/assign',
  roleMiddleware(['Owner', 'Dispatcher']),
  LoadController.assignLoad
);

// Update load status
router.patch('/:id/status', LoadController.updateLoadStatus);

// Update load - Owner & Dispatcher only
router.put(
  '/:id',
  roleMiddleware(['Owner', 'Dispatcher']),
  LoadController.updateLoad
);

// Delete load - Owner only
router.delete(
  '/:id',
  roleMiddleware(['Owner']),
  LoadController.deleteLoad
);

export default router;