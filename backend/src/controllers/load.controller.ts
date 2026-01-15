import { Request, Response } from 'express';
import Load from '../models/Load';
import Truck from '../models/Truck';
import Trailer from '../models/Trailer';
import Driver from '../models/Driver';
import { ApiResponse } from '../utils/ApiResponse';
import { asyncHandler } from '../utils/asyncHandler';
import { ApiError } from '../utils/ApiError';

export class LoadController {
  // Get all loads with filtering
  static getLoads = asyncHandler(async (req: Request, res: Response) => {
    const companyId = req.user?.companyId ?? req.user?.id;
    const {status, driverId, dateFrom, dateTo, page = 1, limit = 20} = req.query;
    
    const query: any = { companyId };
    
    if (status) query.status = status;
    if (driverId) query.driverId = driverId;
    if (dateFrom || dateTo) {
      query.pickupDate = {};
      if (dateFrom) query.pickupDate.$gte = new Date(dateFrom as string);
      if (dateTo) query.pickupDate.$lte = new Date(dateTo as string);
    }
    
    const skip = (Number(page) - 1) * Number(limit);
    
    const [loads, total] = await Promise.all([
      Load.find(query)
        .populate('driverId', 'name email')
        .populate('truckId', 'unitNumber make model')
        .populate('trailerId', 'unitNumber type')
        .populate('createdBy', 'name email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      Load.countDocuments(query),
    ]);
    
    return ApiResponse.success(res, {
      loads,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit)),
      },
    }, 'Loads fetched successfully');
  });

  // Get single load by ID
  static getLoadById = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const companyId = req.user?.companyId ?? req.user?.id;
    
    const load = await Load.findOne({ _id: id, companyId })
      .populate('driverId', 'name email phone')
      .populate('truckId', 'unitNumber make model year licensePlate')
      .populate('trailerId', 'unitNumber type licensePlate')
      .populate('createdBy', 'name email')
      .lean();
    
    if (!load) {
      throw ApiError.notFound('Load not found');
    }
    
    return ApiResponse.success(res, load, 'Load fetched successfully');
  });

  // Create new load
  static createLoad = asyncHandler(async (req: Request, res: Response) => {
    const companyId = req.user?.companyId ?? req.user?.id;
    const userId = req.user!.id;
    
    // Generate load number
    const lastLoad = await Load.findOne({ companyId })
      .sort({ createdAt: -1 })
      .select('loadNumber')
      .lean();
    
    let loadNumber = 'LOAD-1001';
    if (lastLoad && lastLoad.loadNumber) {
      const num = parseInt(lastLoad.loadNumber.split('-')[1]) + 1;
      loadNumber = `LOAD-${num}`;
    }
    
    const loadData = {
      ...req.body,
      loadNumber,
      companyId,
      createdBy: userId,
      statusHistory: [{
        status: 'booked',
        timestamp: new Date(),
        updatedBy: userId,
      }],
    };
    
    const load = await Load.create(loadData);
    
    return ApiResponse.success(res, load, 'Load created successfully', 201);
  });

  // Update load
  static updateLoad = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const companyId = req.user?.companyId ?? req.user?.id;
    const userId = req.user!.id;
    
    const load = await Load.findOne({ _id: id, companyId });
    
    if (!load) {
      throw ApiError.notFound('Load not found');
    }
    
    // Don't allow updating certain fields
    const { loadNumber, companyId: _, createdBy: __, ...updateData } = req.body;
    
    // If status is being updated, add to history
    if (updateData.status && updateData.status !== load.status) {
      load.statusHistory.push({
        status: updateData.status,
        timestamp: new Date(),
        updatedBy: userId,
      } as any);
    }
    
    Object.assign(load, updateData);
    await load.save();
    
    return ApiResponse.success(res, load, 'Load updated successfully');
  });

  // Assign load to driver, truck, and trailer
  static assignLoad = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { driverId, truckId, trailerId } = req.body;
    const companyId = req.user?.companyId ?? req.user?.id;
    const userId = req.user!.id;
    
    // Validate all three are provided (mandatory)
    if (!driverId || !truckId || !trailerId) {
      throw ApiError.badRequest('Driver, Truck, and Trailer are all required for assignment');
    }
    
    // Find the load
    const load = await Load.findOne({ _id: id, companyId });
    if (!load) {
      throw ApiError.notFound('Load not found');
    }
    
    // Validate driver, truck, and trailer exist and are available
    const [driver, truck, trailer] = await Promise.all([
      Driver.findOne({ _id: driverId, companyId }),
      Truck.findOne({ _id: truckId, companyId }),
      Trailer.findOne({ _id: trailerId, companyId }),
    ]);
    
    if (!driver) throw ApiError.notFound('Driver not found');
    if (!truck) throw ApiError.notFound('Truck not found');
    if (!trailer) throw ApiError.notFound('Trailer not found');
    
    // Check availability
    if (driver.status !== 'available' && driver.status !== 'off_duty') {
      throw ApiError.badRequest('Driver is not available');
    }
    if (truck.status !== 'available') {
      throw ApiError.badRequest('Truck is not available');
    }
    if (trailer.status !== 'available') {
      throw ApiError.badRequest('Trailer is not available');
    }
    
    // Assign the load
    load.driverId = driverId;
    load.truckId = truckId;
    load.trailerId = trailerId;
    load.status = 'assigned';
    load.assignedAt = new Date();
    load.statusHistory.push({
      status: 'assigned',
      timestamp: new Date(),
      notes: `Assigned to Driver: ${driver.userId}, Truck: ${truck.unitNumber}, Trailer: ${trailer.unitNumber}`,
      updatedBy: userId,
    } as any);
    
    // Update driver, truck, and trailer status
    driver.status = 'on_duty';
    driver.currentLoadId = load._id.toString();
    truck.status = 'on_road';
    truck.currentLoadId = load._id.toString();
    truck.currentDriverId = driverId;
    trailer.status = 'on_road';
    trailer.currentLoadId = load._id.toString();
    trailer.currentTruckId = truckId;
    
    await Promise.all([
      load.save(),
      driver.save(),
      truck.save(),
      trailer.save(),
    ]);
    
    return ApiResponse.success(res, load, 'Load assigned successfully');
  });

  // Update load status
  static updateStatus = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { status, notes, location } = req.body;
    const companyId = req.user?.companyId ?? req.user?.id;
    const userId = req.user!.id;
    
    const load = await Load.findOne({ _id: id, companyId });
    
    if (!load) {
      throw ApiError.notFound('Load not found');
    }
    
    // Validate status transition (simplified - you can add more complex logic)
    const validStatuses = [
      'booked', 'assigned', 'on_duty', 'arrived_shipper', 'loading',
      'departed_shipper', 'in_transit', 'arrived_receiver', 'unloading',
      'delivered', 'completed', 'cancelled'
    ];
    
    if (!validStatuses.includes(status)) {
      throw ApiError.badRequest('Invalid status');
    }
    
    // Update status
    load.status = status;
    load.statusHistory.push({
      status,
      timestamp: new Date(),
      location,
      notes,
      updatedBy: userId,
    } as any);
    
    // If delivered, update completed timestamp
    if (status === 'delivered' || status === 'completed') {
      load.completedAt = new Date();
      
      // Free up resources
      if (load.driverId && load.truckId && load.trailerId) {
        await Promise.all([
          Driver.findByIdAndUpdate(load.driverId, {
            status: 'available',
            currentLoadId: null,
          }),
          Truck.findByIdAndUpdate(load.truckId, {
            status: 'available',
            currentLoadId: null,
            currentDriverId: null,
          }),
          Trailer.findByIdAndUpdate(load.trailerId, {
            status: 'available',
            currentLoadId: null,
            currentTruckId: null,
          }),
        ]);
      }
    }
    
    if (status === 'cancelled') {
      load.cancelledAt = new Date();
      load.cancellationReason = notes;
      
      // Free up resources
      if (load.driverId && load.truckId && load.trailerId) {
        await Promise.all([
          Driver.findByIdAndUpdate(load.driverId, {
            status: 'available',
            currentLoadId: null,
          }),
          Truck.findByIdAndUpdate(load.truckId, {
            status: 'available',
            currentLoadId: null,
            currentDriverId: null,
          }),
          Trailer.findByIdAndUpdate(load.trailerId, {
            status: 'available',
            currentLoadId: null,
            currentTruckId: null,
          }),
        ]);
      }
    }
    
    await load.save();
    
    return ApiResponse.success(res, load, 'Status updated successfully');
  });

  // Delete load
  static deleteLoad = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const companyId = req.user?.companyId ?? req.user?.id;
    
    const load = await Load.findOne({ _id: id, companyId });
    
    if (!load) {
      throw ApiError.notFound('Load not found');
    }
    
    // Only allow deletion if load is in booked status
    if (load.status !== 'booked') {
      throw ApiError.badRequest('Cannot delete load that has been assigned or started');
    }
    
    await load.deleteOne();
    
    return ApiResponse.success(res, null, 'Load deleted successfully');
  });
}
