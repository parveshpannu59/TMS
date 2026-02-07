import { Request, Response } from 'express';
import { Vehicle, VehicleStatus } from '../models/Vehicle.model';
import { ApiError } from '../utils/ApiError';
import { asyncHandler } from '../utils/asyncHandler';
import { ApiResponse } from '../utils/ApiResponse';

/**
 * @desc Get all vehicles (trucks + trailers)
 * @route GET /api/vehicles
 * @access Private
 */
export const getVehicles = asyncHandler(async (req: Request, res: Response) => {
  const { status, vehicleType } = req.query;
  const companyId = (req as any).user?.companyId || (req as any).user?.id;

  const query: any = { companyId };
  if (status) query.status = status;
  if (vehicleType) query.vehicleType = vehicleType;

  const vehicles = await Vehicle.find(query).sort({ createdAt: -1 });

  return ApiResponse.success(res, vehicles, 'Vehicles fetched successfully');
});

/**
 * @desc Get vehicle stats (for dashboard)
 * @route GET /api/vehicles/stats
 * @access Private
 */
export const getVehicleStats = asyncHandler(async (req: Request, res: Response) => {
  const companyId = (req as any).user?.companyId || (req as any).user?.id;

  const [available, assigned, outForDelivery, totalActive] = await Promise.all([
    Vehicle.countDocuments({ companyId, status: VehicleStatus.AVAILABLE }),
    Vehicle.countDocuments({ companyId, status: VehicleStatus.ASSIGNED }),
    Vehicle.countDocuments({ companyId, status: VehicleStatus.OUT_FOR_DELIVERY }),
    Vehicle.countDocuments({ 
      companyId, 
      status: { $in: [VehicleStatus.AVAILABLE, VehicleStatus.ASSIGNED, VehicleStatus.OUT_FOR_DELIVERY, VehicleStatus.ON_ROAD] } 
    }),
  ]);

  return ApiResponse.success(res, {
    available,
    assigned,
    outForDelivery,
    totalActive,
  }, 'Vehicle stats fetched successfully');
});

/**
 * @desc Get vehicles by status and type (for dashboard dialog)
 * @route GET /api/vehicles/by-status
 * @access Private
 */
export const getVehiclesByStatus = asyncHandler(async (req: Request, res: Response) => {
  const { status, vehicleType } = req.query;
  const companyId = (req as any).user?.companyId || (req as any).user?.id;

  const query: any = { companyId };
  if (status) {
    if (status === 'available') {
      query.status = VehicleStatus.AVAILABLE;
    } else if (status === 'assigned') {
      query.status = { $in: [VehicleStatus.ASSIGNED, VehicleStatus.OUT_FOR_DELIVERY, VehicleStatus.ON_ROAD] };
    }
  }
  if (vehicleType) query.vehicleType = vehicleType;

  const vehicles = await Vehicle.find(query)
    .populate('currentDriverId', 'name phone')
    .populate('currentLoadId', 'loadNumber status')
    .sort({ createdAt: -1 });

  // Add shipment count for assigned vehicles
  const vehiclesWithCount = vehicles.map(v => {
    const vehicle = v.toObject();
    if (vehicle.currentLoadId) {
      (vehicle as any).shipmentCount = 1; // Can be enhanced to count all loads
    }
    return vehicle;
  });

  return ApiResponse.success(res, vehiclesWithCount, 'Vehicles fetched successfully');
});

/**
 * @desc Get single vehicle by ID
 * @route GET /api/vehicles/:id
 * @access Private
 */
export const getVehicleById = asyncHandler(async (req: Request, res: Response) => {
  const vehicle = await Vehicle.findById(req.params.id)
    .populate('currentDriverId', 'name phone email')
    .populate('currentLoadId', 'loadNumber status pickupLocation deliveryLocation');

  if (!vehicle) {
    throw ApiError.notFound('Vehicle not found');
  }

  return ApiResponse.success(res, vehicle, 'Vehicle fetched successfully');
});

/**
 * @desc Create new vehicle
 * @route POST /api/vehicles
 * @access Private
 */
