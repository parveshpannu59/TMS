import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import { ApiError } from '../utils/ApiError';

export const handleValidationErrors = (req: Request, _res: Response, next: NextFunction) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map((error) => error.msg);
    throw ApiError.badRequest(errorMessages.join(', '));
  }

  next();
};