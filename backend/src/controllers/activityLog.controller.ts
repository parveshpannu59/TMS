import { Request, Response } from 'express';
import ActivityLog from '../models/ActivityLog';
import { asyncHandler } from '../utils/asyncHandler';
import { ApiError } from '../utils/ApiError';
import { PaginationHelper } from '../utils/pagination';

/**
 * @desc Get activity logs
 * @route GET /api/activity-logs
 * @access Private
 */
export const getActivityLogs = asyncHandler(async (req: Request, res: Response) => {
  const companyId = req.user?.companyId;
  const { 
    page = 1, 
    limit = 50, 
    entity, 
    action, 
    entityId,
    startDate,
    endDate,
    search 
  } = req.query;

  // Build query
  const query: any = {};

  // Filter by company if user has one
  if (companyId) {
    query.companyId = companyId;
  }

  // Filter by entity type
  if (entity && entity !== 'all') {
    query.entity = entity;
  }

  // Filter by action type
  if (action && action !== 'all') {
    query.action = action;
  }

  // Filter by specific entity ID
  if (entityId) {
    query.entityId = entityId;
  }

  // Date range filter
  if (startDate || endDate) {
    query.createdAt = {};
    if (startDate) {
      query.createdAt.$gte = new Date(startDate as string);
    }
    if (endDate) {
      query.createdAt.$lte = new Date(endDate as string);
    }
  }

  // Search in description and entity name
  if (search) {
    query.$or = [
      { description: { $regex: search, $options: 'i' } },
      { entityName: { $regex: search, $options: 'i' } },
      { userName: { $regex: search, $options: 'i' } },
    ];
  }

  const result = await PaginationHelper.paginate(
    ActivityLog,
    query,
    { 
      page: Number(page), 
      limit: Number(limit), 
      sortBy: 'createdAt', 
      sortOrder: 'desc' 
    }
  );

  res.json({
    success: true,
    message: 'Activity logs retrieved successfully',
    data: result,
  });
});

/**
 * @desc Get activity log by ID
 * @route GET /api/activity-logs/:id
 * @access Private
 */
export const getActivityLogById = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const companyId = req.user?.companyId;

  const query: any = { _id: id };
  if (companyId) {
    query.companyId = companyId;
  }

  const activityLog = await ActivityLog.findOne(query);

  if (!activityLog) {
    throw ApiError.notFound('Activity log not found');
  }

  res.json({
    success: true,
    data: activityLog,
  });
});

/**
 * @desc Get activity logs for a specific entity
 * @route GET /api/activity-logs/entity/:entity/:entityId
 * @access Private
 */
export const getEntityActivityLogs = asyncHandler(async (req: Request, res: Response) => {
  const { entity, entityId } = req.params;
  const companyId = req.user?.companyId;
  const { page = 1, limit = 20 } = req.query;

  const query: any = {
    entity,
    entityId,
  };

  if (companyId) {
    query.companyId = companyId;
  }

  const result = await PaginationHelper.paginate(
    ActivityLog,
    query,
    { 
      page: Number(page), 
      limit: Number(limit), 
      sortBy: 'createdAt', 
      sortOrder: 'desc' 
    }
  );

  res.json({
    success: true,
    message: 'Entity activity logs retrieved successfully',
    data: result,
  });
});

/**
 * @desc Create activity log (internal use / middleware)
 * @route POST /api/activity-logs
 * @access Private
 */
export const createActivityLog = asyncHandler(async (req: Request, res: Response) => {
  const { action, entity, entityId, entityName, description, changes, metadata } = req.body;
  const userId = req.user?.id;
  const companyId = req.user?.companyId;

  if (!userId) {
    throw ApiError.unauthorized('User ID is required');
  }

  if (!action || !entity || !entityId || !entityName || !description) {
    throw ApiError.badRequest('Action, entity, entityId, entityName, and description are required');
  }

  // Get user details from request
  const userName = (req as any).user?.name || 'Unknown User';
  const userRole = (req as any).user?.role || 'Unknown Role';

  const logData: any = {
    userId,
    userName,
    userRole,
    action,
    entity,
    entityId,
    entityName,
    description,
    metadata: {
      ...metadata,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    },
  };

  if (companyId) {
    logData.companyId = companyId;
  }

  if (changes) {
    logData.changes = changes;
  }

  const activityLog = await ActivityLog.create(logData);

  res.status(201).json({
    success: true,
    message: 'Activity log created successfully',
    data: activityLog,
  });
});

/**
 * @desc Get activity statistics
 * @route GET /api/activity-logs/stats
 * @access Private
 */
export const getActivityStats = asyncHandler(async (req: Request, res: Response) => {
  const companyId = req.user?.companyId;
  const { startDate, endDate } = req.query;

  const query: any = {};
  
  if (companyId) {
    query.companyId = companyId;
  }

  if (startDate || endDate) {
    query.createdAt = {};
    if (startDate) {
      query.createdAt.$gte = new Date(startDate as string);
    }
    if (endDate) {
      query.createdAt.$lte = new Date(endDate as string);
    }
  }

  const [actionStats, entityStats, totalCount] = await Promise.all([
    ActivityLog.aggregate([
      { $match: query },
      { $group: { _id: '$action', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]),
    ActivityLog.aggregate([
      { $match: query },
      { $group: { _id: '$entity', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]),
    ActivityLog.countDocuments(query),
  ]);

  res.json({
    success: true,
    data: {
      totalCount,
      byAction: actionStats,
      byEntity: entityStats,
    },
  });
});
