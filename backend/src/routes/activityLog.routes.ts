import { Router } from 'express';
import {
  getActivityLogs,
  getActivityLogById,
  getEntityActivityLogs,
  createActivityLog,
  getActivityStats,
} from '../controllers/activityLog.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Get activity logs with filters
router.get('/', getActivityLogs);

// Get activity statistics
router.get('/stats', getActivityStats);

// Get activity logs for a specific entity
router.get('/entity/:entity/:entityId', getEntityActivityLogs);

// Get single activity log
router.get('/:id', getActivityLogById);

// Create activity log (for manual logging or system events)
router.post('/', createActivityLog);

export default router;
