import { Request, Response } from 'express';
import { LoadService } from '../services/load.service';
import { ApiResponse } from '../utils/ApiResponse';
import { asyncHandler } from '../utils/asyncHandler';

export class LoadController {
  static createLoad = asyncHandler(async (req: Request, res: Response) => {
    const userId = (req as any).user.id;
    const load = await LoadService.createLoad(req.body, userId);
    return ApiResponse.created(res, load, 'Load created successfully');
  });

  static getAllLoads = asyncHandler(async (req: Request, res: Response) => {
    const userId = (req as any).user.id;
    const userRole = (req as any).user.role;
    const loads = await LoadService.getAllLoads(userId, userRole);
    return ApiResponse.success(res, loads, 'Loads retrieved successfully');
  });

  static getLoadById = asyncHandler(async (req: Request, res: Response) => {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const load = await LoadService.getLoadById(id);
    return ApiResponse.success(res, load, 'Load retrieved successfully');
  });

  static updateLoad = asyncHandler(async (req: Request, res: Response) => {
    const userId = (req as any).user.id;
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const load = await LoadService.updateLoad(id, req.body, userId);
    return ApiResponse.success(res, load, 'Load updated successfully');
  });

  static updateLoadStatus = asyncHandler(async (req: Request, res: Response) => {
    const userId = (req as any).user.id;
    const { status, notes } = req.body;
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const load = await LoadService.updateLoadStatus(id, status, userId, notes);
    return ApiResponse.success(res, load, 'Load status updated successfully');
  });

  static deleteLoad = asyncHandler(async (req: Request, res: Response) => {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const result = await LoadService.deleteLoad(id);
    return ApiResponse.success(res, result, 'Load deleted successfully');
  });

  static getLoadStats = asyncHandler(async (_req: Request, res: Response) => {
    const stats = await LoadService.getLoadStats();
    return ApiResponse.success(res, stats, 'Load statistics retrieved successfully');
  });
}