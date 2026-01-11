import { Request, Response, NextFunction } from 'express';
import { ApiError } from '../utils/ApiError';
import { config } from '../config/env';

export const errorHandler = (
  err: Error | ApiError,
  _req: Request,
  res: Response,
  _next: NextFunction
) => {
  let statusCode = 500;
  let message = 'Internal Server Error';
  let error = err.message;

  if (err instanceof ApiError) {
    statusCode = err.statusCode;
    message = err.message;
  }

  // Mongoose duplicate key error
  if (err.name === 'MongoServerError' && (err as any).code === 11000) {
    statusCode = 400;
    const field = Object.keys((err as any).keyPattern)[0];
    message = `${field.charAt(0).toUpperCase() + field.slice(1)} already exists`;
  }

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    statusCode = 400;
    message = Object.values((err as any).errors)
      .map((e: any) => e.message)
      .join(', ');
  }

  // Mongoose cast error
  if (err.name === 'CastError') {
    statusCode = 400;
    message = 'Invalid ID format';
  }

  // Log error in development
  if (config.nodeEnv === 'development') {
    console.error('❌ Error:', err);
  }

  res.status(statusCode).json({
    success: false,
    message,
    error: config.nodeEnv === 'development' ? error : undefined,
    stack: config.nodeEnv === 'development' ? err.stack : undefined,
  });
};

export const notFound = (_req: Request, _res: Response, next: NextFunction) => {
  next(ApiError.notFound('Route not found'));
};