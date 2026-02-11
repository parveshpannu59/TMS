import { Request, Response } from 'express';
import { UserService } from '../services/user.service';
import { ApiResponse } from '../utils/ApiResponse';
import { asyncHandler } from '../utils/asyncHandler';
import { PaginationHelper } from '../utils/pagination';

export class UserController {
  static createUser = asyncHandler(async (req: Request, res: Response) => {
    // Set companyId from the creating user (owner's companyId or owner's own ID)
    const companyId = (req.user as any)?.companyId || req.user!.id;
    const userData = await UserService.createUser({ ...req.body, companyId });
    return ApiResponse.created(res, userData, 'User created successfully');
  });

  static getAllUsers = asyncHandler(async (req: Request, res: Response) => {
    const paginationOptions = PaginationHelper.parseOptions(req.query);
    const result = await UserService.getAllUsers(paginationOptions, req.query);
    return ApiResponse.success(res, result, 'Users retrieved successfully');
  });

  static getUserById = asyncHandler(async (req: Request, res: Response) => {
    const id = (Array.isArray(req.params.id) ? req.params.id[0] : req.params.id) as string;
    const user = await UserService.getUserById(id);
    return ApiResponse.success(res, user, 'User retrieved successfully');
  });

  static updateUser = asyncHandler(async (req: Request, res: Response) => {
    const id = (Array.isArray(req.params.id) ? req.params.id[0] : req.params.id) as string;
    const user = await UserService.updateUser(id, req.body);
    return ApiResponse.success(res, user, 'User updated successfully');
  });

  static changePassword = asyncHandler(async (req: Request, res: Response) => {
    const id = (Array.isArray(req.params.id) ? req.params.id[0] : req.params.id) as string;
    const result = await UserService.changePassword(id, req.body);
    return ApiResponse.success(res, result, 'Password changed successfully');
  });

  static deleteUser = asyncHandler(async (req: Request, res: Response) => {
    const id = (Array.isArray(req.params.id) ? req.params.id[0] : req.params.id) as string;
    const result = await UserService.deleteUser(id);
    return ApiResponse.success(res, result, 'User deleted successfully');
  });

  static getUserStats = asyncHandler(async (_req: Request, res: Response) => {
    const stats = await UserService.getUserStats();
    return ApiResponse.success(res, stats, 'User stats retrieved successfully');
  });
}