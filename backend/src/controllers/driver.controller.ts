import { Request, Response } from 'express';
import { DriverService } from '../services/driver.service';
import { ApiResponse } from '../utils/ApiResponse';
import { asyncHandler } from '../utils/asyncHandler';

export class DriverController {
  // Get all drivers
  static getDrivers = asyncHandler(async (_req: Request, res: Response) => {
    const drivers = await DriverService.getAllDrivers();
    return ApiResponse.success(res, drivers, 'Drivers fetched successfully');
  });

  // Get driver profile for current user (for driver login)
  static getMyProfile = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const driver = await DriverService.getDriverByUserId(userId);
    return ApiResponse.success(res, driver, 'Driver profile fetched successfully');
  });

  // Get single driver
  static getDriverById = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const driver = await DriverService.getDriverById(id as string);
    return ApiResponse.success(res, driver, 'Driver fetched successfully');
  });

  // Create driver
  static createDriver = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const driver = await DriverService.createDriver(req.body, userId);
    return ApiResponse.success(res, driver, 'Driver created successfully', 201);
  });

  // Update driver
  static updateDriver = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const driver = await DriverService.updateDriver(id as string, req.body);
    return ApiResponse.success(res, driver, 'Driver updated successfully');
  });

  // Delete driver
  static deleteDriver = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    await DriverService.deleteDriver(id as string);
    return ApiResponse.success(res, null, 'Driver deleted successfully');
  });

  // Upload driver photo
  static uploadPhoto = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    if (!req.file) {
      return ApiResponse.error(res, 'No file uploaded', 400);
    }
    const filePath = `/uploads/drivers/${req.file.filename}`;
    const driver = await DriverService.updateDriverDocument(id as string, 'photo', filePath);
    return ApiResponse.success(res, driver, 'Driver photo uploaded successfully');
  });

  // Upload driver verification document (license, aadhar, pan)
  static uploadDocument = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { type } = req.body; // 'license', 'aadhar', 'pan', or 'other'
    
    if (!req.file) {
      return ApiResponse.error(res, 'No file uploaded', 400);
    }
    
    if (!type || !['license', 'aadhar', 'pan', 'other'].includes(type)) {
      return ApiResponse.error(res, 'Invalid document type', 400);
    }
    
    const filePath = `/uploads/drivers/${req.file.filename}`;
    const driver = await DriverService.updateDriverDocument(id as string, type, filePath);
    return ApiResponse.success(res, driver, `Driver ${type} uploaded successfully`);
  });
}
