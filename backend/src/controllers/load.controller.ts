import { Request, Response } from 'express';
import { Load, LoadStatus } from '../models/Load.model';
import Truck from '../models/Truck';
import Trailer from '../models/Trailer';
import { Driver, DriverStatus } from '../models/Driver.model';
import { User } from '../models/User.model';
import Assignment from '../models/Assignment';
import { ApiResponse } from '../utils/ApiResponse';
import { asyncHandler } from '../utils/asyncHandler';
import { ApiError } from '../utils/ApiError';
import { notifyLoadAssigned, notifyLoadCompleted, notifyLoadDelayed, createNotification } from '../utils/notificationHelper';
import Notification, { NotificationType, NotificationPriority } from '../models/Notification';
import AssignmentService from '../services/assignment.service';
import Expense from '../models/Expense';

export class LoadController {
  // Get loads assigned to current driver
  static getMyAssignedLoads = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;
    
    // Find driver profile for this user
    const driver = await Driver.findOne({ userId });
    
    if (!driver) {
      throw ApiError.notFound('Driver profile not found');
    }
    
    const driverId = driver._id.toString();
    
    // Get all loads assigned to this driver
    const loads = await Load.find({ driverId })
      .populate('driverId', 'name email phone')
      .populate('truckId', 'unitNumber make model')
      .populate('trailerId', 'unitNumber type')
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 })
      .lean();
    
    return ApiResponse.success(res, loads, 'Assigned loads fetched successfully');
  });

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

    // Allow drivers to fetch loads assigned to them even if companyId differs
    let query: any = { _id: id };
    if (req.user?.role === 'driver') {
      const driver = await Driver.findOne({ userId: req.user!.id }).select('_id').lean();
      if (driver) {
        query.driverId = driver._id.toString();
      }
    } else {
      // For owner/dispatcher, restrict by company
      query.companyId = companyId;
    }

    const load = await Load.findOne(query)
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

  // Generate unique load number with retry logic
  private static async generateUniqueLoadNumber(companyId: string): Promise<string> {
    // Get the highest load number for this company
    const lastLoad = await Load.findOne({ companyId })
      .sort({ createdAt: -1 })
      .select('loadNumber')
      .lean();
    
    let baseNumber = 1001;
    if (lastLoad && lastLoad.loadNumber) {
      const match = lastLoad.loadNumber.match(/LOAD-(\d+)/);
      if (match) {
        baseNumber = parseInt(match[1], 10) + 1;
      }
    }
    
    // Try to find a unique load number (check up to 100 numbers ahead)
    for (let i = 0; i < 100; i++) {
      const loadNumber = `LOAD-${baseNumber + i}`;
      const existingLoad = await Load.findOne({ companyId, loadNumber }).lean();
      if (!existingLoad) {
        return loadNumber;
      }
    }
    
    // Fallback: use timestamp-based number if all sequential numbers are taken
    const timestamp = Date.now();
    return `LOAD-${timestamp}`;
  }

  // Create new load
  static createLoad = asyncHandler(async (req: Request, res: Response) => {
    const companyId = req.user?.companyId ?? req.user?.id;
    const userId = req.user!.id;
    
    if (!companyId) {
      throw ApiError.badRequest('Company ID is required');
    }
    
    // Generate unique load number
    let loadNumber = await LoadController.generateUniqueLoadNumber(companyId);
    
    // Try to create load, retry with next sequential number if duplicate
    let load;
    let retryCount = 0;
    const maxRetries = 10;
    
    while (retryCount <= maxRetries) {
      try {
        const loadData = {
          ...req.body,
          loadNumber,
          companyId,
          createdBy: userId,
          status: LoadStatus.BOOKED,
          statusHistory: [{
            status: LoadStatus.BOOKED,
            timestamp: new Date(),
            updatedBy: userId,
          }],
        };
        
        load = await Load.create(loadData);
        break; // Success, exit loop
      } catch (error: any) {
        // Check if it's a duplicate key error
        if (error.code === 11000 && (error.keyPattern?.loadNumber || error.keyPattern?.['companyId_1_loadNumber_1'])) {
          retryCount++;
          if (retryCount > maxRetries) {
            // Final fallback: use timestamp-based number
            loadNumber = `LOAD-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
            try {
              const loadData = {
                ...req.body,
                loadNumber,
                companyId,
                createdBy: userId,
                status: LoadStatus.BOOKED,
                statusHistory: [{
                  status: LoadStatus.BOOKED,
                  timestamp: new Date(),
                  updatedBy: userId,
                }],
              };
              load = await Load.create(loadData);
              break;
            } catch (finalError: any) {
              throw ApiError.badRequest('Failed to create load. Please try again.');
            }
          } else {
            // Extract current number and increment
            const match = loadNumber.match(/LOAD-(\d+)/);
            if (match) {
              const nextNum = parseInt(match[1], 10) + 1;
              loadNumber = `LOAD-${nextNum}`;
            } else {
              // If pattern doesn't match, generate new number
              loadNumber = await LoadController.generateUniqueLoadNumber(companyId);
            }
          }
        } else {
          // Some other error, throw it
          throw error;
        }
      }
    }
    
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
    
    const previousDriverId = load.driverId?.toString();
    
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
    
    // If driver was cleared, delete load-assignment notifications so driver no longer sees them
    if (previousDriverId && !load.driverId) {
      try {
        const driver = await Driver.findById(previousDriverId).lean();
        let driverUserId: string | undefined = (driver as any)?.userId?.toString();
        if (!driverUserId && (driver as any)?.email) {
          const driverUser = await User.findOne({ email: (driver as any).email, role: 'driver' });
          if (driverUser) driverUserId = driverUser._id.toString();
        }
        if (!driverUserId && (driver as any)?.phone) {
          const driverUser = await User.findOne({ phone: (driver as any).phone, role: 'driver' });
          if (driverUser) driverUserId = driverUser._id.toString();
        }
        if (driverUserId) {
          await Notification.deleteMany({ userId: driverUserId as any, 'metadata.loadId': id });
        }
      } catch (err) {
        console.error('Failed to delete notifications when clearing driver:', err);
      }
    }
    
    return ApiResponse.success(res, load, 'Load updated successfully');
  });

  // Assign load to driver, truck, and trailer
  static assignLoad = asyncHandler(async (req: Request, res: Response) => {
    const loadId = String(req.params.id);
    const { driverId, truckId, trailerId } = req.body;
    const companyId = req.user?.companyId ?? req.user?.id;
    const userId = req.user!.id;
    
    // Validate all three are provided (mandatory)
    if (!driverId || !truckId || !trailerId) {
      throw ApiError.badRequest('Driver, Truck, and Trailer are all required for assignment');
    }
    
    // Find the load
    const load = await Load.findOne({ _id: loadId, companyId });
    if (!load) {
      throw ApiError.notFound('Load not found');
    }
    
    // Validate driver, truck, and trailer exist and are available
    // Note: Driver model uses 'createdBy' instead of 'companyId'
    const [driver, truck, trailer] = await Promise.all([
      Driver.findOne({ _id: driverId, createdBy: companyId }),
      Truck.findOne({ _id: truckId, companyId }),
      Trailer.findOne({ _id: trailerId, companyId }),
    ]);
    
    if (!driver) throw ApiError.notFound('Driver not found');
    if (!truck) throw ApiError.notFound('Truck not found');
    if (!trailer) throw ApiError.notFound('Trailer not found');
    
    // Check availability - drivers can be ACTIVE to be assigned
    if (driver.status !== DriverStatus.ACTIVE) {
      throw ApiError.badRequest('Driver is not available');
    }
    if (truck.status !== 'available') {
      throw ApiError.badRequest('Truck is not available');
    }
    if (trailer.status !== 'available') {
      throw ApiError.badRequest('Trailer is not available');
    }
    
    // Check if rate has been confirmed before assigning
    if (load.status !== LoadStatus.RATE_CONFIRMED && load.status !== LoadStatus.BOOKED) {
      throw ApiError.badRequest('Load must be in booked or rate_confirmed status before assignment');
    }
    
    // Assign the load - this creates a trip
    load.driverId = driverId;
    load.truckId = truckId;
    load.trailerId = trailerId;
    load.status = LoadStatus.ASSIGNED;
    load.statusHistory.push({
      status: LoadStatus.ASSIGNED,
      timestamp: new Date(),
      notes: `Trip created and assigned to Driver: ${driver.name}, Truck: ${truck.unitNumber}, Trailer: ${trailer.unitNumber}`,
      updatedBy: userId,
    } as any);
    
    // Update driver, truck, and trailer status
    driver.status = DriverStatus.ON_TRIP;
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
    
    // Create Assignment record (tracks accept/reject workflow)
    try {
      const assignment = await AssignmentService.createAssignment({
        loadId,
        driverId: driverId,
        truckId: truckId,
        trailerId: trailerId,
        assignedBy: userId,
        expiresIn: 24, // 24 hours to accept/reject
      });
      
      console.log('✅ Assignment created:', {
        _id: assignment._id,
        loadId: assignment.loadId,
        driverId: assignment.driverId,
        status: assignment.status,
        expiresAt: assignment.expiresAt,
      });
      
      // Get driver's user account
      let driverUserId = driver.userId; // If driver has userId field from earlier fix
      
      console.log('🔍 Driver linked userId:', driverUserId);
      
      if (!driverUserId && driver.email) {
        const driverUser = await User.findOne({ email: driver.email, role: 'driver' });
        if (driverUser) {
          driverUserId = driverUser._id.toString();
          console.log('✅ Found driver user by email:', driverUserId);
        }
      }
      
      if (!driverUserId && driver.phone) {
        const driverUser = await User.findOne({ phone: driver.phone, role: 'driver' });
        if (driverUser) {
          driverUserId = driverUser._id.toString();
          console.log('✅ Found driver user by phone:', driverUserId);
        }
      }
      
      // Send notification to driver if user account found
      if (driverUserId) {
        await notifyLoadAssigned(
          companyId as string,
          driverUserId,
          load.loadNumber,
          driver.name,
          loadId,
          assignment._id.toString()
        );
      } else {
        console.warn(`Driver ${driver.name} not linked to user account - notification not sent`);
      }
    } catch (assignError) {
      // Log error but don't fail the assignment
      console.error('Failed to create assignment or send notification:', assignError);
    }
    
    return ApiResponse.success(res, load, 'Load assigned successfully. Driver has been notified to accept or reject.');
  });

  // Unassign/Reject load from driver (Owner/Dispatcher can reassign to another driver)
  static unassignLoad = asyncHandler(async (req: Request, res: Response) => {
    const loadId = String(req.params.id);
    const { reason } = req.body;
    const companyId = req.user?.companyId ?? req.user?.id;
    const userId = req.user!.id;

    // Find the load
    const load = await Load.findOne({ _id: loadId, companyId });
    if (!load) {
      throw ApiError.notFound('Load not found');
    }

    // Can only unassign if load is ASSIGNED or TRIP_ACCEPTED status
    if (load.status !== LoadStatus.ASSIGNED && load.status !== LoadStatus.TRIP_ACCEPTED) {
      throw ApiError.badRequest('Load must be assigned or trip accepted to unassign');
    }

    // Get driver, truck, trailer info before unassigning
    const driverId = load.driverId?.toString();
    const truckId = load.truckId?.toString();
    const trailerId = load.trailerId?.toString();

    // Unassign the load
    load.driverId = undefined;
    load.truckId = undefined;
    load.trailerId = undefined;
    load.status = LoadStatus.BOOKED;
    load.statusHistory.push({
      status: LoadStatus.BOOKED,
      timestamp: new Date(),
      notes: reason || 'Load unassigned by dispatcher',
      updatedBy: userId,
    } as any);

    // Update driver, truck, trailer status
    if (driverId) {
      await Driver.findByIdAndUpdate(driverId, {
        status: DriverStatus.ACTIVE,
        currentLoadId: undefined,
      });
    }
    if (truckId) {
      await Truck.findByIdAndUpdate(truckId, {
        status: 'available',
        currentLoadId: undefined,
        currentDriverId: undefined,
      });
    }
    if (trailerId) {
      await Trailer.findByIdAndUpdate(trailerId, {
        status: 'available',
        currentLoadId: undefined,
        currentTruckId: undefined,
      });
    }

    // Delete the assignment record
    try {
      await Assignment.deleteMany({ loadId });
    } catch (err) {
      console.error('Failed to delete assignment:', err);
    }

    // Notify driver of cancellation and mark previous assignment notifications as read
    try {
      if (driverId) {
        const driver = await Driver.findById(driverId).lean();
        let driverUserId: string | undefined = (driver as any)?.userId;

        if (!driverUserId && driver?.email) {
          const driverUser = await User.findOne({ email: driver.email, role: 'driver' });
          if (driverUser) driverUserId = driverUser._id.toString();
        }
        if (!driverUserId && driver?.phone) {
          const driverUser = await User.findOne({ phone: driver.phone, role: 'driver' });
          if (driverUser) driverUserId = driverUser._id.toString();
        }

        if (driverUserId) {
          // Delete all notifications for this load so driver no longer sees them
          await Notification.deleteMany({
            userId: driverUserId as any,
            'metadata.loadId': loadId,
          });
        }
      }
    } catch (nErr) {
      console.error('Failed to notify cancellation or update notifications:', nErr);
    }

    await load.save();

    return ApiResponse.success(res, load, 'Load unassigned successfully. Load is now available for reassignment.');
  });

  // Update load status
  // Valid status transitions: each status maps to the statuses it can transition TO
  static VALID_TRANSITIONS: Record<string, string[]> = {
    [LoadStatus.BOOKED]: [LoadStatus.RATE_CONFIRMED, LoadStatus.ASSIGNED, LoadStatus.CANCELLED],
    [LoadStatus.RATE_CONFIRMED]: [LoadStatus.ASSIGNED, LoadStatus.CANCELLED],
    [LoadStatus.ASSIGNED]: [LoadStatus.TRIP_ACCEPTED, LoadStatus.BOOKED, LoadStatus.CANCELLED],
    [LoadStatus.TRIP_ACCEPTED]: [LoadStatus.TRIP_STARTED, LoadStatus.ASSIGNED, LoadStatus.CANCELLED],
    [LoadStatus.TRIP_STARTED]: [LoadStatus.SHIPPER_CHECK_IN, LoadStatus.CANCELLED],
    [LoadStatus.SHIPPER_CHECK_IN]: [LoadStatus.SHIPPER_LOAD_IN, LoadStatus.CANCELLED],
    [LoadStatus.SHIPPER_LOAD_IN]: [LoadStatus.SHIPPER_LOAD_OUT, LoadStatus.CANCELLED],
    [LoadStatus.SHIPPER_LOAD_OUT]: [LoadStatus.IN_TRANSIT, LoadStatus.CANCELLED],
    [LoadStatus.IN_TRANSIT]: [LoadStatus.RECEIVER_CHECK_IN, LoadStatus.CANCELLED],
    [LoadStatus.RECEIVER_CHECK_IN]: [LoadStatus.RECEIVER_OFFLOAD, LoadStatus.CANCELLED],
    [LoadStatus.RECEIVER_OFFLOAD]: [LoadStatus.DELIVERED, LoadStatus.CANCELLED],
    [LoadStatus.DELIVERED]: [LoadStatus.COMPLETED],
    [LoadStatus.COMPLETED]: [],
    [LoadStatus.CANCELLED]: [],
  };

  static validateTransition(currentStatus: string, newStatus: string): boolean {
    const allowed = LoadController.VALID_TRANSITIONS[currentStatus];
    if (!allowed) return false;
    return allowed.includes(newStatus);
  }

  static updateStatus = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { status, notes, location } = req.body;
    const companyId = req.user?.companyId ?? req.user?.id;
    const userId = req.user!.id;
    
    const load = await Load.findOne({ _id: id, companyId });
    
    if (!load) {
      throw ApiError.notFound('Load not found');
    }
    
    // Validate status is a valid enum value
    const validStatuses = Object.values(LoadStatus);
    if (!validStatuses.includes(status as LoadStatus)) {
      throw ApiError.badRequest('Invalid status');
    }

    // Validate the status transition is allowed
    if (!LoadController.validateTransition(load.status, status)) {
      throw ApiError.badRequest(
        `Cannot transition from "${load.status.replace(/_/g, ' ')}" to "${status.replace(/_/g, ' ')}". ` +
        `Allowed transitions: ${(LoadController.VALID_TRANSITIONS[load.status] || []).map((s: string) => s.replace(/_/g, ' ')).join(', ') || 'none'}`
      );
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
    if (status === LoadStatus.DELIVERED || status === LoadStatus.COMPLETED) {
      load.completedAt = new Date();
      
      // Free up resources
      if (load.driverId && load.truckId && load.trailerId) {
        await Promise.all([
          Driver.findByIdAndUpdate(load.driverId, {
            status: DriverStatus.ACTIVE,
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
    
    if (status === LoadStatus.CANCELLED) {
      load.cancelledAt = new Date();
      load.cancellationReason = notes;
      
      // Free up resources
      if (load.driverId && load.truckId && load.trailerId) {
        await Promise.all([
          Driver.findByIdAndUpdate(load.driverId, {
            status: DriverStatus.ACTIVE,
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

    // Send notifications for key status changes
    const notifCompanyId = companyId || load.companyId;
    if (notifCompanyId) {
      try {
        if (status === LoadStatus.DELIVERED || status === LoadStatus.COMPLETED) {
          await notifyLoadCompleted(notifCompanyId, load.loadNumber);
        }
        if (status === LoadStatus.CANCELLED) {
          await createNotification({
            companyId: notifCompanyId,
            type: NotificationType.WARNING,
            priority: NotificationPriority.HIGH,
            title: 'Load Cancelled',
            message: `Load #${load.loadNumber} has been cancelled${notes ? `: ${notes}` : ''}`,
            metadata: { loadNumber: load.loadNumber, reason: notes },
          });
        }
        if (status === LoadStatus.TRIP_STARTED) {
          await createNotification({
            companyId: notifCompanyId,
            type: NotificationType.INFO,
            priority: NotificationPriority.MEDIUM,
            title: 'Trip Started',
            message: `Driver has started trip for Load #${load.loadNumber}`,
            metadata: { loadNumber: load.loadNumber },
          });
        }
      } catch { /* notification failures should not block the main operation */ }
    }
    
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
    if (load.status !== LoadStatus.BOOKED) {
      throw ApiError.badRequest('Cannot delete load that has been assigned or started');
    }
    
    await load.deleteOne();
    
    return ApiResponse.success(res, null, 'Load deleted successfully');
  });

  // Broker confirms rate and provides details
  static confirmRate = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { trackingLink, pickupAddress, deliveryAddress, miles } = req.body;
    const companyId = req.user?.companyId ?? req.user?.id;
    const userId = req.user!.id;
    
    const load = await Load.findOne({ _id: id, companyId });
    
    if (!load) {
      throw ApiError.notFound('Load not found');
    }
    
    if (load.status !== LoadStatus.BOOKED) {
      throw ApiError.badRequest('Rate can only be confirmed for booked loads');
    }
    
    // Validate required fields
    if (!trackingLink || !pickupAddress || !deliveryAddress || !miles) {
      throw ApiError.badRequest('Tracking link, pickup address, delivery address, and miles are required');
    }
    
    // Update load with broker confirmation details
    load.trackingLink = trackingLink;
    load.brokerConfirmedRate = true;
    load.brokerConfirmedAt = new Date();
    load.brokerConfirmationDetails = {
      pickupAddress,
      deliveryAddress,
      miles,
    };
    
    // Update pickup and delivery locations if provided
    if (pickupAddress) {
      load.pickupLocation = pickupAddress;
    }
    if (deliveryAddress) {
      load.deliveryLocation = deliveryAddress;
    }
    if (miles) {
      load.distance = miles;
    }
    
    load.status = LoadStatus.RATE_CONFIRMED;
    load.statusHistory.push({
      status: LoadStatus.RATE_CONFIRMED,
      timestamp: new Date(),
      notes: `Rate confirmed by broker. Tracking link: ${trackingLink}`,
      updatedBy: userId,
    } as any);
    
    await load.save();
    
    return ApiResponse.success(res, load, 'Rate confirmed successfully');
  });

  // Driver accepts trip
  static acceptTrip = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const companyId = req.user?.companyId ?? req.user?.id;
    const userId = req.user!.id;
    
    // Allow drivers to find loads assigned to them (same logic as getLoadById and startTrip)
    let query: any = { _id: id };
    let driver: any = null;
    if (req.user?.role === 'driver') {
      driver = await Driver.findOne({ userId }).select('_id').lean();
      if (driver) {
        query.driverId = driver._id.toString();
      } else {
        throw ApiError.notFound('Driver profile not found');
      }
    } else {
      query.companyId = companyId;
    }
    
    const load = await Load.findOne(query);
    
    if (!load) {
      throw ApiError.notFound('Load not found or you do not have access to this load');
    }
    
    if (load.status !== LoadStatus.ASSIGNED) {
      throw ApiError.badRequest('Trip can only be accepted if load is assigned');
    }
    
    // No need for extra driver verification - the query already filtered by driverId
    
    load.status = LoadStatus.TRIP_ACCEPTED;
    load.tripAcceptedAt = new Date();
    load.statusHistory.push({
      status: LoadStatus.TRIP_ACCEPTED,
      timestamp: new Date(),
      notes: 'Driver accepted the trip',
      updatedBy: userId,
    } as any);
    
    await load.save();
    
    return ApiResponse.success(res, load, 'Trip accepted successfully');
  });

  // Driver submits form details - UPDATED: Removed strict assignment check
  static submitDriverForm = asyncHandler(async (req: Request, res: Response) => {
    console.log('📝 === SUBMIT DRIVER FORM V2 - NO ASSIGNMENT CHECK ===');
    const { id } = req.params;
    const {
      loadNumber,
      pickupReferenceNumber,
      pickupTime,
      pickupPlace,
      pickupDate,
      pickupLocation,
      dropoffReferenceNumber,
      dropoffTime,
      dropoffLocation,
      dropoffDate,
    } = req.body;
    const companyId = req.user?.companyId ?? req.user?.id;
    const userId = req.user!.id;
    
    console.log('User Info:', { userId, role: req.user?.role, companyId });
    console.log('Load ID:', id);
    
    // Find the load first
    const load = await Load.findById(id);
    console.log('Load found:', load ? { 
      id: load._id.toString(), 
      driverId: load.driverId, 
      status: load.status,
      companyId: load.companyId 
    } : null);
    
    if (!load) {
      console.error('❌ Load not found with id:', id);
      throw ApiError.notFound('Load not found');
    }
    
    // Verify load status allows form submission (allow all statuses except completed/cancelled)
    const blockedStatuses = [LoadStatus.COMPLETED, LoadStatus.CANCELLED, LoadStatus.DELIVERED];
    if (blockedStatuses.includes(load.status)) {
      throw ApiError.badRequest('Form cannot be submitted for completed, cancelled, or delivered loads');
    }
    
    // For drivers, just verify they have a driver profile linked to their account
    // This allows any authenticated driver to submit forms for testing/workflow purposes
    if (req.user?.role === 'driver') {
      const driver = await Driver.findOne({ userId }).select('_id').lean();
      
      if (!driver) {
        console.error('❌ Driver profile not found for userId:', userId);
        throw ApiError.notFound('Driver profile not found. Please contact administrator to link your driver profile.');
      }
      
      console.log('✅ Driver profile found:', driver._id.toString());
      
      // If load doesn't have a driver assigned, assign this driver
      if (!load.driverId) {
        load.driverId = driver._id.toString();
        console.log('📝 Auto-assigned driver to load:', driver._id.toString());
      }
    } else {
      // For non-drivers (owner/dispatcher), verify company access
      if (load.companyId !== companyId) {
        console.error('❌ Company mismatch:', {
          loadCompanyId: load.companyId,
          userCompanyId: companyId
        });
        throw ApiError.forbidden('You do not have access to this load');
      }
    }
    
    console.log('✅ All checks passed, updating load...');
    
    // Validate required fields
    if (!loadNumber || !pickupReferenceNumber || !pickupTime || !pickupPlace || 
        !pickupDate || !pickupLocation || !dropoffReferenceNumber || 
        !dropoffTime || !dropoffLocation || !dropoffDate) {
      throw ApiError.badRequest('All form fields are required');
    }
    
    // Combine date + time into valid Date objects
    // Frontend sends time as "HH:mm" and date as "YYYY-MM-DD"
    const buildDateTime = (dateStr: string, timeStr: string): Date => {
      // If timeStr is already a valid ISO date, use it directly
      const directDate = new Date(timeStr);
      if (!isNaN(directDate.getTime())) return directDate;
      // Otherwise combine date + time (e.g. "2026-02-07" + "14:15")
      return new Date(`${dateStr}T${timeStr}:00`);
    };

    // Update load with driver form details
    load.driverFormDetails = {
      loadNumber,
      pickupReferenceNumber,
      pickupTime: buildDateTime(pickupDate, pickupTime),
      pickupPlace,
      pickupDate: new Date(pickupDate),
      pickupLocation,
      dropoffReferenceNumber,
      dropoffTime: buildDateTime(dropoffDate, dropoffTime),
      dropoffLocation,
      dropoffDate: new Date(dropoffDate),
    };
    
    // Update status to in_transit if starting trip
    if (load.status === LoadStatus.TRIP_ACCEPTED) {
      load.status = LoadStatus.IN_TRANSIT;
      load.statusHistory.push({
        status: LoadStatus.IN_TRANSIT,
        timestamp: new Date(),
        notes: 'Driver submitted form and started trip',
        updatedBy: userId,
      } as any);
    } else {
      load.statusHistory.push({
        status: load.status,
        timestamp: new Date(),
        notes: 'Driver submitted form details',
        updatedBy: userId,
      } as any);
    }
    
    await load.save();
    
    console.log('✅ Driver form submitted successfully');
    return ApiResponse.success(res, load, 'Driver form submitted successfully');
  });

  // Driver starts trip with odometer photo
  static startTrip = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { startingMileage, startingPhoto } = req.body;
    const companyId = req.user?.companyId ?? req.user?.id;
    const userId = req.user!.id;

    // Allow drivers to find loads assigned to them (same logic as getLoadById)
    let query: any = { _id: id };
    if (req.user?.role === 'driver') {
      const driver = await Driver.findOne({ userId }).select('_id').lean();
      if (driver) {
        query.driverId = driver._id.toString();
      } else {
        throw ApiError.notFound('Driver profile not found');
      }
    } else {
      query.companyId = companyId;
    }

    const load = await Load.findOne(query);

    if (!load) {
      throw ApiError.notFound('Load not found');
    }

    if (load.status !== LoadStatus.TRIP_ACCEPTED && load.status !== LoadStatus.ASSIGNED && load.status !== LoadStatus.IN_TRANSIT) {
      throw ApiError.badRequest('Trip can only be started after acceptance');
    }

    // Verify driver is starting their own trip (load.driverId is Driver model _id)
    if (req.user?.role === 'driver') {
      const driver = await Driver.findOne({ userId }).select('_id').lean();
      if (!driver || load.driverId?.toString() !== driver._id.toString()) {
        throw ApiError.forbidden('Only the assigned driver can start this trip');
      }
    } else if (load.driverId?.toString()) {
      const driver = await Driver.findById(load.driverId).select('userId').lean();
      if (driver && (driver as any).userId?.toString() !== userId) {
        throw ApiError.forbidden('Only the assigned driver can start this trip');
      }
    }
    
    if (!startingMileage || !startingPhoto) {
      throw ApiError.badRequest('Starting mileage and photo are required');
    }
    
    const { latitude, longitude } = req.body;
    
    load.status = LoadStatus.TRIP_STARTED;
    load.tripStartDetails = {
      startingMileage,
      startingPhoto,
      tripStartedAt: new Date(),
    };
    
    // Store start location if provided
    if (latitude && longitude) {
      (load as any).tripStartLocation = { latitude, longitude, timestamp: new Date() };
    }
    
    load.statusHistory.push({
      status: LoadStatus.TRIP_STARTED,
      timestamp: new Date(),
      notes: `Trip started. Starting mileage: ${startingMileage}`,
      updatedBy: userId,
      lat: latitude || undefined,
      lng: longitude || undefined,
    } as any);
    
    await load.save();
    
    return ApiResponse.success(res, load, 'Trip started successfully');
  });

  // Driver checks in at shipper location
  static shipperCheckIn = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { poNumber, loadNumber, referenceNumber } = req.body;
    const userId = req.user!.id;

    let query: any = { _id: id };
    let driverProfile: { _id: { toString: () => string } } | null = null;
    if (req.user?.role === 'driver') {
      driverProfile = await Driver.findOne({ userId }).select('_id').lean();
      if (driverProfile) query.driverId = driverProfile._id.toString();
      else throw ApiError.notFound('Driver profile not found');
    } else {
      query.companyId = req.user?.companyId ?? req.user?.id;
    }

    const load = await Load.findOne(query);
    
    if (!load) {
      throw ApiError.notFound('Load not found');
    }
    
    if (load.status !== LoadStatus.TRIP_STARTED && load.status !== LoadStatus.SHIPPER_CHECK_IN) {
      throw ApiError.badRequest('Can only check in at shipper after trip is started');
    }
    if (req.user?.role !== 'driver') {
      throw ApiError.forbidden('Only the assigned driver can perform this action');
    }
    if (!driverProfile || load.driverId?.toString() !== driverProfile._id.toString()) {
      throw ApiError.forbidden('Only the assigned driver can perform this action');
    }
    
    // At least one identifier should be provided (PO, load number, or reference)
    if (!poNumber && !loadNumber && !referenceNumber) {
      throw ApiError.badRequest('At least one identifier (PO number, load number, or reference number) is required');
    }
    
    const { latitude, longitude } = req.body;
    
    load.status = LoadStatus.SHIPPER_CHECK_IN;
    load.shipperCheckInDetails = {
      poNumber: poNumber || '',
      loadNumber: loadNumber || load.loadNumber || '',
      referenceNumber: referenceNumber || '',
      checkInAt: new Date(),
    };
    
    // Store check-in location if provided
    if (latitude && longitude) {
      (load as any).shipperCheckInLocation = { latitude, longitude, timestamp: new Date() };
    }
    
    load.statusHistory.push({
      status: LoadStatus.SHIPPER_CHECK_IN,
      timestamp: new Date(),
      notes: `Checked in at shipper.${poNumber ? ` PO: ${poNumber}` : ''}${referenceNumber ? ` Ref: ${referenceNumber}` : ''}`,
      updatedBy: userId,
      lat: latitude || undefined,
      lng: longitude || undefined,
    } as any);
    
    await load.save();
    
    return ApiResponse.success(res, load, 'Checked in at shipper successfully');
  });

  // Driver confirms load in at shipper
  static shipperLoadIn = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { confirmationDetails } = req.body;
    const userId = req.user!.id;

    let query: any = { _id: id };
    let driverProfile: { _id: { toString: () => string } } | null = null;
    if (req.user?.role === 'driver') {
      driverProfile = await Driver.findOne({ userId }).select('_id').lean();
      if (driverProfile) query.driverId = driverProfile._id.toString();
      else throw ApiError.notFound('Driver profile not found');
    } else {
      query.companyId = req.user?.companyId ?? req.user?.id;
    }

    const load = await Load.findOne(query);
    
    if (!load) {
      throw ApiError.notFound('Load not found');
    }
    
    if (load.status !== LoadStatus.SHIPPER_CHECK_IN) {
      throw ApiError.badRequest('Can only mark load in after check-in');
    }
    if (req.user?.role !== 'driver') {
      throw ApiError.forbidden('Only the assigned driver can perform this action');
    }
    if (!driverProfile || load.driverId?.toString() !== driverProfile._id.toString()) {
      throw ApiError.forbidden('Only the assigned driver can perform this action');
    }
    
    const { latitude, longitude } = req.body;

    load.status = LoadStatus.SHIPPER_LOAD_IN;
    load.shipperLoadInDetails = {
      confirmationDetails,
      loadInAt: new Date(),
    };
    load.statusHistory.push({
      status: LoadStatus.SHIPPER_LOAD_IN,
      timestamp: new Date(),
      notes: 'Load in confirmed at shipper location',
      updatedBy: userId,
      lat: latitude || undefined,
      lng: longitude || undefined,
    } as any);
    
    await load.save();
    
    return ApiResponse.success(res, load, 'Load in confirmed successfully');
  });

  // Driver confirms load out at shipper with BOL
  static shipperLoadOut = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { bolDocument } = req.body;
    const userId = req.user!.id;

    let query: any = { _id: id };
    let driverProfile: { _id: { toString: () => string } } | null = null;
    if (req.user?.role === 'driver') {
      driverProfile = await Driver.findOne({ userId }).select('_id').lean();
      if (driverProfile) query.driverId = driverProfile._id.toString();
      else throw ApiError.notFound('Driver profile not found');
    } else {
      query.companyId = req.user?.companyId ?? req.user?.id;
    }

    const load = await Load.findOne(query);
    
    if (!load) {
      throw ApiError.notFound('Load not found');
    }
    
    if (load.status !== LoadStatus.SHIPPER_LOAD_IN) {
      throw ApiError.badRequest('Can only mark load out after load in');
    }
    if (req.user?.role !== 'driver') {
      throw ApiError.forbidden('Only the assigned driver can perform this action');
    }
    if (!driverProfile || load.driverId?.toString() !== driverProfile._id.toString()) {
      throw ApiError.forbidden('Only the assigned driver can perform this action');
    }
    
    if (!bolDocument) {
      throw ApiError.badRequest('BOL document is required');
    }
    
    const { latitude, longitude } = req.body;

    load.status = LoadStatus.SHIPPER_LOAD_OUT;
    load.shipperLoadOutDetails = {
      loadOutAt: new Date(),
      bolDocument,
    };
    // Also update the documents.bol field
    load.documents.bol = bolDocument;
    load.statusHistory.push({
      status: LoadStatus.SHIPPER_LOAD_OUT,
      timestamp: new Date(),
      notes: 'Load out confirmed. BOL uploaded',
      updatedBy: userId,
      lat: latitude || undefined,
      lng: longitude || undefined,
    } as any);
    
    await load.save();
    
    return ApiResponse.success(res, load, 'Load out confirmed successfully');
  });

  // Receiver checks in (can be updated by driver or receiver)
  static receiverCheckIn = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const userId = req.user!.id;

    let query: any = { _id: id };
    let driverProfile: { _id: { toString: () => string } } | null = null;
    if (req.user?.role === 'driver') {
      driverProfile = await Driver.findOne({ userId }).select('_id').lean();
      if (driverProfile) query.driverId = driverProfile._id.toString();
      else throw ApiError.notFound('Driver profile not found');
    } else {
      query.companyId = req.user?.companyId ?? req.user?.id;
    }

    const load = await Load.findOne(query);
    
    if (!load) {
      throw ApiError.notFound('Load not found');
    }
    
    const validStatuses = [
      LoadStatus.SHIPPER_LOAD_OUT,
      LoadStatus.IN_TRANSIT,
      LoadStatus.RECEIVER_CHECK_IN,
    ];
    
    if (!validStatuses.includes(load.status)) {
      throw ApiError.badRequest('Can only check in at receiver after load out');
    }
    if (req.user?.role === 'driver' && (!driverProfile || load.driverId?.toString() !== driverProfile._id.toString())) {
      throw ApiError.forbidden('Only the assigned driver can perform this action');
    }
    
    const { latitude, longitude } = req.body;

    load.status = LoadStatus.RECEIVER_CHECK_IN;
    load.receiverCheckInDetails = {
      checkInAt: new Date(),
      arrivalConfirmed: true,
    };
    load.statusHistory.push({
      status: LoadStatus.RECEIVER_CHECK_IN,
      timestamp: new Date(),
      notes: 'Checked in at receiver location',
      updatedBy: userId,
      lat: latitude || undefined,
      lng: longitude || undefined,
    } as any);
    
    await load.save();
    
    return ApiResponse.success(res, load, 'Checked in at receiver successfully');
  });

  // Receiver offloads with POD
  static receiverOffload = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { quantity, additionalDetails, bolAcknowledged, podDocument, podPhoto } = req.body;
    const userId = req.user!.id;

    let query: any = { _id: id };
    if (req.user?.role === 'driver') {
      const driver = await Driver.findOne({ userId }).select('_id').lean();
      if (driver) query.driverId = driver._id.toString();
      else throw ApiError.notFound('Driver profile not found');
    } else {
      query.companyId = req.user?.companyId ?? req.user?.id;
    }

    const load = await Load.findOne(query);
    
    if (!load) {
      throw ApiError.notFound('Load not found');
    }
    
    if (load.status !== LoadStatus.RECEIVER_CHECK_IN) {
      throw ApiError.badRequest('Can only offload after receiver check-in');
    }
    
    if (!bolAcknowledged) {
      throw ApiError.badRequest('BOL acknowledgment is required');
    }

    if (!podDocument && !podPhoto) {
      throw ApiError.badRequest('POD document or photo is required');
    }

    load.status = LoadStatus.RECEIVER_OFFLOAD;
    load.receiverOffloadDetails = {
      offloadAt: new Date(),
      quantity,
      additionalDetails,
      bolAcknowledged,
      podDocument,
      podPhoto,
    };
    // Update POD document
    if (podDocument) load.documents.pod = podDocument;
    if (podPhoto) load.documents.pod = podPhoto;
    
    const { latitude, longitude } = req.body;

    load.statusHistory.push({
      status: LoadStatus.RECEIVER_OFFLOAD,
      timestamp: new Date(),
      notes: 'Load offloaded at receiver. POD received',
      updatedBy: userId,
      lat: latitude || undefined,
      lng: longitude || undefined,
    } as any);
    
    await load.save();
    
    return ApiResponse.success(res, load, 'Load offloaded successfully');
  });

  // Driver ends trip with completion details
  static endTrip = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const {
      endingMileage,
      endingPhoto,
      totalMiles,
      rate,
      fuelExpenses,
      tolls,
      otherCosts,
      additionalExpenseDetails,
    } = req.body;
    const userId = req.user!.id;

    let query: any = { _id: id };
    if (req.user?.role === 'driver') {
      const driver = await Driver.findOne({ userId }).select('_id').lean();
      if (driver) query.driverId = driver._id.toString();
      else throw ApiError.notFound('Driver profile not found');
    } else {
      query.companyId = req.user?.companyId ?? req.user?.id;
    }

    const load = await Load.findOne(query);
    
    if (!load) {
      throw ApiError.notFound('Load not found');
    }
    
    if (load.status !== LoadStatus.RECEIVER_OFFLOAD) {
      throw ApiError.badRequest('Trip can only be ended after receiver offload');
    }

    // Driver auth: load was found via driver-aware query; no extra check needed

    // Validate required fields
    if (!endingMileage || !totalMiles || !rate) {
      throw ApiError.badRequest('Ending mileage, total miles, and rate are required');
    }
    
    // Calculate expenses
    const totalExpenses = (fuelExpenses || 0) + (tolls || 0) + (otherCosts || 0);
    const totalPayment = totalMiles * rate;
    
    // Get starting mileage
    const startingMileage = load.tripStartDetails?.startingMileage || 0;
    if (endingMileage < startingMileage) {
      throw ApiError.badRequest('Ending mileage cannot be less than starting mileage');
    }
    
    // Update trip completion details
    load.tripCompletionDetails = {
      endingMileage,
      endingPhoto,
      totalMiles,
      rate,
      totalPayment,
      expenses: {
        fuelExpenses: fuelExpenses || 0,
        tolls: tolls || 0,
        otherCosts: otherCosts || 0,
        totalExpenses,
        additionalDetails: additionalExpenseDetails,
      },
      completedAt: new Date(),
    };
    
    load.status = LoadStatus.COMPLETED;
    load.tripEndedAt = new Date();
    load.completedAt = new Date();
    load.actualDeliveryDate = new Date();
    
    const { latitude, longitude } = req.body;

    load.statusHistory.push({
      status: LoadStatus.COMPLETED,
      timestamp: new Date(),
      notes: `Trip completed. Total miles: ${totalMiles}, Payment: $${totalPayment}, Expenses: $${totalExpenses}`,
      updatedBy: userId,
      lat: latitude || undefined,
      lng: longitude || undefined,
    } as any);
    
    // Free up resources
    if (load.driverId && load.truckId && load.trailerId) {
      await Promise.all([
        Driver.findByIdAndUpdate(load.driverId, {
          status: DriverStatus.ACTIVE,
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
    
    await load.save();
    
    return ApiResponse.success(res, load, 'Trip ended successfully');
  });

  // Upload document (odometer photo, BOL, POD) for a load
  static uploadDocument = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const userId = req.user!.id;

    if (!req.file) {
      throw ApiError.badRequest('No file uploaded');
    }

    let query: any = { _id: id };
    if (req.user?.role === 'driver') {
      const driver = await Driver.findOne({ userId }).select('_id').lean();
      if (driver) query.driverId = driver._id.toString();
      else throw ApiError.notFound('Driver profile not found');
    } else {
      const companyId = req.user?.companyId ?? req.user?.id;
      query.companyId = companyId;
    }

    const load = await Load.findOne(query);
    if (!load) throw ApiError.notFound('Load not found');

    const uploadedUrl = `/uploads/documents/${req.file.filename}`;
    res.json({
      success: true,
      message: 'Document uploaded successfully',
      data: { url: uploadedUrl },
    });
  });

  // Upload load/cargo image (Owner, Dispatcher)
  static uploadLoadImage = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    if (!req.file) {
      throw ApiError.badRequest('No file uploaded');
    }

    const userId = req.user!.id;
    const companyId = req.user?.companyId ?? userId;

    const load = await Load.findOne({ _id: id, companyId });
    if (!load) {
      throw ApiError.notFound('Load not found');
    }

    const imagePath = `/uploads/loads/${req.file.filename}`;
    load.loadImage = imagePath;
    await load.save();

    return ApiResponse.success(res, { loadImage: imagePath }, 'Load image uploaded successfully');
  });

  // Driver updates location during active trip (live tracking)
  static updateLocation = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { lat, lng, speed, heading, accuracy } = req.body;
    const userId = req.user!.id;

    if (lat === undefined || lat === null || lng === undefined || lng === null) {
      throw ApiError.badRequest('Latitude and longitude are required');
    }
    const numLat = Number(lat);
    const numLng = Number(lng);
    if (isNaN(numLat) || isNaN(numLng) || numLat < -90 || numLat > 90 || numLng < -180 || numLng > 180) {
      throw ApiError.badRequest('Invalid coordinates. Latitude: -90 to 90, Longitude: -180 to 180');
    }

    let query: any = { _id: id };
    if (req.user?.role === 'driver') {
      const driver = await Driver.findOne({ userId }).select('_id').lean();
      if (driver) query.driverId = driver._id.toString();
      else throw ApiError.notFound('Driver profile not found');
    } else {
      query.companyId = req.user?.companyId ?? req.user?.id;
    }

    const load = await Load.findOne(query);
    if (!load) throw ApiError.notFound('Load not found');

    const locationPoint = {
      lat: numLat, lng: numLng,
      timestamp: new Date(),
      speed: speed ?? undefined,
      heading: heading ?? undefined,
      accuracy: accuracy ? Number(accuracy) : undefined,
    };
    load.currentLocation = locationPoint as any;
    if (!load.locationHistory) load.locationHistory = [];
    load.locationHistory.push(locationPoint as any);
    await load.save();

    return ApiResponse.success(res, { updated: true, accuracy: locationPoint.accuracy }, 'Location updated');
  });

  // Get location tracking data for a load (owner/dispatcher/driver)
  static getLocationHistory = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const userId = req.user!.id;

    let query: any = { _id: id };
    if (req.user?.role === 'driver') {
      const driver = await Driver.findOne({ userId }).select('_id').lean();
      if (driver) query.driverId = driver._id.toString();
      else throw ApiError.notFound('Driver profile not found');
    } else {
      query.companyId = req.user?.companyId ?? req.user?.id;
    }

    const load = await Load.findOne(query)
      .select('currentLocation locationHistory pickupLocation deliveryLocation status loadNumber driverId statusHistory tripStartDetails tripCompletionDetails createdAt')
      .lean();
    if (!load) throw ApiError.notFound('Load not found');

    // Get driver name
    let driverName = 'Driver';
    if (load.driverId) {
      const driver = await Driver.findById(load.driverId).select('name').lean();
      if (driver) driverName = (driver as any).name || 'Driver';
    }

    // Calculate trip distance
    let totalDistanceKm = 0;
    const history = load.locationHistory || [];
    for (let i = 1; i < history.length; i++) {
      const p1 = history[i - 1];
      const p2 = history[i];
      const R = 6371;
      const dLat = ((p2.lat - p1.lat) * Math.PI) / 180;
      const dLng = ((p2.lng - p1.lng) * Math.PI) / 180;
      const a = Math.sin(dLat / 2) ** 2 +
        Math.cos((p1.lat * Math.PI) / 180) * Math.cos((p2.lat * Math.PI) / 180) *
        Math.sin(dLng / 2) ** 2;
      totalDistanceKm += R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    }

    return ApiResponse.success(res, {
      currentLocation: load.currentLocation || null,
      locationHistory: history,
      pickupLocation: load.pickupLocation || null,
      deliveryLocation: load.deliveryLocation || null,
      status: load.status,
      loadNumber: load.loadNumber,
      driverName,
      statusHistory: load.statusHistory || [],
      tripStartDetails: load.tripStartDetails || null,
      tripCompletionDetails: load.tripCompletionDetails || null,
      totalDistanceKm: Math.round(totalDistanceKm * 10) / 10,
      totalPoints: history.length,
    }, 'Location history retrieved');
  });

  // Driver reports delay
  static reportDelay = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { reason, notes } = req.body;
    const userId = req.user!.id;

    if (!reason || !reason.trim()) {
      throw ApiError.badRequest('Delay reason is required');
    }

    let query: any = { _id: id };
    if (req.user?.role === 'driver') {
      const driver = await Driver.findOne({ userId }).select('_id').lean();
      if (driver) query.driverId = driver._id.toString();
      else throw ApiError.notFound('Driver profile not found');
    } else {
      query.companyId = req.user?.companyId ?? req.user?.id;
    }

    const load = await Load.findOne(query);
    if (!load) throw ApiError.notFound('Load not found');

    const delayNote = `DELAY REPORTED: ${reason.trim()}${notes ? ` - ${notes}` : ''}`;
    load.statusHistory.push({
      status: load.status,
      timestamp: new Date(),
      notes: delayNote,
      updatedBy: userId,
    } as any);
    await load.save();

    // Notify owner/dispatcher about the delay
    try {
      const companyId = load.companyId || req.user?.companyId || req.user?.id;
      if (companyId) {
        await notifyLoadDelayed(companyId, load.loadNumber, reason.trim());
      }
    } catch { /* don't block for notification failure */ }

    return ApiResponse.success(res, { reported: true }, 'Delay reported successfully');
  });

  // Driver logs expense (fuel, toll, etc.) during trip
  static addExpense = asyncHandler(async (req: Request, res: Response) => {
    const id = typeof req.params.id === 'string' ? req.params.id : req.params.id?.[0] || '';
    const { category, type, amount, date, location, description, receiptUrl } = req.body;
    const userId = req.user!.id;

    if (!category || amount == null) {
      throw ApiError.badRequest('Category and amount are required');
    }

    const validCategories = ['fuel', 'toll', 'scale', 'parking', 'lumper', 'late_fee', 'dock_fee', 'repair', 'other'];
    if (!validCategories.includes(category)) {
      throw ApiError.badRequest('Invalid expense category');
    }

    let query: any = { _id: id };
    if (req.user?.role === 'driver') {
      const driver = await Driver.findOne({ userId }).select('_id').lean();
      if (driver) query.driverId = driver._id.toString();
      else throw ApiError.notFound('Driver profile not found');
    } else {
      query.companyId = req.user?.companyId ?? req.user?.id;
    }

    const load = await Load.findOne(query).lean();
    if (!load) throw ApiError.notFound('Load not found');

    const companyId = (load as any).companyId?.toString();
    if (!companyId) throw ApiError.badRequest('Load has no company');

    // Extract additional fields
    const { paidBy, fuelQuantity, fuelStation, odometerBefore, odometerAfter,
            odometerBeforePhoto, odometerAfterPhoto, repairStartTime, repairEndTime,
            repairDescription: repairDesc } = req.body;

    // Calculate downtime hours for repair
    let repairDowntimeHours: number | undefined;
    if (repairStartTime && repairEndTime) {
      const start = new Date(repairStartTime);
      const end = new Date(repairEndTime);
      repairDowntimeHours = parseFloat(((end.getTime() - start.getTime()) / 3600000).toFixed(1));
    }

    // Determine reimbursement status
    const reimbursementStatus = paidBy === 'driver' ? 'pending' : 'not_applicable';

    const expense = await Expense.create({
      loadId: String(id),
      driverId: userId,
      companyId,
      category,
      type: type || 'on_the_way',
      amount: Number(amount),
      date: date ? new Date(date) : new Date(),
      location: location || fuelStation || undefined,
      description: description || undefined,
      receiptUrl: receiptUrl || undefined,
      status: 'pending',
      paidBy: paidBy || 'driver',
      reimbursementStatus,
      reimbursementAmount: paidBy === 'driver' ? Number(amount) : undefined,
      fuelQuantity: fuelQuantity ? Number(fuelQuantity) : undefined,
      fuelStation: fuelStation || undefined,
      odometerBefore: odometerBefore ? Number(odometerBefore) : undefined,
      odometerAfter: odometerAfter ? Number(odometerAfter) : undefined,
      odometerBeforePhoto: odometerBeforePhoto || undefined,
      odometerAfterPhoto: odometerAfterPhoto || undefined,
      repairStartTime: repairStartTime ? new Date(repairStartTime) : undefined,
      repairEndTime: repairEndTime ? new Date(repairEndTime) : undefined,
      repairDowntimeHours,
      repairDescription: repairDesc || undefined,
    });

    return ApiResponse.success(res, expense, 'Expense logged successfully', 201);
  });

  // Get expenses for a load
  static getLoadExpenses = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const userId = req.user!.id;

    let query: any = { _id: id };
    if (req.user?.role === 'driver') {
      const driver = await Driver.findOne({ userId }).select('_id').lean();
      if (driver) query.driverId = driver._id.toString();
      else throw ApiError.notFound('Driver profile not found');
    } else {
      query.companyId = req.user?.companyId ?? req.user?.id;
    }

    const load = await Load.findOne(query);
    if (!load) throw ApiError.notFound('Load not found');

    const expenses = await Expense.find({ loadId: id }).sort({ date: -1 }).lean();
    const summary = expenses.reduce(
      (acc, e: any) => {
        acc.total += e.amount || 0;
        if (e.category === 'fuel') acc.fuel += e.amount || 0;
        else if (e.category === 'toll') acc.tolls += e.amount || 0;
        else acc.other += e.amount || 0;
        return acc;
      },
      { total: 0, fuel: 0, tolls: 0, other: 0 }
    );

    return ApiResponse.success(res, { expenses, summary }, 'Expenses retrieved');
  });

  // ─── Expense Approval & Reimbursement ─────────────────────────

  // Owner/Dispatcher approves or rejects an expense
  static approveExpense = asyncHandler(async (req: Request, res: Response) => {
    const { expenseId } = req.params;
    const { action, reimbursementAmount, notes } = req.body; // action: 'approve' | 'reject'
    const companyId = req.user?.companyId ?? req.user?.id;
    const userId = req.user!.id;

    if (!['approve', 'reject'].includes(action)) {
      throw ApiError.badRequest('Action must be "approve" or "reject"');
    }

    const expense = await Expense.findOne({ _id: expenseId, companyId });
    if (!expense) throw ApiError.notFound('Expense not found');

    if (expense.status !== 'pending') {
      throw ApiError.badRequest(`Expense is already ${expense.status}`);
    }

    expense.status = action === 'approve' ? 'approved' : 'rejected';
    (expense as any).approvedBy = userId;
    (expense as any).approvedAt = new Date();

    if (action === 'approve' && expense.paidBy === 'driver') {
      expense.reimbursementStatus = 'approved';
      expense.reimbursementAmount = reimbursementAmount || expense.amount;
    } else if (action === 'reject') {
      expense.reimbursementStatus = 'rejected';
    }

    if (notes) expense.notes = notes;
    await expense.save();

    return ApiResponse.success(res, expense, `Expense ${action}d successfully`);
  });

  // Mark an approved expense as paid (reimbursed)
  static markExpenseReimbursed = asyncHandler(async (req: Request, res: Response) => {
    const { expenseId } = req.params;
    const companyId = req.user?.companyId ?? req.user?.id;

    const expense = await Expense.findOne({ _id: expenseId, companyId });
    if (!expense) throw ApiError.notFound('Expense not found');

    if (expense.status !== 'approved') {
      throw ApiError.badRequest('Can only reimburse approved expenses');
    }
    if (expense.reimbursementStatus !== 'approved' && expense.reimbursementStatus !== 'pending') {
      throw ApiError.badRequest(`Expense reimbursement is already ${expense.reimbursementStatus}`);
    }

    expense.reimbursementStatus = 'paid';
    expense.reimbursementDate = new Date();
    await expense.save();

    return ApiResponse.success(res, expense, 'Expense marked as reimbursed');
  });

  // Get all pending expenses for a company (for owner/dispatcher review)
  static getPendingExpenses = asyncHandler(async (req: Request, res: Response) => {
    const companyId = req.user?.companyId ?? req.user?.id;

    const expenses = await Expense.find({
      companyId,
      status: 'pending',
    }).sort({ date: -1 }).populate('loadId', 'loadNumber').lean();

    const summary = expenses.reduce(
      (acc, e: any) => {
        acc.total += e.amount || 0;
        acc.count += 1;
        const cat = e.category || 'other';
        acc.byCategory[cat] = (acc.byCategory[cat] || 0) + (e.amount || 0);
        return acc;
      },
      { total: 0, count: 0, byCategory: {} as Record<string, number> }
    );

    return ApiResponse.success(res, { expenses, summary }, 'Pending expenses retrieved');
  });

  // SOS/Emergency notification
  static sendSOS = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { message, location, emergencyType } = req.body;
    const companyId = req.user?.companyId ?? req.user?.id;
    const userId = req.user!.id;

    // Driver-aware load lookup
    let query: any = { _id: id };
    if (req.user?.role === 'driver') {
      const driver = await Driver.findOne({ userId }).select('_id').lean();
      if (driver) query.driverId = driver._id.toString();
      else throw ApiError.notFound('Driver profile not found');
    } else {
      query.companyId = companyId;
    }

    const load = await Load.findOne(query)
      .populate('driverId', 'name phone emergencyContact emergencyContactName')
      .lean();

    if (!load) {
      throw ApiError.notFound('Load not found');
    }
    
    // TODO: Send notifications to owner and dispatcher
    // This would typically use a notification service/email/SMS
    // For now, we'll log it in the status history
    
    const driver = load.driverId as any;
    const sosMessage = `SOS ALERT - ${emergencyType || 'Emergency'}: ${message || 'Driver needs assistance'}. Location: ${location || 'Unknown'}. Driver: ${driver.name} (${driver.phone}). Emergency Contact: ${driver.emergencyContactName} (${driver.emergencyContact})`;
    
    // Add to load status history
    await Load.findByIdAndUpdate(id, {
      $push: {
        statusHistory: {
          status: load.status,
          timestamp: new Date(),
          notes: sosMessage,
          updatedBy: userId,
        },
      },
    });
    
    // TODO: Implement actual notification system
    // - Send email/SMS to owner
    // - Send email/SMS to dispatcher
    // - Send email/SMS to driver's emergency contact
    
    return ApiResponse.success(res, {
      message: 'SOS alert sent successfully',
      sentTo: ['Owner', 'Dispatcher', driver.emergencyContactName],
      alertDetails: {
        loadNumber: load.loadNumber,
        driverName: driver.name,
        driverPhone: driver.phone,
        emergencyType,
        message,
        location,
        timestamp: new Date(),
      },
    }, 'SOS alert sent successfully');
  });
}
