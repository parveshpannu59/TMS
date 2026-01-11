import { Request, Response, NextFunction } from 'express';
import { TokenService } from '../services/token.service';
import { ApiError } from '../utils/ApiError';
import { asyncHandler } from '../utils/asyncHandler';
import { UserRole } from '../types/auth.types';

export const authenticate = asyncHandler(
  async (req: Request, _res: Response, next: NextFunction) => {
    const token = TokenService.extractTokenFromHeader(req.headers.authorization);
    const decoded = TokenService.verifyToken(token);

    (req as any).user = {
      id: decoded.id,
      email: decoded.email,
      role: decoded.role,
    };

    next();
  }
);

// Optional authentication - doesn't fail if token is missing
export const optionalAuth = asyncHandler(
  async (req: Request, _res: Response, next: NextFunction) => {
    try {
      const token = TokenService.extractTokenFromHeader(req.headers.authorization);
      const decoded = TokenService.verifyToken(token);

      (req as any).user = {
        id: decoded.id,
        email: decoded.email,
        role: decoded.role,
      };
    } catch (error) {
      // Continue without user - token is optional
    }

    next();
  }
);

export const authorize = (...roles: UserRole[]) => {
  return (req: Request, _res: Response, next: NextFunction) => {
    const user = (req as any).user;
    
    if (!user) {
      throw ApiError.unauthorized('Authentication required');
    }

    if (!roles.includes(user.role)) {
      throw ApiError.forbidden('You do not have permission to access this resource');
    }

    next();
  };
};