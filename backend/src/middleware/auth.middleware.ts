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
      companyId: decoded.companyId,
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
        companyId: decoded.companyId,
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
      console.error('❌ No user found in request');
      throw ApiError.unauthorized('Authentication required');
    }

    // Debug logging
    console.log('🔐 Authorization Check:', {
      endpoint: req.method + ' ' + req.path,
      userRole: user.role,
      userRoleType: typeof user.role,
      allowedRoles: roles,
      isAuthorized: roles.includes(user.role),
      comparison: roles.map(r => ({ role: r, matches: r === user.role }))
    });

    if (!roles.includes(user.role)) {
      console.log('❌ Authorization FAILED - User role not in allowed roles');
      throw ApiError.forbidden('You do not have permission to access this resource');
    }

    console.log('✅ Authorization passed');
    next();
  };
};