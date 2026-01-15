import { Request, Response } from 'express';
import { TruckService } from '../services/truck.service';
import { ApiResponse } from '../utils/ApiResponse';
import { asyncHandler } from '../utils/asyncHandler';

// TRUCK CONTROLLER
export class TruckController {
  static createTruck = asyncHandler(async (req: Request, res: Response) => {
    const userId = (req as any).user.id;
    const truck = await TruckService.createTruck(req.body, userId);
    return ApiResponse.created(res, truck, 'Truck created successfully');
  });

  static getAllTrucks = asyncHandler(async (_req: Request, res: Response) => {
    const trucks = await TruckService.getAllTrucks();
    return ApiResponse.success(res, trucks, 'Trucks retrieved successfully');
  });

  static getAvailableTrucks = asyncHandler(async (_req: Request, res: Response) => {
    const trucks = await TruckService.getAvailableTrucks();
    return ApiResponse.success(res, trucks, 'Available trucks retrieved successfully');
  });

  static getTruckById = asyncHandler(async (req: Request, res: Response) => {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const truck = await TruckService.getTruckById(id);
    return ApiResponse.success(res, truck, 'Truck retrieved successfully');
  });

  static updateTruck = asyncHandler(async (req: Request, res: Response) => {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const truck = await TruckService.updateTruck(id, req.body);
    return ApiResponse.success(res, truck, 'Truck updated successfully');
  });

  static deleteTruck = asyncHandler(async (req: Request, res: Response) => {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const result = await TruckService.deleteTruck(id);
    return ApiResponse.success(res, result, 'Truck deleted successfully');
  });

  static getTruckStats = asyncHandler(async (_req: Request, res: Response) => {
    const stats = await TruckService.getTruckStats();
    return ApiResponse.success(res, stats, 'Truck statistics retrieved successfully');
  });
}