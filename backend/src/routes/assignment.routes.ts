import express, { Router } from 'express';
import { AssignmentController } from '../controllers/assignment.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';
import { UserRole } from '../types/auth.types';

const router: Router = express.Router();

// All routes require authentication
router.use(authenticate);

// Driver routes
router.get('/me/pending', authorize(UserRole.DRIVER), AssignmentController.getPendingAssignments);
router.get('/me', authorize(UserRole.DRIVER), AssignmentController.getMyAssignments);

// Driver actions
router.post('/:id/accept', authorize(UserRole.DRIVER), AssignmentController.acceptAssignment);
router.post('/:id/reject', authorize(UserRole.DRIVER), AssignmentController.rejectAssignment);

// Dispatcher/Owner routes
router.get('/', authorize(UserRole.OWNER, UserRole.DISPATCHER), AssignmentController.getAllAssignments);
router.get('/:id', AssignmentController.getAssignment);

export default router;
