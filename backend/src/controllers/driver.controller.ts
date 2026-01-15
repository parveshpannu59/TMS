import { Request, Response } from 'express';
import { DriverService } from '../services/driver.service';
import { ApiResponse } from '../utils/ApiResponse';
import { asyncHandler } from '../utils/asyncHandler';

export class DriverController {
  static createDriver = asyncHandler(async (req: Request, res: Response) => {
    const userId = (req as any).user.id;
    const driver = await DriverService.createDriver(req.body, userId);
    return ApiResponse.created(res, driver, 'Driver created successfully');
  });

  static getAllDrivers = asyncHandler(async (_req: Request, res: Response) => {
    const drivers = await DriverService.getAllDrivers();
    return ApiResponse.success(res, drivers, 'Drivers retrieved successfully');
  });

  static getAvailableDrivers = asyncHandler(async (_req: Request, res: Response) => {
    const drivers = await DriverService.getAvailableDrivers();
    return ApiResponse.success(res, drivers, 'Available drivers retrieved successfully');
  });

  static getDriverById = asyncHandler(async (req: Request, res: Response) => {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const driver = await DriverService.getDriverById(id);
    return ApiResponse.success(res, driver, 'Driver retrieved successfully');
  });

  static updateDriver = asyncHandler(async (req: Request, res: Response) => {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const driver = await DriverService.updateDriver(id, req.body);
    return ApiResponse.success(res, driver, 'Driver updated successfully');
  });

  static deleteDriver = asyncHandler(async (req: Request, res: Response) => {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const result = await DriverService.deleteDriver(id);
    return ApiResponse.success(res, result, 'Driver deleted successfully');
  });

  static getDriverStats = asyncHandler(async (_req: Request, res: Response) => {
    const stats = await DriverService.getDriverStats();
    return ApiResponse.success(res, stats, 'Driver statistics retrieved successfully');
  });
}
