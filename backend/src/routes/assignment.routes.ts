import express, { Router } from 'express';
import { AssignmentController } from '../controllers/assignment.controller';
import { authenticate } from '../middleware/auth.middleware';

const router: Router = express.Router();

// Driver routes (requires auth)
router.get('/me/pending', authenticate, AssignmentController.getPendingAssignments);
router.get('/me', authenticate, AssignmentController.getMyAssignments);
router.get('/:id', authenticate, AssignmentController.getAssignment);

// Driver actions
router.post('/:id/accept', authenticate, AssignmentController.acceptAssignment);
router.post('/:id/reject', authenticate, AssignmentController.rejectAssignment);

// Dispatcher/Owner routes
router.get('/', authenticate, AssignmentController.getAllAssignments);

export default router;
