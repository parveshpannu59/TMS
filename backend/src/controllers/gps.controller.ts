import { Request, Response } from 'express';
import { GPSService } from '../services/gps.service';
import { ApiResponse } from '../utils/ApiResponse';
import { asyncHandler } from '../utils/asyncHandler';

export class GPSController {
  static updateLocation = asyncHandler(async (req: Request, res: Response) => {
    const { loadId, lat, lng, speed, heading } = req.body;
    const result = await GPSService.updateLocation(loadId, { lat, lng, speed, heading });
    return ApiResponse.success(res, result, result.message);
  });

  static getCurrentLocation = asyncHandler(async (req: Request, res: Response) => {
    const loadId = Array.isArray(req.params.loadId) ? req.params.loadId[0] : req.params.loadId;
    const location = await GPSService.getCurrentLocation(loadId);
    return ApiResponse.success(res, location, 'Location retrieved successfully');
  });

  static getLocationHistory = asyncHandler(async (req: Request, res: Response) => {
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 100;
    const loadId = Array.isArray(req.params.loadId) ? req.params.loadId[0] : req.params.loadId;
    const history = await GPSService.getLocationHistory(loadId, limit);
    return ApiResponse.success(res, history, 'Location history retrieved successfully');
  });

  static getRouteData = asyncHandler(async (req: Request, res: Response) => {
    const loadId = Array.isArray(req.params.loadId) ? req.params.loadId[0] : req.params.loadId;
    const routeData = await GPSService.getRouteData(loadId);
    return ApiResponse.success(res, routeData, 'Route data retrieved successfully');
  });

  static startTracking = asyncHandler(async (req: Request, res: Response) => {
    const loadId = Array.isArray(req.params.loadId) ? req.params.loadId[0] : req.params.loadId;
    await GPSService.startTracking(loadId);
    return ApiResponse.success(res, {}, 'Tracking started successfully');
  });

  static stopTracking = asyncHandler(async (req: Request, res: Response) => {
    const loadId = Array.isArray(req.params.loadId) ? req.params.loadId[0] : req.params.loadId;
    await GPSService.stopTracking(loadId);
    return ApiResponse.success(res, {}, 'Tracking stopped successfully');
  });

  static getActiveTrackedLoads = asyncHandler(async (_req: Request, res: Response) => {
    const loads = await GPSService.getActiveTrackedLoads();
    return ApiResponse.success(res, loads, 'Active tracked loads retrieved successfully');
  });

  static checkGPSStatus = asyncHandler(async (_req: Request, res: Response) => {
    const isEnabled = GPSService.isEnabled();
    return ApiResponse.success(
      res,
      { enabled: isEnabled },
      isEnabled ? 'GPS tracking is enabled' : 'GPS tracking is disabled'
    );
  });
}