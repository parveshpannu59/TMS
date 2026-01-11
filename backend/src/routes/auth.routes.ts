import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller';
import { AuthValidator } from '../validators/auth.validator';
import { handleValidationErrors } from '../middleware/validation.middleware';
import { authenticate, optionalAuth } from '../middleware/auth.middleware';

const router = Router();

// POST /api/auth/login
router.post('/login', AuthValidator.login(), handleValidationErrors, AuthController.login);

// GET /api/auth/verify (Protected)
router.get('/verify', authenticate, AuthController.verifyAuth);

// POST /api/auth/logout (Optional authentication - token not required)
router.post('/logout', optionalAuth, AuthController.logout);

export default router;