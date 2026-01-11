import { Router } from 'express';
import { UserController } from '../controllers/user.controller';
import { UserValidator } from '../validators/user.validator';
import { handleValidationErrors } from '../middleware/validation.middleware';
import { authenticate, authorize } from '../middleware/auth.middleware';
import { UserRole } from '../types/auth.types';

const router = Router();

router.use(authenticate);

router.get('/stats', authorize(UserRole.OWNER), UserController.getUserStats);

router.post(
  '/',
  authorize(UserRole.OWNER),
  UserValidator.createUser(),
  handleValidationErrors,
  UserController.createUser
);

router.get('/', authorize(UserRole.OWNER, UserRole.DISPATCHER), UserController.getAllUsers);

router.get('/:id', authorize(UserRole.OWNER, UserRole.DISPATCHER), UserController.getUserById);

router.put(
  '/:id',
  authorize(UserRole.OWNER),
  UserValidator.updateUser(),
  handleValidationErrors,
  UserController.updateUser
);

router.patch(
  '/:id/password',
  authorize(UserRole.OWNER),
  UserValidator.changePassword(),
  handleValidationErrors,
  UserController.changePassword
);

router.delete('/:id', authorize(UserRole.OWNER), UserController.deleteUser);

export default router;