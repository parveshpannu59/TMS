import { body, ValidationChain } from 'express-validator';

export class AuthValidator {
  /**
   * Login validation rules
   * - Email: required, valid format, no leading/trailing spaces
   * - Password: required, minimum 6 characters, no leading/trailing spaces
   */
  static login(): ValidationChain[] {
    return [
      body('email')
        .trim()
        .notEmpty()
        .withMessage('Email address is required')
        .isEmail()
        .withMessage('Please enter a valid email address')
        .normalizeEmail()
        .custom((value) => {
          // Verify no spaces remain after trim (edge case)
          if (value.includes(' ')) {
            throw new Error('Email cannot contain spaces');
          }
          return true;
        }),
      body('password')
        .trim()
        .notEmpty()
        .withMessage('Password is required')
        .isLength({ min: 6 })
        .withMessage('Password must be at least 6 characters long')
        .custom((value) => {
          // Verify no spaces remain after trim (edge case)
          if (value.includes(' ')) {
            throw new Error('Password cannot contain leading or trailing spaces');
          }
          return true;
        }),
    ];
  }
}