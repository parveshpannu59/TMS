import express from 'express';
import {
  getOwnerDashboard,
  getUserWidgets,
  saveUserWidgets,
  resetUserWidgets,
} from '../controllers/dashboardController';
import { authenticate, authorize } from '../middleware/auth.middleware';
import { UserRole } from '../types/auth.types';

const router = express.Router();

// General dashboard - accessible by all authenticated users
router.get(
  '/',
  authenticate,
  getOwnerDashboard
);

// Owner/Dispatcher specific dashboard (same data for now)
router.get(
  '/owner',
  authenticate,
  authorize(UserRole.OWNER, UserRole.DISPATCHER),
  getOwnerDashboard
);

router.get(
  '/widgets',
  authenticate,
  getUserWidgets
);

router.post(
  '/widgets',
  authenticate,
  saveUserWidgets
);

router.delete(
  '/widgets',
  authenticate,
  resetUserWidgets
);

export default router;