export const createVehicle = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).user?.id;
  const companyId = (req as any).user?.companyId || userId;

  // Clean up the data - remove empty strings for optional enum fields
  const cleanedBody = { ...req.body };
  if (cleanedBody.trailerType === '' || cleanedBody.trailerType === null) {
    delete cleanedBody.trailerType;
  }

  const vehicleData = {
    ...cleanedBody,
    companyId,
    createdBy: userId?.toString(),
  };

  // Check if VIN already exists
  const existingVehicle = await Vehicle.findOne({ vin: req.body.vin });
  if (existingVehicle) {
    throw ApiError.badRequest('Vehicle with this VIN already exists');
  }

  const vehicle = await Vehicle.create(vehicleData);

  return ApiResponse.success(res, vehicle, 'Vehicle created successfully', 201);
});

/**
 * @desc Update vehicle
 * @route PUT /api/vehicles/:id
 * @access Private
 */
export const updateVehicle = asyncHandler(async (req: Request, res: Response) => {
  const vehicle = await Vehicle.findById(req.params.id);

  if (!vehicle) {
    throw ApiError.notFound('Vehicle not found');
  }

  // Check VIN uniqueness if being updated
  if (req.body.vin && req.body.vin !== vehicle.vin) {
    const existingVehicle = await Vehicle.findOne({ 
      vin: req.body.vin,
      _id: { $ne: vehicle._id } // Exclude current vehicle using its ObjectId
    });
    if (existingVehicle) {
      throw ApiError.badRequest('Vehicle with this VIN already exists');
    }
  }

  // Clean up the data - remove empty strings for optional enum fields
  const cleanedBody = { ...req.body };
  if (cleanedBody.trailerType === '' || cleanedBody.trailerType === null) {
    delete cleanedBody.trailerType;
  }

  Object.assign(vehicle, cleanedBody);
  await vehicle.save();

  return ApiResponse.success(res, vehicle, 'Vehicle updated successfully');
});

/**
 * @desc Delete vehicle
 * @route DELETE /api/vehicles/:id
 * @access Private
 */
export const deleteVehicle = asyncHandler(async (req: Request, res: Response) => {
  const vehicle = await Vehicle.findById(req.params.id);

  if (!vehicle) {
    throw ApiError.notFound('Vehicle not found');
  }

  // Check if vehicle is assigned to a load
  if (vehicle.currentLoadId) {
    throw ApiError.badRequest('Cannot delete vehicle that is assigned to a load');
  }

  await vehicle.deleteOne();

  return ApiResponse.success(res, null, 'Vehicle deleted successfully');
});

/**
 * @desc Upload vehicle image
 * @route POST /api/vehicles/:id/upload-image
 * @access Private
 */
export const uploadVehicleImage = asyncHandler(async (req: Request, res: Response) => {
  const vehicle = await Vehicle.findById(req.params.id);

  if (!vehicle) {
    throw ApiError.notFound('Vehicle not found');
  }

  if (!req.file) {
    throw ApiError.badRequest('No file uploaded');
  }

  const imageUrl = `/uploads/vehicles/${req.file.filename}`;
  vehicle.vehicleImage = imageUrl;
  await vehicle.save();

  return ApiResponse.success(res, { url: imageUrl }, 'Vehicle image uploaded successfully');
});

/**
 * @desc Upload vehicle document
 * @route POST /api/vehicles/:id/upload-document
 * @access Private
 */
export const uploadVehicleDocument = asyncHandler(async (req: Request, res: Response) => {
  const vehicle = await Vehicle.findById(req.params.id);

  if (!vehicle) {
    throw ApiError.notFound('Vehicle not found');
  }

  if (!req.file) {
    throw ApiError.badRequest('No file uploaded');
  }

  const { documentType } = req.body; // registration, insurance, permit, fitness, pollution, other

  const documentUrl = `/uploads/vehicles/${req.file.filename}`;

  if (documentType === 'other') {
    vehicle.documents.others.push(documentUrl);
  } else if (['registration', 'insurance', 'permit', 'fitness', 'pollution'].includes(documentType)) {
    (vehicle.documents as any)[documentType] = documentUrl;
  } else {
    throw ApiError.badRequest('Invalid document type');
  }

  await vehicle.save();

  return ApiResponse.success(res, { url: documentUrl }, 'Vehicle document uploaded successfully');
});
