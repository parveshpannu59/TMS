import { body, ValidationChain } from 'express-validator';
import { UserRole } from '../types/auth.types';

export class UserValidator {
  static createUser(): ValidationChain[] {
    return [
      body('name')
        .trim()
        .notEmpty()
        .withMessage('Name is required')
        .isLength({ min: 2, max: 100 })
        .withMessage('Name must be between 2 and 100 characters'),
      body('email')
        .trim()
        .notEmpty()
        .withMessage('Email is required')
        .isEmail()
        .withMessage('Please provide a valid email')
        .normalizeEmail(),
      body('password')
        .trim()
        .notEmpty()
        .withMessage('Password is required')
        .isLength({ min: 6 })
        .withMessage('Password must be at least 6 characters'),
      body('role')
        .notEmpty()
        .withMessage('Role is required')
        .isIn(Object.values(UserRole))
        .withMessage('Invalid role'),
      body('phone')
        .optional()
        .trim()
        .matches(/^[0-9]{10}$/)
        .withMessage('Phone must be 10 digits'),
    ];
  }

  static updateUser(): ValidationChain[] {
    return [
      body('name')
        .optional()
        .trim()
        .isLength({ min: 2, max: 100 })
        .withMessage('Name must be between 2 and 100 characters'),
      body('email')
        .optional()
        .trim()
        .isEmail()
        .withMessage('Please provide a valid email')
        .normalizeEmail(),
      body('role')
        .optional()
        .isIn(Object.values(UserRole))
        .withMessage('Invalid role'),
      body('phone')
        .optional()
        .trim()
        .matches(/^[0-9]{10}$/)
        .withMessage('Phone must be 10 digits'),
      body('status')
        .optional()
        .isIn(['active', 'inactive'])
        .withMessage('Status must be active or inactive'),
    ];
  }

  static changePassword(): ValidationChain[] {
    return [
      body('newPassword')
        .trim()
        .notEmpty()
        .withMessage('New password is required')
        .isLength({ min: 6 })
        .withMessage('Password must be at least 6 characters'),
    ];
  }
}