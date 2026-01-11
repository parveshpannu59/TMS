import { Request, Response } from 'express';
import { AuthService } from '../services/auth.service';
import { ApiResponse } from '../utils/ApiResponse';
import { asyncHandler } from '../utils/asyncHandler';

export class AuthController {
  static login = asyncHandler(async (req: Request, res: Response) => {
    const authData = await AuthService.login(req.body);
    return ApiResponse.success(res, authData, 'Login successful');
  });

  static verifyAuth = asyncHandler(async (req: Request, res: Response) => {
    const user = (req as any).user;
    
    if (!user) {
      return ApiResponse.error(res, 'User not authenticated', 401);
    }

    const userData = await AuthService.verifyUser(user.id);
    return ApiResponse.success(res, userData, 'Authentication verified');
  });

  static logout = asyncHandler(async (_req: Request, res: Response) => {
    return ApiResponse.success(res, null, 'Logout successful');
  });
}