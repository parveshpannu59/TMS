import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { ApiResponse } from '../utils/ApiResponse';
import { ApiError } from '../utils/ApiError';
import SOSEmergency, { SOSStatus } from '../models/SOSEmergency';
import { Driver } from '../models/Driver.model';
import { User } from '../models/User.model';
import Notification from '../models/Notification';
import { NotificationPriority, NotificationType } from '../models/Notification';

export class SOSController {
  /**
   * Create SOS emergency alert
   */
  static createSOS = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.id;
    if (!userId) {
      throw ApiError.unauthorized('User ID not found');
    }

    const { message, location, loadId, tripId } = req.body;

    // Get driver record
    const driver = await Driver.findOne({ userId });
    if (!driver) {
      throw ApiError.notFound('Driver record not found');
    }

    // Get user to get company info
    const user = await User.findById(userId);
    if (!user) {
      throw ApiError.notFound('User not found');
    }

    // Get emergency contacts (owner and dispatchers)
    // In production, this should come from driver's emergency contact settings
    const emergencyContacts = await User.find({
      companyId: user.companyId,
      role: { $in: ['owner', 'dispatcher'] },
    });

    const contactIds = emergencyContacts.map((c: any) => c._id);

    // Create SOS record
    const sos = await SOSEmergency.create({
      driverId: driver._id.toString(),
      loadId,
      tripId,
      message,
      location,
      status: SOSStatus.ACTIVE,
      contactsNotified: contactIds,
    });

    // Send notifications to emergency contacts
    const notificationPromises = emergencyContacts.map((contact: any) => 
      Notification.create({
        companyId: (user.companyId as any),
        userId: contact._id,
        type: NotificationType.ERROR,
        priority: NotificationPriority.URGENT,
        title: '🚨 EMERGENCY SOS ALERT',
        message: `Driver emergency: ${message}`,
        metadata: {
          sosId: sos._id?.toString(),
          driverId: driver._id.toString(),
          loadId,
          tripId,
          location,
        },
        read: false,
      })
    );

    await Promise.all(notificationPromises);

    return ApiResponse.success(res, sos, 'SOS emergency alert sent successfully', 201);
  });

  /**
   * Acknowledge SOS
   */
  static acknowledgeSOS = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const userId = req.user?.id;
    if (!userId) {
      throw ApiError.unauthorized('User ID not found');
    }

    const sos = await SOSEmergency.findById(id);
    if (!sos) {
      throw ApiError.notFound('SOS emergency not found');
    }

    if (sos.status !== SOSStatus.ACTIVE) {
      throw ApiError.badRequest('SOS already acknowledged or resolved');
    }

    sos.status = SOSStatus.ACKNOWLEDGED;
    sos.acknowledgedBy = userId;
    sos.acknowledgedAt = new Date();
    await sos.save();

    return ApiResponse.success(res, sos, 'SOS acknowledged successfully');
  });

  /**
   * Resolve SOS
   */
  static resolveSOS = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const userId = req.user?.id;
    const { resolutionNotes } = req.body;

    if (!userId) {
      throw ApiError.unauthorized('User ID not found');
    }

    const sos = await SOSEmergency.findById(id);
    if (!sos) {
      throw ApiError.notFound('SOS emergency not found');
    }

    sos.status = SOSStatus.RESOLVED;
    sos.resolvedBy = userId;
    sos.resolvedAt = new Date();
    sos.resolutionNotes = resolutionNotes;
    await sos.save();

    return ApiResponse.success(res, sos, 'SOS resolved successfully');
  });

  /**
   * Get active SOS alerts
   */
  static getActiveSOS = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.id;
    if (!userId) {
      throw ApiError.unauthorized('User ID not found');
    }

    const user = await User.findById(userId);
    if (!user) {
      throw ApiError.notFound('User not found');
    }

    const sosAlerts = await SOSEmergency.find({
      status: { $in: [SOSStatus.ACTIVE, SOSStatus.ACKNOWLEDGED] },
      contactsNotified: userId,
    })
      .populate('driverId', 'name phone')
      .populate('loadId', 'loadNumber')
      .populate('tripId')
      .sort({ createdAt: -1 });

    return ApiResponse.success(res, sosAlerts, 'Active SOS alerts fetched successfully');
  });

  /**
   * Get driver's SOS history
   */
  static getDriverSOSHistory = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.id;
    if (!userId) {
      throw ApiError.unauthorized('User ID not found');
    }

    const driver = await Driver.findOne({ userId });
    if (!driver) {
      throw ApiError.notFound('Driver record not found');
    }

    const sosHistory = await SOSEmergency.find({ driverId: driver._id.toString() })
      .sort({ createdAt: -1 })
      .limit(50);

    return ApiResponse.success(res, sosHistory, 'SOS history fetched successfully');
  });
}
