import { Request, Response } from 'express';
import Trailer from '../models/Trailer';
import { ApiResponse } from '../utils/ApiResponse';
import { asyncHandler } from '../utils/asyncHandler';
import { ApiError } from '../utils/ApiError';
import { PaginationHelper } from '../utils/pagination';

export class TrailerController {
  // Get all trailers
  static getTrailers = asyncHandler(async (req: Request, res: Response) => {
    const companyId = req.user?.companyId ?? req.user?.id;
    const { status, type, page = 1, limit = 20, sortBy = 'unitNumber', sortOrder = 'asc' } = req.query;
    
    const query: any = { companyId };
    if (status) query.status = status;
    if (type) query.type = type;
    
    const skip = (Number(page) - 1) * Number(limit);
    const sort: any = { [sortBy as string]: sortOrder === 'asc' ? 1 : -1 };
    
    const [trailers, total] = await Promise.all([
      Trailer.find(query)
        .populate('currentLoadId', 'loadNumber status')
        .populate('currentTruckId', 'unitNumber')
        .sort(sort)
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      Trailer.countDocuments(query),
    ]);
    
    const result = PaginationHelper.createResponse(trailers, total, Number(page), Number(limit));
    return ApiResponse.success(res, result, 'Trailers fetched successfully');
  });

  // Get single trailer
  static getTrailerById = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const companyId = req.user?.companyId ?? req.user?.id;
    
    const trailer = await Trailer.findOne({ _id: id, companyId })
      .populate('currentLoadId', 'loadNumber status origin destination')
      .populate('currentTruckId', 'unitNumber make model')
      .lean();
    
    if (!trailer) {
      throw ApiError.notFound('Trailer not found');
    }
    
    return ApiResponse.success(res, trailer, 'Trailer fetched successfully');
  });

  // Create trailer
  static createTrailer = asyncHandler(async (req: Request, res: Response) => {
    const companyId = req.user?.companyId ?? req.user?.id;
    
    // Check if unit number already exists
    const existingTrailer = await Trailer.findOne({
      companyId,
      unitNumber: req.body.unitNumber,
    });
    
    if (existingTrailer) {
      throw ApiError.badRequest('Trailer with this unit number already exists');
    }
    
    const trailer = await Trailer.create({
      ...req.body,
      companyId,
    });
    
    return ApiResponse.success(res, trailer, 'Trailer created successfully', 201);
  });

  // Update trailer
  static updateTrailer = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const companyId = req.user?.companyId ?? req.user?.id;
    
    const trailer = await Trailer.findOne({ _id: id, companyId });
    
    if (!trailer) {
      throw ApiError.notFound('Trailer not found');
    }
    
    // Don't allow updating companyId
    const { companyId: _, ...updateData } = req.body;
    
    Object.assign(trailer, updateData);
    await trailer.save();
    
    return ApiResponse.success(res, trailer, 'Trailer updated successfully');
  });

  // Delete trailer
  static deleteTrailer = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const companyId = req.user?.companyId ?? req.user?.id;
    
    const trailer = await Trailer.findOne({ _id: id, companyId });
    
    if (!trailer) {
      throw ApiError.notFound('Trailer not found');
    }
    
    // Don't allow deletion if trailer is on a load
    if (trailer.currentLoadId) {
      throw ApiError.badRequest('Cannot delete trailer that is currently assigned to a load');
    }
    
    await trailer.deleteOne();
    
    return ApiResponse.success(res, null, 'Trailer deleted successfully');
  });
}
