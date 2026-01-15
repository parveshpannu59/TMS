import { Request, Response } from 'express';
import Driver from '../models/Driver';
import { User } from '../models/User.model';
import { ApiResponse } from '../utils/ApiResponse';
import { asyncHandler } from '../utils/asyncHandler';
import { ApiError } from '../utils/ApiError';
import { UserRole } from '../types/auth.types';
import { PaginationHelper } from '../utils/pagination';

export class DriverController {
  // Get all drivers
  static getDrivers = asyncHandler(async (req: Request, res: Response) => {
    const companyId = req.user?.companyId ?? req.user?.id;
    const { status, page = 1, limit = 20, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;
    
    const query: any = { companyId };
    if (status) query.status = status;
    
    const skip = (Number(page) - 1) * Number(limit);
    const sort: any = { [sortBy as string]: sortOrder === 'asc' ? 1 : -1 };
    
    const [drivers, total] = await Promise.all([
      Driver.find(query)
        .populate('userId', 'name email phone')
        .populate('currentLoadId', 'loadNumber status origin destination')
        .sort(sort)
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      Driver.countDocuments(query),
    ]);
    
    const result = PaginationHelper.createResponse(drivers, total, Number(page), Number(limit));
    return ApiResponse.success(res, result, 'Drivers fetched successfully');
  });

  // Get single driver
  static getDriverById = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const companyId = req.user?.companyId ?? req.user?.id;
    
    const driver = await Driver.findOne({ _id: id, companyId })
      .populate('userId', 'name email phone status')
      .populate('currentLoadId', 'loadNumber status origin destination pickupDate deliveryDate')
      .lean();
    
    if (!driver) {
      throw ApiError.notFound('Driver not found');
    }
    
    return ApiResponse.success(res, driver, 'Driver fetched successfully');
  });

  // Create driver
  static createDriver = asyncHandler(async (req: Request, res: Response) => {
    const companyId = req.user?.companyId ?? req.user?.id;
    const { userId, licenseNumber, licenseExpiry } = req.body;
    
    // Verify user exists and is a driver
    const user = await User.findOne({ _id: userId, role: UserRole.DRIVER });
    
    if (!user) {
      throw ApiError.notFound('User not found or is not a driver');
    }
    
    // Check if driver profile already exists for this user
    const existingDriver = await Driver.findOne({ userId });
    
    if (existingDriver) {
      throw ApiError.badRequest('Driver profile already exists for this user');
    }
    
    const driver = await Driver.create({
      userId,
      companyId,
      licenseNumber,
      licenseExpiry,
      status: 'off_duty',
    });
    
    return ApiResponse.success(res, driver, 'Driver created successfully', 201);
  });

  // Update driver
  static updateDriver = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const companyId = req.user?.companyId ?? req.user?.id;
    
    const driver = await Driver.findOne({ _id: id, companyId });
    
    if (!driver) {
      throw ApiError.notFound('Driver not found');
    }
    
    // Don't allow updating userId or companyId
    const { userId: _, companyId: __, ...updateData } = req.body;
    
    Object.assign(driver, updateData);
    await driver.save();
    
    return ApiResponse.success(res, driver, 'Driver updated successfully');
  });

  // Delete driver
  static deleteDriver = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const companyId = req.user?.companyId ?? req.user?.id;
    
    const driver = await Driver.findOne({ _id: id, companyId });
    
    if (!driver) {
      throw ApiError.notFound('Driver not found');
    }
    
    // Don't allow deletion if driver is on a load
    if (driver.currentLoadId) {
      throw ApiError.badRequest('Cannot delete driver that is currently assigned to a load');
    }
    
    await driver.deleteOne();
    
    return ApiResponse.success(res, null, 'Driver deleted successfully');
  });
}
