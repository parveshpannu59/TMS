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

// ─── Geocode helper: resolve address → lat/lng via Nominatim ───
async function geocodeLocation(loc: any): Promise<{ lat?: number; lng?: number }> {
  if (!loc || (loc.lat && loc.lng)) return {};
  const q = [loc.address, loc.city, loc.state, loc.pincode].filter(Boolean).join(', ');
  if (!q) return {};
  try {
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&limit=1`;
    const resp = await fetch(url, { headers: { 'User-Agent': 'TMS/1.0' } });
    const data = (await resp.json()) as any[];
    if (data && data.length > 0 && data[0].lat && data[0].lon) {
      return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
    }
  } catch { /* ignore */ }
  return {};
}

async function ensureLocationCoords(loc: any): Promise<any> {
  if (!loc) return loc;
  if (loc.lat && loc.lng) return loc;
  const coords = await geocodeLocation(loc);
  if (coords.lat && coords.lng) {
    return { ...loc, lat: coords.lat, lng: coords.lng };
  }
  return loc;
}

export class LoadController {
  // Get loads assigned to current driver
  static getMyAssignedLoads = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const { page = 1, limit = 0, status } = req.query;
    
    const driver = await Driver.findOne({ userId });
    if (!driver) {
      throw ApiError.notFound('Driver profile not found');
    }
    
    const driverId = driver._id.toString();
    const query: any = { driverId };
    if (status && status !== 'all') query.status = status;

    const pageNum = Math.max(1, Number(page));
    const limitNum = Number(limit);

    // If limit is 0 or not provided, return all (backward compat)
    if (!limitNum) {
      const loads = await Load.find(query)
        .populate('driverId', 'name email phone')
        .populate('truckId', 'unitNumber make model')
        .populate('trailerId', 'unitNumber type')
        .populate('createdBy', 'name email')
        .sort({ createdAt: -1 })
        .lean();
      return ApiResponse.success(res, loads, 'Assigned loads fetched successfully');
    }

    const skip = (pageNum - 1) * limitNum;
    const [loads, total] = await Promise.all([
      Load.find(query)
        .populate('driverId', 'name email phone')
        .populate('truckId', 'unitNumber make model')
        .populate('trailerId', 'unitNumber type')
        .populate('createdBy', 'name email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Load.countDocuments(query),
    ]);

    return ApiResponse.success(res, {
      loads,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum),
      },
    }, 'Assigned loads fetched successfully');
  });

  // Export loads as CSV
  static exportLoadsCsv = asyncHandler(async (req: Request, res: Response) => {
    const companyId = req.user?.companyId ?? req.user?.id;
    const { status, dateFrom, dateTo } = req.query;

    const query: any = { companyId };
    if (status) query.status = status;
    if (dateFrom || dateTo) {
      query.pickupDate = {};
      if (dateFrom) query.pickupDate.$gte = new Date(dateFrom as string);
      if (dateTo) query.pickupDate.$lte = new Date(dateTo as string);
    }

    const loads = await Load.find(query)
      .populate('driverId', 'name email')
      .sort({ createdAt: -1 })
      .lean();

    const headers = ['Load Number', 'Customer', 'Pickup City', 'Delivery City', 'Status', 'Rate', 'Distance', 'Pickup Date', 'Delivery Date', 'Driver'];
    const escapeCsv = (val: unknown): string => {
      if (val == null || val === undefined) return '';
      const s = String(val);
      if (s.includes(',') || s.includes('"') || s.includes('\n') || s.includes('\r')) {
        return `"${s.replace(/"/g, '""')}"`;
      }
      return s;
    };
    const formatDate = (d: Date | undefined): string => (d ? new Date(d).toISOString().split('T')[0] : '');

    const rows = loads.map((l: any) => {
      const pickup = l.pickupLocation || {};
      const delivery = l.deliveryLocation || {};
      const driver = l.driverId;
      const driverName = driver?.name || '';
      return [
        escapeCsv(l.loadNumber),
        escapeCsv(l.customerName),
        escapeCsv(pickup.city),
        escapeCsv(delivery.city),
        escapeCsv(l.status),
        escapeCsv(l.rate),
        escapeCsv(l.distance),
        escapeCsv(formatDate(l.pickupDate)),
        escapeCsv(formatDate(l.expectedDeliveryDate)),
        escapeCsv(driverName),
      ].join(',');
    });

    const csv = [headers.join(','), ...rows].join('\r\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="loads-export-${new Date().toISOString().split('T')[0]}.csv"`);
    res.send(csv);
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
    
    // ─── Auto-geocode pickup/delivery locations (non-blocking) ───
    if (load) {
      (async () => {
        try {
          let updated = false;
          if (load.pickupLocation && !(load.pickupLocation as any).lat) {
            const geo = await ensureLocationCoords(load.pickupLocation);
            if (geo.lat) { load.pickupLocation = geo; updated = true; }
          }
          if (load.deliveryLocation && !(load.deliveryLocation as any).lat) {
            const geo = await ensureLocationCoords(load.deliveryLocation);
            if (geo.lat) { load.deliveryLocation = geo; updated = true; }
          }
          if (updated) await load.save();
        } catch { /* non-critical geocoding */ }
      })();
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
    const driverId = req.body.driverId || '';
    const truckId = req.body.truckId || undefined;       // sanitize empty strings to undefined
    const trailerId = req.body.trailerId || undefined;   // sanitize empty strings to undefined
    const companyId = req.user?.companyId ?? req.user?.id;
    const userId = req.user!.id;
    
    // Driver is mandatory; truck or trailer — at least one required
    if (!driverId) {
      throw ApiError.badRequest('Driver is required for assignment');
    }
    if (!truckId && !trailerId) {
      throw ApiError.badRequest('Either a Truck or Trailer must be selected');
    }
    
    // Find the load
    const load = await Load.findOne({ _id: loadId, companyId });
    if (!load) {
      throw ApiError.notFound('Load not found');
    }
    
    // Validate driver exists
    const driver = await Driver.findOne({ _id: driverId, createdBy: companyId });
    if (!driver) throw ApiError.notFound('Driver not found');

    // Check driver availability
    const assignableStatuses = [DriverStatus.ACTIVE, DriverStatus.OFF_DUTY, DriverStatus.WAITING_FOR_APPROVAL];
    if (!assignableStatuses.includes(driver.status as DriverStatus)) {
      throw ApiError.badRequest('Driver is not available (current status: ' + driver.status + ')');
    }

    // Validate truck if provided
    let truck: any = null;
    if (truckId) {
      truck = await Truck.findOne({ _id: truckId, companyId });
      if (!truck) throw ApiError.notFound('Truck not found');
      if (truck.status !== 'available') throw ApiError.badRequest('Truck is not available');
    }

    // Validate trailer if provided
    let trailer: any = null;
    if (trailerId) {
      trailer = await Trailer.findOne({ _id: trailerId, companyId });
      if (!trailer) throw ApiError.notFound('Trailer not found');
      if (trailer.status !== 'available') throw ApiError.badRequest('Trailer is not available');
    }
    
    // Check if rate has been confirmed before assigning
    if (load.status !== LoadStatus.RATE_CONFIRMED && load.status !== LoadStatus.BOOKED) {
      throw ApiError.badRequest('Load must be in booked or rate_confirmed status before assignment');
    }
    
    // Assign the load — status is ASSIGNED (pending driver acceptance)
    // Driver/Truck/Trailer statuses are NOT changed yet — they update only when driver ACCEPTS
    load.driverId = driverId;
    if (truckId) load.truckId = truckId;
    if (trailerId) load.trailerId = trailerId;
    load.status = LoadStatus.ASSIGNED;

    const vehicleParts = [];
    if (truck) vehicleParts.push(`Truck: ${truck.unitNumber}`);
    if (trailer) vehicleParts.push(`Trailer: ${trailer.unitNumber}`);

    load.statusHistory.push({
      status: LoadStatus.ASSIGNED,
      timestamp: new Date(),
      notes: `Load assigned to Driver: ${driver.name}${vehicleParts.length ? ', ' + vehicleParts.join(', ') : ''} — awaiting driver acceptance`,
      updatedBy: userId,
    } as any);

    // Reserve truck/trailer so they can't be double-assigned, but driver stays available until they accept
    const savePromises: Promise<any>[] = [load.save()];

    if (truck) {
      truck.status = 'assigned'; // reserved, not yet on_road
      truck.currentLoadId = load._id.toString();
      truck.currentDriverId = driverId;
      savePromises.push(truck.save());
    }

    if (trailer) {
      trailer.status = 'assigned'; // reserved, not yet on_road
      trailer.currentLoadId = load._id.toString();
      if (truckId) trailer.currentTruckId = truckId;
      savePromises.push(trailer.save());
    }
    
    await Promise.all(savePromises);
    
    // Create Assignment record and notify driver immediately
    try {
      const assignment = await AssignmentService.createAssignment({
        loadId,
        driverId,
        truckId: truckId || undefined,
        trailerId: trailerId || undefined,
        assignedBy: userId,
        expiresIn: 24,
      });
      
      console.log('✅ Assignment created:', {
        _id: assignment._id, loadId, driverId, status: assignment.status,
      });
      
      // Resolve driver's user account for notification
      let driverUserId = driver.userId;
      if (!driverUserId && driver.email) {
        const u = await User.findOne({ email: driver.email, role: 'driver' });
        if (u) driverUserId = u._id.toString();
      }
      if (!driverUserId && driver.phone) {
        const u = await User.findOne({ phone: driver.phone, role: 'driver' });
        if (u) driverUserId = u._id.toString();
      }
      
      if (driverUserId) {
        await notifyLoadAssigned(
          companyId as string,
          driverUserId,
          load.loadNumber,
          driver.name,
          loadId,
          assignment._id.toString()
        );
        
        // Pusher instant notification
        try {
          const { broadcastAssignment } = require('../services/pusher.service');
          const pickup = (load as any).pickupLocation;
          const delivery = (load as any).deliveryLocation;
          await broadcastAssignment(companyId as string, driverUserId, {
            assignmentId: assignment._id.toString(),
            loadId,
            loadNumber: load.loadNumber,
            driverId,
            driverName: driver.name,
            pickup: [pickup?.city, pickup?.state].filter(Boolean).join(', ') || 'Pickup',
            delivery: [delivery?.city, delivery?.state].filter(Boolean).join(', ') || 'Delivery',
            rate: load.rate,
            timestamp: new Date().toISOString(),
            action: 'new',
          });
        } catch (pusherErr) { console.warn('Pusher broadcast failed:', pusherErr); }
        
        console.log('✅ Driver notified:', driverUserId);
      } else {
        console.warn(`Driver ${driver.name} not linked to user account — notification not sent`);
      }
    } catch (assignError) {
      console.error('Failed to create assignment or send notification:', assignError);
    }
    
    return ApiResponse.success(res, load, 'Load assigned successfully. Driver has been notified.');
  });

  // Edit assignment — change driver, truck, trailer, or rate on an assigned (not yet rate-confirmed) load
  static editAssignment = asyncHandler(async (req: Request, res: Response) => {
    const loadId = String(req.params.id);
    const { driverId: newDriverId, truckId: newTruckId, trailerId: newTrailerId, rate: newRate } = req.body;
    const companyId = req.user?.companyId ?? req.user?.id;
    const userId = req.user!.id;

    const load = await Load.findOne({ _id: loadId, companyId });
    if (!load) throw ApiError.notFound('Load not found');

    // Only allow editing when load is assigned (before rate confirmation / driver notification)
    if (load.status !== LoadStatus.ASSIGNED) {
      throw ApiError.badRequest('Can only edit assignment before rate is confirmed');
    }

    const oldDriverId = load.driverId?.toString();
    const oldTruckId = load.truckId?.toString();
    const oldTrailerId = load.trailerId?.toString();

    // Free old truck/trailer if being replaced
    if (oldTruckId && newTruckId && oldTruckId !== newTruckId) {
      await Truck.findByIdAndUpdate(oldTruckId, { status: 'available', $unset: { currentLoadId: 1, currentDriverId: 1 } });
    }
    if (oldTrailerId && newTrailerId && oldTrailerId !== newTrailerId) {
      await Trailer.findByIdAndUpdate(oldTrailerId, { status: 'available', $unset: { currentLoadId: 1, currentTruckId: 1 } });
    }

    // Update driver
    if (newDriverId && newDriverId !== oldDriverId) {
      const driver = await Driver.findOne({ _id: newDriverId, createdBy: companyId });
      if (!driver) throw ApiError.notFound('Driver not found');
      load.driverId = newDriverId;
    }

    // Update truck
    if (newTruckId) {
      const truck = await Truck.findOne({ _id: newTruckId, companyId });
      if (!truck) throw ApiError.notFound('Truck not found');
      truck.status = 'assigned';
      truck.currentLoadId = loadId;
      truck.currentDriverId = load.driverId?.toString() || '';
      await truck.save();
      load.truckId = newTruckId;
      // Clear trailer if switching to truck
      if (oldTrailerId && !newTrailerId) {
        await Trailer.findByIdAndUpdate(oldTrailerId, { status: 'available', $unset: { currentLoadId: 1, currentTruckId: 1 } });
        load.trailerId = undefined as any;
      }
    }

    // Update trailer
    if (newTrailerId) {
      const trailer = await Trailer.findOne({ _id: newTrailerId, companyId });
      if (!trailer) throw ApiError.notFound('Trailer not found');
      trailer.status = 'assigned';
      trailer.currentLoadId = loadId;
      await trailer.save();
      load.trailerId = newTrailerId;
      // Clear truck if switching to trailer
      if (oldTruckId && !newTruckId) {
        await Truck.findByIdAndUpdate(oldTruckId, { status: 'available', $unset: { currentLoadId: 1, currentDriverId: 1 } });
        load.truckId = undefined as any;
      }
    }

    // Update rate
    if (newRate !== undefined && Number(newRate) > 0) {
      load.rate = Number(newRate);
    }

    load.statusHistory.push({
      status: LoadStatus.ASSIGNED,
      timestamp: new Date(),
      notes: 'Assignment details updated by dispatcher',
      updatedBy: userId,
    } as any);

    await load.save();

    return ApiResponse.success(res, load, 'Assignment updated successfully');
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

    // Can only unassign if load is ASSIGNED, RATE_CONFIRMED, or TRIP_ACCEPTED status
    if (load.status !== LoadStatus.ASSIGNED && load.status !== LoadStatus.RATE_CONFIRMED && load.status !== LoadStatus.TRIP_ACCEPTED) {
      throw ApiError.badRequest('Load must be assigned, rate confirmed, or trip accepted to unassign');
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

    // Update driver, truck, trailer status — unassign → off duty
    if (driverId) {
      await Driver.findByIdAndUpdate(driverId, {
        status: DriverStatus.OFF_DUTY,
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
    [LoadStatus.ASSIGNED]: [LoadStatus.RATE_CONFIRMED, LoadStatus.TRIP_ACCEPTED, LoadStatus.BOOKED, LoadStatus.CANCELLED],
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
    
    // If delivered → pending owner review
    if (status === LoadStatus.DELIVERED) {
      load.deliveredAt = new Date();
      load.paymentStatus = 'pending';
      
      // Driver → WAITING_FOR_APPROVAL, truck/trailer → available
      const updates: Promise<any>[] = [];
      if (load.driverId) {
        updates.push(Driver.findByIdAndUpdate(load.driverId, {
          status: DriverStatus.WAITING_FOR_APPROVAL,
          currentLoadId: null,
        }));
      }
      if (load.truckId) {
        updates.push(Truck.findByIdAndUpdate(load.truckId, {
          status: 'available', currentLoadId: null, currentDriverId: null,
        }));
      }
      if (load.trailerId) {
        updates.push(Trailer.findByIdAndUpdate(load.trailerId, {
          status: 'available', currentLoadId: null, currentTruckId: null,
        }));
      }
      if (updates.length > 0) {
        await Promise.all(updates);
      }
    }

    // If completed (owner confirmed) → set completion timestamp
    if (status === LoadStatus.COMPLETED) {
      load.completedAt = new Date();
    }
    
    if (status === LoadStatus.CANCELLED) {
      load.cancelledAt = new Date();
      load.cancellationReason = notes;
      
      // Free up resources — cancel → off duty
      if (load.driverId && load.truckId && load.trailerId) {
        await Promise.all([
          Driver.findByIdAndUpdate(load.driverId, {
            status: DriverStatus.OFF_DUTY,
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
        if (status === LoadStatus.DELIVERED) {
          // Find driver name for notification
          let drvName = 'Driver';
          try {
            const drvDoc = await Driver.findById(load.driverId).select('name').lean();
            if (drvDoc?.name) drvName = drvDoc.name;
          } catch { /* fallback */ }

          // Targeted notification to the person who assigned the load
          const assignmentDoc = await Assignment.findOne({
            loadId: id,
            status: 'accepted',
          }).sort({ createdAt: -1 }).lean() as any;

          const targetUser = assignmentDoc?.assignedBy || load.createdBy;
          if (targetUser) {
            const n = new Notification({
              companyId: notifCompanyId as any,
              userId: targetUser as any,
              type: NotificationType.SUCCESS,
              priority: NotificationPriority.HIGH,
              title: 'Trip Completed — Approval Required',
              message: `${drvName} has completed Load #${load.loadNumber}. Please review and approve to initiate payment.`,
              metadata: {
                loadId: id,
                loadNumber: load.loadNumber,
                driverId: load.driverId?.toString() || '',
                driverName: drvName,
                status: 'delivered',
                requiresApproval: true,
              },
              read: false,
            });
            await n.save();
          }

          // Note: company-wide notification removed to prevent duplicates
        }
        if (status === LoadStatus.COMPLETED) {
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

    // ─── Real-time status broadcast via Pusher ───────────────
    try {
      const { broadcastStatusChange } = require('../services/pusher.service');
      const prevStatus = load.statusHistory.length > 1
        ? load.statusHistory[load.statusHistory.length - 2]?.status
        : 'unknown';
      await broadcastStatusChange(companyId || load.companyId, {
        loadId: id,
        loadNumber: load.loadNumber,
        driverId: load.driverId?.toString() || '',
        driverName: (req.user as any)?.name || 'System',
        previousStatus: prevStatus,
        newStatus: status,
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      console.warn('Pusher status broadcast failed (non-critical):', (err as Error).message);
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

  // Broker/Dispatcher confirms rate and provides details
  // If load is in 'assigned' status (has driver), also creates Assignment + notifies driver
  static confirmRate = asyncHandler(async (req: Request, res: Response) => {
    const id = String(req.params.id);
    const { trackingLink, pickupAddress, deliveryAddress, miles, rate } = req.body;
    const companyId = req.user?.companyId ?? req.user?.id;
    const userId = req.user!.id;
    
    const load = await Load.findOne({ _id: id, companyId });
    
    if (!load) {
      throw ApiError.notFound('Load not found');
    }
    
    // Allow confirming rate for both booked and assigned loads
    if (load.status !== LoadStatus.BOOKED && load.status !== LoadStatus.ASSIGNED) {
      throw ApiError.badRequest('Rate can only be confirmed for booked or assigned loads');
    }
    
    // Validate — only pickup and delivery locations are required
    if (!pickupAddress && !deliveryAddress) {
      throw ApiError.badRequest('Pickup and delivery locations are required');
    }

    // Normalize location: accept string or object
    const normalizeLocation = (loc: any) => {
      if (typeof loc === 'string') return { address: loc, name: loc };
      return loc;
    };
    
    const normalizedPickup = pickupAddress ? normalizeLocation(pickupAddress) : undefined;
    const normalizedDelivery = deliveryAddress ? normalizeLocation(deliveryAddress) : undefined;

    // Update rate if provided
    if (rate && Number(rate) > 0) {
      load.rate = Number(rate);
    }
    
    // Update load with broker confirmation details
    if (trackingLink) load.trackingLink = trackingLink;
    load.brokerConfirmedRate = true;
    load.brokerConfirmedAt = new Date();
    load.brokerConfirmationDetails = {
      pickupAddress: normalizedPickup || pickupAddress,
      deliveryAddress: normalizedDelivery || deliveryAddress,
      miles: miles || 0,
    };
    
    // Update pickup and delivery locations if provided (with geocoding)
    if (normalizedPickup) {
      load.pickupLocation = await ensureLocationCoords(normalizedPickup);
    }
    if (normalizedDelivery) {
      load.deliveryLocation = await ensureLocationCoords(normalizedDelivery);
    }
    if (miles && miles > 0) {
      load.distance = miles;
    }
    
    load.status = LoadStatus.RATE_CONFIRMED;
    load.statusHistory.push({
      status: LoadStatus.RATE_CONFIRMED,
      timestamp: new Date(),
      notes: `Rate confirmed.${trackingLink ? ` Tracking link: ${trackingLink}` : ''}`,
      updatedBy: userId,
    } as any);
    
    await load.save();
    
    // If load has a driver assigned and NO assignment record exists yet, create one and notify
    const driverId = load.driverId?.toString();
    if (driverId) {
      try {
        // Check if an assignment already exists (created during assignLoad)
        const existingAssignment = await import('../models/Assignment').then(
          m => m.default.findOne({ loadId: id, driverId, status: 'pending' })
        );
        
        if (!existingAssignment) {
          // No assignment yet — create one and notify driver
          const truckId = load.truckId?.toString() || undefined;
          const trailerId = load.trailerId?.toString() || undefined;
          
          const assignment = await AssignmentService.createAssignment({
            loadId: id,
            driverId,
            truckId,
            trailerId,
            assignedBy: userId,
            expiresIn: 24,
          });
          
          console.log('✅ Assignment created after rate confirmation:', {
            _id: assignment._id, loadNumber: load.loadNumber, driverId,
          });
          
          const driver = await Driver.findById(driverId);
          if (driver) {
            let driverUserId = driver.userId;
            if (!driverUserId && driver.email) {
              const u = await User.findOne({ email: driver.email, role: 'driver' });
              if (u) driverUserId = u._id.toString();
            }
            if (!driverUserId && driver.phone) {
              const u = await User.findOne({ phone: driver.phone, role: 'driver' });
              if (u) driverUserId = u._id.toString();
            }
            if (driverUserId) {
              await notifyLoadAssigned(companyId as string, driverUserId, load.loadNumber, driver.name, id, assignment._id.toString());
            }
          }
        } else {
          console.log('ℹ️ Assignment already exists for this load — skipping duplicate creation');
        }
      } catch (assignError) {
        console.error('Failed during rate confirmation assignment check:', assignError);
      }
    }
    
    return ApiResponse.success(res, load, 'Rate confirmed successfully.');
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
      dropoffPlace,
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
    
    // Validate required fields — only pickup details are mandatory
    // Drop-off details are filled when the driver ends the trip
    if (!loadNumber || !pickupReferenceNumber || !pickupTime || !pickupPlace || 
        !pickupDate || !pickupLocation) {
      throw ApiError.badRequest('Pickup details are required');
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

    // Update load with driver form details (drop-off is optional — filled at end trip)
    load.driverFormDetails = {
      loadNumber,
      pickupReferenceNumber,
      pickupTime: buildDateTime(pickupDate, pickupTime),
      pickupPlace,
      pickupDate: new Date(pickupDate),
      pickupLocation,
      dropoffReferenceNumber: dropoffReferenceNumber || '',
      dropoffTime: dropoffTime && dropoffDate ? buildDateTime(dropoffDate, dropoffTime) : undefined,
      dropoffLocation: dropoffLocation || '',
      dropoffDate: dropoffDate ? new Date(dropoffDate) : undefined,
      dropoffPlace: dropoffPlace || '',
    } as any;
    
    // Form submission should NOT change the status — the driver must explicitly "Start Trip"
    // Just log that the form was submitted
    load.statusHistory.push({
      status: load.status,
      timestamp: new Date(),
      notes: 'Driver submitted trip form details',
      updatedBy: userId,
    } as any);
    
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

    if (load.status !== LoadStatus.TRIP_ACCEPTED && load.status !== LoadStatus.ASSIGNED) {
      throw ApiError.badRequest('Trip can only be started after acceptance. Current status: ' + load.status);
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

    // ─── Auto set driver status to ON_DUTY ────────────
    if (load.driverId) {
      await Driver.findByIdAndUpdate(load.driverId, {
        status: DriverStatus.ON_DUTY,
        currentLoadId: load._id?.toString() || id,
      });
    }
    
    return ApiResponse.success(res, load, 'Trip started successfully');
  });

  // Driver checks in at shipper location
  static shipperCheckIn = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { latePassAmount, latePassPhoto, hasLatePass } = req.body;
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
    
    const { latitude, longitude } = req.body;
    
    load.status = LoadStatus.SHIPPER_CHECK_IN;
    load.shipperCheckInDetails = {
      poNumber: '',
      loadNumber: load.loadNumber || '',
      referenceNumber: '',
      checkInAt: new Date(),
      latePassAmount: hasLatePass ? parseFloat(latePassAmount) || 0 : 0,
      latePassPhoto: latePassPhoto || '',
      hasLatePass: !!hasLatePass,
    } as any;
    
    // Store check-in location if provided
    if (latitude && longitude) {
      (load as any).shipperCheckInLocation = { latitude, longitude, timestamp: new Date() };
    }
    
    const latePassNote = hasLatePass && latePassAmount > 0 ? ` Late Pass: $${latePassAmount}` : '';
    load.statusHistory.push({
      status: LoadStatus.SHIPPER_CHECK_IN,
      timestamp: new Date(),
      notes: `Checked in at shipper.${latePassNote}`,
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
    
    // Driver ends trip → status goes to DELIVERED (pending owner/dispatcher review)
    load.status = LoadStatus.DELIVERED;
    load.tripEndedAt = new Date();
    load.deliveredAt = new Date();
    load.actualDeliveryDate = new Date();
    load.paymentStatus = 'pending';
    
    const { latitude, longitude } = req.body;

    load.statusHistory.push({
      status: LoadStatus.DELIVERED,
      timestamp: new Date(),
      notes: `Trip delivered by driver. Total miles: ${totalMiles}, Payment: $${totalPayment}, Expenses: $${totalExpenses}. Awaiting owner/dispatcher review.`,
      updatedBy: userId,
      lat: latitude || undefined,
      lng: longitude || undefined,
    } as any);
    
    // Driver delivered → WAITING_FOR_APPROVAL until owner confirms
    // Free up truck/trailer so they can be reassigned, but driver stays in waiting status
    const resourceUpdates: Promise<any>[] = [];
    if (load.driverId) {
      resourceUpdates.push(
        Driver.findByIdAndUpdate(load.driverId, {
          status: DriverStatus.WAITING_FOR_APPROVAL,
          currentLoadId: null,
        })
      );
    }
    if (load.truckId) {
      resourceUpdates.push(
        Truck.findByIdAndUpdate(load.truckId, {
          status: 'available',
          currentLoadId: null,
          currentDriverId: null,
        })
      );
    }
    if (load.trailerId) {
      resourceUpdates.push(
        Trailer.findByIdAndUpdate(load.trailerId, {
          status: 'available',
          currentLoadId: null,
          currentTruckId: null,
        })
      );
    }
    if (resourceUpdates.length > 0) {
      await Promise.all(resourceUpdates);
    }
    
    await load.save();

    // ─── Notify owner/dispatcher that trip is delivered and needs review ───
    const companyId = load.companyId;
    if (companyId) {
      // Find the driver name for the notification message
      let driverName = 'Driver';
      try {
        const driverDoc = await Driver.findById(load.driverId).select('name').lean();
        if (driverDoc?.name) driverName = driverDoc.name;
      } catch { /* use fallback */ }

      // 1) Targeted notification: find the person who assigned this load and notify them directly
      try {
        const assignmentDoc = await Assignment.findOne({
          loadId: id,
          status: 'accepted',
        }).sort({ createdAt: -1 }).lean() as any;

        const targetUserId = assignmentDoc?.assignedBy || load.createdBy;

        if (targetUserId) {
          const notif = new Notification({
            companyId: companyId as any,
            userId: targetUserId as any,
            type: NotificationType.SUCCESS,
            priority: NotificationPriority.HIGH,
            title: 'Trip Completed — Approval Required',
            message: `${driverName} has completed Load #${load.loadNumber}. Please review and approve to initiate payment.`,
            metadata: {
              loadId: id,
              loadNumber: load.loadNumber,
              driverId: load.driverId?.toString() || '',
              driverName,
              totalPayment,
              totalExpenses,
              status: 'delivered',
              requiresApproval: true,
            },
            actionUrl: `/loads`,
            read: false,
          });
          await notif.save();
        }
      } catch (err) {
        console.warn('Failed to create targeted delivery notification:', err);
      }

      // Note: company-wide notification removed to prevent duplicates.
      // The targeted notification above is sufficient — owners/dispatchers
      // who assigned the load will see it directly.

      // 3) Pusher real-time broadcast
      try {
        const { broadcastStatusChange } = require('../services/pusher.service');
        await broadcastStatusChange(companyId, {
          loadId: id,
          loadNumber: load.loadNumber,
          driverId: load.driverId?.toString() || '',
          driverName,
          previousStatus: LoadStatus.RECEIVER_OFFLOAD,
          newStatus: LoadStatus.DELIVERED,
          timestamp: new Date().toISOString(),
          requiresReview: true,
        });
      } catch { /* non-critical */ }
    }
    
    return ApiResponse.success(res, load, 'Trip delivered successfully. Awaiting owner/dispatcher review.');
  });

  // ═══════════════════════════════════════════════════════════
  // CONFIRM COMPLETION (Owner/Dispatcher reviews delivered load)
  // ═══════════════════════════════════════════════════════════
  static confirmCompletion = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { reviewNotes, adjustedPayment } = req.body;
    const userId = req.user!.id;
    const companyId = req.user?.companyId ?? req.user?.id;

    const load = await Load.findOne({ _id: id, companyId })
      .populate('driverId', 'name email phone userId');

    if (!load) {
      throw ApiError.notFound('Load not found');
    }

    if (load.status !== LoadStatus.DELIVERED) {
      throw ApiError.badRequest('Load must be in "delivered" status to confirm completion. Current status: ' + load.status);
    }

    // Calculate final payment
    const tripPayment = load.tripCompletionDetails?.totalPayment || 0;
    const finalPayment = adjustedPayment !== undefined && adjustedPayment !== null
      ? Number(adjustedPayment)
      : tripPayment;

    // Update to COMPLETED
    load.status = LoadStatus.COMPLETED;
    load.completedAt = new Date();
    load.reviewedBy = userId;
    load.reviewedAt = new Date();
    load.reviewNotes = reviewNotes || '';
    load.paymentStatus = 'approved';
    load.paymentApprovedAt = new Date();
    load.paymentApprovedBy = userId;
    load.paymentAmount = finalPayment;

    load.statusHistory.push({
      status: LoadStatus.COMPLETED,
      timestamp: new Date(),
      notes: `Completion confirmed by ${(req.user as any)?.name || 'owner/dispatcher'}. Payment approved: $${finalPayment}.${reviewNotes ? ` Notes: ${reviewNotes}` : ''}`,
      updatedBy: userId,
    } as any);

    await load.save();

    // ─── Set driver status to OFF_DUTY (trip fully completed) ───
    try {
      const driverUser = (load.driverId as any);
      const driverId = driverUser?._id || load.driverId;
      if (driverId) {
        await Driver.findByIdAndUpdate(driverId, {
          status: DriverStatus.OFF_DUTY,
        });
      }
    } catch { /* non-critical */ }

    // ─── Notify the driver that load is confirmed & payment approved ───
    try {
      const driverUser = (load.driverId as any);
      const driverUserId = driverUser?.userId;

      if (driverUserId) {
        const { broadcastAssignment } = require('../services/pusher.service');
        await broadcastAssignment(driverUserId.toString(), {
          type: 'completion-confirmed',
          loadId: id,
          loadNumber: load.loadNumber,
          message: `Load #${load.loadNumber} completion confirmed! Payment of $${finalPayment} approved.`,
          timestamp: new Date().toISOString(),
        });
      }
    } catch { /* non-critical */ }

    // Notify company dashboard
    try {
      const { createNotification, NotificationType, NotificationPriority } = require('../services/notification.service');
      await createNotification({
        companyId,
        type: NotificationType.SUCCESS,
        priority: NotificationPriority.MEDIUM,
        title: '✅ Load Completed & Payment Approved',
        message: `Load #${load.loadNumber} marked complete. Payment of $${finalPayment} approved.`,
        metadata: { loadId: id, loadNumber: load.loadNumber, paymentAmount: finalPayment },
      });
    } catch { /* non-critical */ }

    // Real-time broadcast
    try {
      const { broadcastStatusChange } = require('../services/pusher.service');
      await broadcastStatusChange(companyId, {
        loadId: id,
        loadNumber: load.loadNumber,
        driverId: load.driverId?.toString() || '',
        driverName: (load.driverId as any)?.name || 'Driver',
        previousStatus: LoadStatus.DELIVERED,
        newStatus: LoadStatus.COMPLETED,
        timestamp: new Date().toISOString(),
        paymentApproved: true,
        paymentAmount: finalPayment,
      });
    } catch { /* non-critical */ }

    return ApiResponse.success(res, load, 'Load completion confirmed and payment approved.');
  });

  // ═══════════════════════════════════════════════════════════
  // MARK PAYMENT AS PAID
  // ═══════════════════════════════════════════════════════════
  static markPaymentPaid = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { paymentNotes, paymentMethod } = req.body;
    const userId = req.user!.id;
    const companyId = req.user?.companyId ?? req.user?.id;

    const load = await Load.findOne({ _id: id, companyId });
    if (!load) throw ApiError.notFound('Load not found');

    if (load.status !== LoadStatus.COMPLETED) {
      throw ApiError.badRequest('Load must be completed before marking payment as paid');
    }

    if (load.paymentStatus !== 'approved') {
      throw ApiError.badRequest('Payment must be approved before marking as paid');
    }

    load.paymentStatus = 'paid';
    load.statusHistory.push({
      status: LoadStatus.COMPLETED,
      timestamp: new Date(),
      notes: `Payment of $${load.paymentAmount || 0} marked as paid${paymentMethod ? ` via ${paymentMethod}` : ''}.${paymentNotes ? ` Notes: ${paymentNotes}` : ''}`,
      updatedBy: userId,
    } as any);

    await load.save();

    // Notify driver
    try {
      const driver = await Driver.findById(load.driverId).select('userId').lean();
      if (driver?.userId) {
        const { broadcastAssignment } = require('../services/pusher.service');
        await broadcastAssignment(driver.userId.toString(), {
          type: 'payment-completed',
          loadId: id,
          loadNumber: load.loadNumber,
          message: `Payment of $${load.paymentAmount || 0} for Load #${load.loadNumber} has been processed!`,
          timestamp: new Date().toISOString(),
        });
      }
    } catch { /* non-critical */ }

    return ApiResponse.success(res, load, 'Payment marked as paid');
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

    // ─── 📄 Pusher: Document upload notification to owner ────
    try {
      const { broadcastDocumentUpload } = require('../services/pusher.service');
      const companyId = (load as any).companyId?.toString() || req.user?.companyId || req.user?.id;
      const driverInfo = req.user?.role === 'driver'
        ? await Driver.findOne({ userId }).select('name').lean()
        : null;
      const docType = req.body?.documentType || req.file.originalname || 'document';
      await broadcastDocumentUpload(companyId, {
        loadId: id,
        loadNumber: load.loadNumber,
        driverId: userId,
        driverName: driverInfo?.name || 'User',
        documentType: docType,
        documentUrl: uploadedUrl,
        timestamp: new Date().toISOString(),
      });
    } catch (err) { console.warn('Pusher doc upload broadcast failed:', (err as Error).message); }

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
    let driverDoc: any = null;
    if (req.user?.role === 'driver') {
      driverDoc = await Driver.findOne({ userId }).select('_id name').lean();
      if (driverDoc) query.driverId = driverDoc._id.toString();
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

    // ─── Real-time broadcast via Pusher ─────────────────────
    try {
      const { broadcastLocationUpdate } = require('../services/pusher.service');
      const companyId = load.companyId || req.user?.companyId || req.user?.id || '';
      await broadcastLocationUpdate(companyId, {
        loadId: id,
        loadNumber: load.loadNumber,
        driverId: driverDoc?._id?.toString() || '',
        driverName: driverDoc?.name || (req.user as any)?.name || 'Driver',
        lat: numLat,
        lng: numLng,
        speed: speed ?? undefined,
        accuracy: accuracy ? Number(accuracy) : undefined,
        heading: heading ?? undefined,
        timestamp: locationPoint.timestamp.toISOString(),
        status: load.status,
      });
    } catch (err) {
      // Non-blocking: don't fail the request if Pusher is down
      console.warn('Pusher broadcast failed (non-critical):', (err as Error).message);
    }

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

    // ─── Auto-geocode missing pickup/delivery coords (lazy fill) ───
    let pickupLoc = load.pickupLocation || null;
    let deliveryLoc = load.deliveryLocation || null;

    if ((pickupLoc && !(pickupLoc as any).lat) || (deliveryLoc && !(deliveryLoc as any).lat)) {
      // Geocode in background and also update the DB for next time
      const [geoPickup, geoDelivery] = await Promise.all([
        pickupLoc && !(pickupLoc as any).lat ? ensureLocationCoords(pickupLoc) : pickupLoc,
        deliveryLoc && !(deliveryLoc as any).lat ? ensureLocationCoords(deliveryLoc) : deliveryLoc,
      ]);
      pickupLoc = geoPickup;
      deliveryLoc = geoDelivery;
      // Persist geocoded coords so future requests are instant
      try {
        const updates: any = {};
        if (geoPickup?.lat && !(load.pickupLocation as any)?.lat) updates.pickupLocation = geoPickup;
        if (geoDelivery?.lat && !(load.deliveryLocation as any)?.lat) updates.deliveryLocation = geoDelivery;
        if (Object.keys(updates).length > 0) {
          await Load.findByIdAndUpdate(id, { $set: updates });
        }
      } catch { /* non-critical */ }
    }

    return ApiResponse.success(res, {
      currentLocation: load.currentLocation || null,
      locationHistory: history,
      pickupLocation: pickupLoc,
      deliveryLocation: deliveryLoc,
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

    // ─── Grace Period: Allow expenses up to 48h after delivery ───
    const EXPENSE_GRACE_HOURS = 48;
    if (load.status === LoadStatus.COMPLETED) {
      const completedAt = (load as any).completedAt;
      if (completedAt) {
        const hoursElapsed = (Date.now() - new Date(completedAt).getTime()) / 3600000;
        if (hoursElapsed > EXPENSE_GRACE_HOURS) {
          throw ApiError.badRequest(`Expense submission window has closed. Expenses must be submitted within ${EXPENSE_GRACE_HOURS} hours of trip completion.`);
        }
      }
    }

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

    // ─── ⛽ Pusher: Expense notification to owner ────────────
    try {
      const { broadcastExpense } = require('../services/pusher.service');
      const driverInfo = await Driver.findOne({ userId }).select('name').lean();
      await broadcastExpense(companyId, userId, {
        expenseId: expense._id.toString(),
        loadId: id,
        loadNumber: load.loadNumber,
        driverId: userId,
        driverName: driverInfo?.name || 'Driver',
        category,
        amount: Number(amount),
        description: description || '',
        receiptUrl: receiptUrl || '',
        paidBy: paidBy || 'driver',
        timestamp: new Date().toISOString(),
        action: 'logged',
      });
    } catch (err) { console.warn('Pusher expense broadcast failed:', (err as Error).message); }

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

    // ─── ⛽ Pusher: Notify driver about approval/rejection ───
    try {
      const { broadcastExpense } = require('../services/pusher.service');
      const loadDoc = await Load.findById(expense.loadId).select('loadNumber').lean();
      await broadcastExpense(companyId as string, expense.driverId, {
        expenseId: expense._id.toString(),
        loadId: expense.loadId,
        loadNumber: (loadDoc as any)?.loadNumber || '',
        driverId: expense.driverId,
        driverName: '',
        category: expense.category,
        amount: expense.amount,
        paidBy: expense.paidBy,
        timestamp: new Date().toISOString(),
        action: action === 'approve' ? 'approved' : 'rejected',
      });
    } catch (err) { console.warn('Pusher expense approval broadcast failed:', (err as Error).message); }

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
