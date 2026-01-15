import { Request, Response } from 'express';
import Truck from '../models/Truck';
import { ApiResponse } from '../utils/ApiResponse';
import { asyncHandler } from '../utils/asyncHandler';
import { ApiError } from '../utils/ApiError';
import { PaginationHelper } from '../utils/pagination';

export class TruckController {
  // Get all trucks
  static getTrucks = asyncHandler(async (req: Request, res: Response) => {
    const companyId = req.user?.companyId ?? req.user?.id;
    const { status, page = 1, limit = 20, sortBy = 'unitNumber', sortOrder = 'asc' } = req.query;
    
    const query: any = { companyId };
    if (status) query.status = status;
    
    const skip = (Number(page) - 1) * Number(limit);
    const sort: any = { [sortBy as string]: sortOrder === 'asc' ? 1 : -1 };
    
    const [trucks, total] = await Promise.all([
      Truck.find(query)
        .populate('currentLoadId', 'loadNumber status')
        .populate('currentDriverId', 'name')
        .sort(sort)
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      Truck.countDocuments(query),
    ]);
    
    const result = PaginationHelper.createResponse(trucks, total, Number(page), Number(limit));
    return ApiResponse.success(res, result, 'Trucks fetched successfully');
  });

  // Get single truck
  static getTruckById = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const companyId = req.user?.companyId ?? req.user?.id;
    
    const truck = await Truck.findOne({ _id: id, companyId })
      .populate('currentLoadId', 'loadNumber status origin destination')
      .populate('currentDriverId', 'name email phone')
      .lean();
    
    if (!truck) {
      throw ApiError.notFound('Truck not found');
    }
    
    return ApiResponse.success(res, truck, 'Truck fetched successfully');
  });

  // Create truck
  static createTruck = asyncHandler(async (req: Request, res: Response) => {
    const companyId = req.user?.companyId ?? req.user?.id;
    
    // Check if unit number already exists
    const existingTruck = await Truck.findOne({
      companyId,
      unitNumber: req.body.unitNumber,
    });
    
    if (existingTruck) {
      throw ApiError.badRequest('Truck with this unit number already exists');
    }
    
    const truck = await Truck.create({
      ...req.body,
      companyId,
    });
    
    return ApiResponse.success(res, truck, 'Truck created successfully', 201);
  });

  // Update truck
  static updateTruck = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const companyId = req.user?.companyId ?? req.user?.id;
    
    const truck = await Truck.findOne({ _id: id, companyId });
    
    if (!truck) {
      throw ApiError.notFound('Truck not found');
    }
    
    // Don't allow updating companyId
    const { companyId: _, ...updateData } = req.body;
    
    Object.assign(truck, updateData);
    await truck.save();
    
    return ApiResponse.success(res, truck, 'Truck updated successfully');
  });

  // Delete truck
  static deleteTruck = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const companyId = req.user?.companyId ?? req.user?.id;
    
    const truck = await Truck.findOne({ _id: id, companyId });
    
    if (!truck) {
      throw ApiError.notFound('Truck not found');
    }
    
    // Don't allow deletion if truck is on a load
    if (truck.currentLoadId) {
      throw ApiError.badRequest('Cannot delete truck that is currently assigned to a load');
    }
    
    await truck.deleteOne();
    
    return ApiResponse.success(res, null, 'Truck deleted successfully');
  });
}
