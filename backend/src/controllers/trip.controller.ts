import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { ApiResponse } from '../utils/ApiResponse';
import { ApiError } from '../utils/ApiError';
import Trip from '../models/Trip';
import Assignment, { AssignmentStatus } from '../models/Assignment';
import { Load } from '../models/Load.model';
import { Driver } from '../models/Driver.model';
import { TripStatus } from '../models/Trip';

export class TripController {
  /**
   * Start a new trip
   */
  static startTrip = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.id;
    if (!userId) {
      throw ApiError.unauthorized('User ID not found');
    }

    const { loadId, assignmentId, startingMileage, odometerStartPhoto, notes } = req.body;

    // Validate assignment
    const assignment = await Assignment.findById(assignmentId);
    if (!assignment) {
      throw ApiError.notFound('Assignment not found');
    }

    if (assignment.status !== AssignmentStatus.ACCEPTED) {
      throw ApiError.badRequest('Assignment must be accepted before starting trip');
    }

    // Get driver record
    const driver = await Driver.findOne({ userId });
    if (!driver) {
      throw ApiError.notFound('Driver record not found');
    }

    // Get load details for rate
    const load = await Load.findById(loadId);
    if (!load) {
      throw ApiError.notFound('Load not found');
    }

    // Check if trip already exists
    const existingTrip = await Trip.findOne({ assignmentId });
    if (existingTrip) {
      throw ApiError.badRequest('Trip already started for this assignment');
    }

    // Create trip
    const trip = await Trip.create({
      loadId: loadId,
      driverId: driver._id.toString(),
      truckId: assignment.truckId,
      trailerId: assignment.trailerId,
      assignmentId,
      status: TripStatus.IN_PROGRESS,
      startingMileage,
      odometerStartPhoto,
      ratePerMile: load.rate || 0,
      startedAt: new Date(),
      distanceRemaining: load.distance,
      notes,
    });

    // Update load status
    await Load.findByIdAndUpdate(loadId, { status: 'in_transit' });

    // Update driver status
    await Driver.findByIdAndUpdate(driver._id, {
      status: 'on_duty',
      currentLoadId: loadId,
    });

