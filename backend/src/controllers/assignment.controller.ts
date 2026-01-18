import { Request, Response } from 'express';
import AssignmentService from '../services/assignment.service';
import Assignment from '../models/Assignment';
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

    const assignments = await AssignmentService.getPendingAssignments(userId);
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

    const assignment = await AssignmentService.acceptAssignment(id, userId);
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

    const assignment = await AssignmentService.rejectAssignment(id, userId, reason);
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
