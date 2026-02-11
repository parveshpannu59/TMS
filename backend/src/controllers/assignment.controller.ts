import { Request, Response } from 'express';
import AssignmentService from '../services/assignment.service';
import Assignment from '../models/Assignment';
import { Driver } from '../models/Driver.model';
import { ApiError } from '../utils/ApiError';
import { asyncHandler } from '../utils/asyncHandler';
import { ApiResponse } from '../utils/ApiResponse';

export class AssignmentController {
  /**
   * Get pending assignments for current driver
   */
  static getPendingAssignments = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.id;
    if (!userId) {
      throw ApiError.unauthorized('User ID not found in request');
    }

    // Find driver profile for this user
    const driver = await Driver.findOne({ userId });
    console.log('🔍 Looking for driver with userId:', userId);
    console.log('✅ Found driver:', driver ? { _id: driver._id, name: driver.name, userId: driver.userId } : null);
    
    if (!driver) {
      throw ApiError.notFound('Driver profile not found');
    }

    const driverId = driver._id.toString();
    console.log('📍 Fetching pending assignments for driverId:', driverId);
    
    const assignments = await AssignmentService.getPendingAssignments(driverId);
    console.log('📦 Found assignments:', assignments.length);
    console.log('📋 Assignment details:', assignments);
    
    return ApiResponse.success(res, assignments, 'Pending assignments fetched successfully');
  });

  /**
   * Get all assignments for current driver (including history)
   */
  static getMyAssignments = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.id;
    if (!userId) {
      throw ApiError.unauthorized('User ID not found in request');
    }

    const assignments = await AssignmentService.getDriverAssignments(userId);
    return ApiResponse.success(res, assignments, 'Driver assignments fetched successfully');
  });

  /**
   * Get single assignment by ID
   */
  static getAssignment = asyncHandler(async (req: Request, res: Response) => {
    const id = String(req.params.id);

    const assignment = await AssignmentService.getAssignmentById(id);
    if (!assignment) {
      throw ApiError.notFound('Assignment not found');
    }

    return ApiResponse.success(res, assignment, 'Assignment fetched successfully');
  });

  /**
   * Driver accepts an assignment
   */
  static acceptAssignment = asyncHandler(async (req: Request, res: Response) => {
    const id = String(req.params.id);
    const userId = req.user?.id;
    if (!userId) {
      throw ApiError.unauthorized('User ID not found in request');
    }

    // Map user -> driver
    const driver = await Driver.findOne({ userId });
    if (!driver) {
      throw ApiError.notFound('Driver profile not found');
    }

    const assignment = await AssignmentService.acceptAssignment(id, driver._id.toString());

    // ─── 🔔 Pusher: Notify owner that driver accepted ───────
    try {
      const { broadcastAssignment } = require('../services/pusher.service');
      const companyId = req.user?.companyId || driver.createdBy;
      const loadDoc = assignment.loadId as any;
      await broadcastAssignment(companyId as string, userId as string, {
        assignmentId: id,
        loadId: loadDoc?._id?.toString() || '',
        loadNumber: loadDoc?.loadNumber || '',
        driverId: driver._id.toString(),
        driverName: driver.name,
        pickup: '',
        delivery: '',
        timestamp: new Date().toISOString(),
        action: 'accepted',
      });
    } catch (err) { console.warn('Pusher accept broadcast failed:', (err as Error).message); }

    return ApiResponse.success(res, assignment, 'Assignment accepted successfully');
  });

  /**
   * Driver rejects an assignment
   */
  static rejectAssignment = asyncHandler(async (req: Request, res: Response) => {
    const id = String(req.params.id);
    const userId = req.user?.id;
    if (!userId) {
      throw ApiError.unauthorized('User ID not found in request');
    }
    const { reason } = req.body;

    // Map user -> driver
    const driver = await Driver.findOne({ userId });
    if (!driver) {
      throw ApiError.notFound('Driver profile not found');
    }

    const assignment = await AssignmentService.rejectAssignment(id, driver._id.toString(), reason);

    // ─── 🔔 Pusher: Notify owner that driver rejected ───────
    try {
      const { broadcastAssignment } = require('../services/pusher.service');
      const companyId = req.user?.companyId || driver.createdBy;
      const loadDoc = assignment.loadId as any;
      await broadcastAssignment(companyId as string, userId as string, {
        assignmentId: id,
        loadId: loadDoc?._id?.toString() || '',
        loadNumber: loadDoc?.loadNumber || '',
        driverId: driver._id.toString(),
        driverName: driver.name,
        pickup: '',
        delivery: '',
        timestamp: new Date().toISOString(),
        action: 'rejected',
        reason,
      });
    } catch (err) { console.warn('Pusher reject broadcast failed:', (err as Error).message); }

    return ApiResponse.success(res, assignment, 'Assignment rejected successfully');
  });

  /**
   * Get all assignments (dispatcher/owner view)
   */
  static getAllAssignments = asyncHandler(async (req: Request, res: Response) => {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const { status, driverId, loadId } = req.query;

    const filter: any = {};
    if (status) filter.status = status;
    if (driverId) filter.driverId = driverId;
    if (loadId) filter.loadId = loadId;

    const [assignments, total] = await Promise.all([
      Assignment.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .populate([
          { path: 'loadId', select: 'loadNumber origin destination rate' },
          { path: 'driverId', select: 'name email phone' },
          { path: 'truckId', select: 'unitNumber make' },
          { path: 'trailerId', select: 'unitNumber type' },
          { path: 'assignedBy', select: 'name email' },
        ]),
      Assignment.countDocuments(filter),
    ]);

    return ApiResponse.success(
      res,
      {
        data: assignments,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      },
      'Assignments fetched successfully'
    );
  });
}

export default new AssignmentController();