    return ApiResponse.success(res, trip, 'Trip started successfully', 201);
  });

  /**
   * Update trip location
   */
  static updateLocation = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { latitude, longitude, address, distanceTraveled, distanceRemaining } = req.body;

    const trip = await Trip.findById(id);
    if (!trip) {
      throw ApiError.notFound('Trip not found');
    }

    if (trip.status === TripStatus.COMPLETED || trip.status === TripStatus.CANCELLED) {
      throw ApiError.badRequest('Cannot update location for completed/cancelled trip');
    }

    // Update current location
    trip.currentLocation = {
      latitude,
      longitude,
      address,
      timestamp: new Date(),
    };

    // Add to location history
    trip.locationHistory.push({
      latitude,
      longitude,
      address,
      timestamp: new Date(),
    });

    // Update distances if provided
    if (distanceTraveled !== undefined) {
      trip.distanceTraveled = distanceTraveled;
    }
    if (distanceRemaining !== undefined) {
      trip.distanceRemaining = distanceRemaining;
    }

    await trip.save();

    return ApiResponse.success(res, trip, 'Location updated successfully');
  });

  /**
   * Complete trip
   */
  static completeTrip = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const {
      endingMileage,
      odometerEndPhoto,
      expenses,
      documents,
      notes,
    } = req.body;

    const trip = await Trip.findById(id);
    if (!trip) {
      throw ApiError.notFound('Trip not found');
    }

    if (trip.status === TripStatus.COMPLETED) {
      throw ApiError.badRequest('Trip already completed');
    }

    if (!trip.startingMileage) {
      throw ApiError.badRequest('Trip not started properly');
    }

    // Validate mileage
    if (endingMileage <= trip.startingMileage) {
      throw ApiError.badRequest('Ending mileage must be greater than starting mileage');
    }

    // Update trip
    trip.endingMileage = endingMileage;
    trip.odometerEndPhoto = odometerEndPhoto;
    trip.totalMiles = endingMileage - trip.startingMileage;
    trip.totalEarnings = trip.totalMiles * trip.ratePerMile;
    trip.status = TripStatus.COMPLETED;
    trip.completedAt = new Date();

    // Add expenses
    if (expenses && expenses.length > 0) {
      trip.expenses.push(...expenses);
      trip.totalExpenses = trip.expenses.reduce((sum, exp) => sum + exp.amount, 0);
    }

    // Add documents
    if (documents) {
      if (documents.billOfLading) {
        trip.documents.push({
          type: 'bill_of_lading',
          url: documents.billOfLading,
          fileName: 'Bill of Lading',
          uploadedAt: new Date(),
        });
      }
      if (documents.proofOfDelivery) {
        trip.documents.push({
          type: 'proof_of_delivery',
          url: documents.proofOfDelivery,
          fileName: 'Proof of Delivery',
          uploadedAt: new Date(),
        });
      }
      if (documents.other && documents.other.length > 0) {
        documents.other.forEach((doc: string, idx: number) => {
          trip.documents.push({
            type: 'other',
            url: doc,
            fileName: `Additional Document ${idx + 1}`,
            uploadedAt: new Date(),
          });
        });
      }
    }

    if (notes) {
      trip.notes = notes;
    }

    await trip.save();

    // Update load status
    await Load.findByIdAndUpdate(trip.loadId, { status: 'delivered' });

    // Update driver status
    await Driver.findByIdAndUpdate(trip.driverId, {
      status: 'available',
      currentLoadId: null,
    });

    return ApiResponse.success(res, trip, 'Trip completed successfully');
  });

  /**
   * Get driver's current active trip
   */
  static getCurrentTrip = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.id;
    if (!userId) {
      throw ApiError.unauthorized('User ID not found');
    }

    const driver = await Driver.findOne({ userId });
    if (!driver) {
      throw ApiError.notFound('Driver record not found');
    }

    const trip = await Trip.findOne({
      driverId: driver._id.toString(),
      status: { $in: [TripStatus.IN_PROGRESS, TripStatus.AT_SHIPPER, TripStatus.IN_TRANSIT] },
    })
      .populate('loadId')
      .populate('truckId')
      .populate('trailerId')
      .sort({ createdAt: -1 });

    if (!trip) {
      return ApiResponse.success(res, null, 'No active trip found');
    }

    return ApiResponse.success(res, trip, 'Current trip fetched successfully');
  });

  /**
   * Get trip history for driver
   */
  static getTripHistory = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.id;
    if (!userId) {
      throw ApiError.unauthorized('User ID not found');
    }

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;

    const driver = await Driver.findOne({ userId });
    if (!driver) {
      throw ApiError.notFound('Driver record not found');
    }

    const [trips, total] = await Promise.all([
      Trip.find({ driverId: driver._id.toString() })
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .populate('loadId', 'loadNumber pickupLocation deliveryLocation')
        .populate('truckId', 'truckNumber')
        .populate('trailerId', 'trailerNumber'),
      Trip.countDocuments({ driverId: driver._id.toString() }),
    ]);

    return ApiResponse.success(res, {
      trips,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    }, 'Trip history fetched successfully');
  });

  /**
   * Get trip by ID
   */
  static getTripById = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;

    const trip = await Trip.findById(id)
      .populate('loadId')
      .populate('driverId')
      .populate('truckId')
      .populate('trailerId')
      .populate('assignmentId');

    if (!trip) {
      throw ApiError.notFound('Trip not found');
    }

    return ApiResponse.success(res, trip, 'Trip fetched successfully');
  });

  /**
   * Update trip status
   */
  static updateTripStatus = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { status } = req.body;

    if (!Object.values(TripStatus).includes(status)) {
      throw ApiError.badRequest('Invalid trip status');
    }

    const trip = await Trip.findByIdAndUpdate(
      id,
      { status },
      { new: true }
    );

    if (!trip) {
      throw ApiError.notFound('Trip not found');
    }

    return ApiResponse.success(res, trip, 'Trip status updated successfully');
  });
}
