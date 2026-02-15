import Assignment, { AssignmentStatus } from '../models/Assignment';
import { Load, LoadStatus } from '../models/Load.model';
import Notification, { NotificationType } from '../models/Notification';
import { IAssignment } from '../models/Assignment';
import { Driver, DriverStatus } from '../models/Driver.model';
import Truck from '../models/Truck';
import Trailer from '../models/Trailer';

export class AssignmentService {
  /**
   * Create an assignment (assign load to driver/truck/trailer)
   */
  async createAssignment(data: {
    loadId: string;
    driverId: string;
    truckId?: string;
    trailerId?: string;
    assignedBy: string;
    expiresIn?: number; // hours
  }): Promise<IAssignment> {
    const expiresAt = data.expiresIn
      ? new Date(Date.now() + data.expiresIn * 60 * 60 * 1000)
      : new Date(Date.now() + 24 * 60 * 60 * 1000); // Default 24 hours

    const assignment = new Assignment({
      loadId: data.loadId,
      driverId: data.driverId,
      ...(data.truckId ? { truckId: data.truckId } : {}),
      ...(data.trailerId ? { trailerId: data.trailerId } : {}),
      assignedBy: data.assignedBy,
      status: AssignmentStatus.PENDING,
      expiresAt,
    });

    const saved = await assignment.save();

    // Populate references
    await saved.populate([
      { path: 'loadId', select: 'loadNumber origin destination pickupDate' },
      { path: 'driverId', select: 'name email phone' },
      { path: 'truckId', select: 'unitNumber make model' },
      { path: 'trailerId', select: 'unitNumber type' },
      { path: 'assignedBy', select: 'name email' },
    ]);

    return saved;
  }

  /**
   * Get assignments for a driver
   */
  async getDriverAssignments(driverId: string): Promise<IAssignment[]> {
    return Assignment.find({ driverId })
      .sort({ createdAt: -1 })
      .populate([
        { path: 'loadId' },
        { path: 'driverId' },
        { path: 'truckId' },
        { path: 'trailerId' },
        { path: 'assignedBy', select: 'name email' },
      ]);
  }

  /**
   * Get pending assignments for a driver (that haven't been accepted/rejected)
   */
  async getPendingAssignments(driverId: string): Promise<IAssignment[]> {
    return Assignment.find({
      driverId,
      status: AssignmentStatus.PENDING,
      expiresAt: { $gt: new Date() }, // Not expired
    })
      .sort({ createdAt: -1 })
      .populate([
        { path: 'loadId' },
        { path: 'driverId' },
        { path: 'truckId' },
        { path: 'trailerId' },
      ]);
  }

  /**
   * Get assignment by ID
   */
  async getAssignmentById(assignmentId: string): Promise<IAssignment | null> {
    return Assignment.findById(assignmentId)
      .populate([
        { path: 'loadId' },
        { path: 'driverId' },
        { path: 'truckId' },
        { path: 'trailerId' },
        { path: 'assignedBy', select: 'name email' },
      ]);
  }

  /**
   * Driver accepts assignment
   */
  async acceptAssignment(
    assignmentId: string,
    driverId: string
  ): Promise<IAssignment> {
    const assignment = await Assignment.findById(assignmentId);

    if (!assignment) {
      throw new Error('Assignment not found');
    }

    if (assignment.driverId.toString() !== driverId) {
      throw new Error('Unauthorized: This assignment is not for you');
    }

    if (assignment.status !== AssignmentStatus.PENDING) {
      throw new Error(`Cannot accept assignment with status: ${assignment.status}`);
    }

    // Update assignment
    assignment.status = AssignmentStatus.ACCEPTED;
    assignment.driverResponse = {
      status: AssignmentStatus.ACCEPTED,
      respondedAt: new Date(),
    };
    await assignment.save();

    // Update load status to 'trip_accepted'
    const load = await Load.findByIdAndUpdate(
      assignment.loadId,
      { status: LoadStatus.TRIP_ACCEPTED },
      { new: true }
    );

    // NOW activate driver, truck, and trailer (deferred from initial assignment)
    try {
      const driver = await Driver.findById(driverId);
      if (driver) {
        driver.status = DriverStatus.ON_TRIP;
        driver.currentLoadId = assignment.loadId.toString();
        await driver.save();
      }

      if (load?.truckId) {
        await Truck.findByIdAndUpdate(load.truckId, {
          status: 'on_road',
          currentLoadId: assignment.loadId.toString(),
          currentDriverId: driverId,
        });
      }

      if (load?.trailerId) {
        await Trailer.findByIdAndUpdate(load.trailerId, {
          status: 'on_road',
          currentLoadId: assignment.loadId.toString(),
        });
      }
    } catch (err) {
      console.error('Failed to update driver/vehicle statuses on acceptance:', err);
    }

    // Update the original "New Load Assigned" notification sent to driver
    try {
      const driver = await import('../models/Driver.model');
      const driverDoc = await driver.Driver.findById(driverId);
      if (driverDoc?.userId) {
        await Notification.updateMany(
          {
            userId: driverDoc.userId as any,
            'metadata.assignmentId': assignmentId,
            'metadata.loadId': assignment.loadId.toString(),
          },
          {
            $set: {
              read: true,
              'metadata.status': 'accepted',
              title: 'Assignment Accepted',
              message: `You have accepted the assignment for Load #${assignment.loadId}`,
            },
          }
        );
      }
    } catch (err) {
      console.error('Failed to update driver notification:', err);
    }

    // Notify dispatcher
    await this.createNotification({
      userId: assignment.assignedBy.toString(),
      type: NotificationType.LOAD,
      title: 'Assignment Accepted',
      message: `Driver has accepted the assignment for Load #${assignment.loadId}`,
      data: {
        loadId: assignment.loadId.toString(),
        assignmentId: assignmentId,
        driverId: driverId,
        status: 'accepted',
      },
    });

    return assignment.populate([
      { path: 'loadId' },
      { path: 'driverId' },
      { path: 'truckId' },
      { path: 'trailerId' },
    ]);
  }

  /**
   * Driver rejects assignment
   */
  async rejectAssignment(
    assignmentId: string,
    driverId: string,
    reason?: string
  ): Promise<IAssignment> {
    const assignment = await Assignment.findById(assignmentId);

    if (!assignment) {
      throw new Error('Assignment not found');
    }

    if (assignment.driverId.toString() !== driverId) {
      throw new Error('Unauthorized: This assignment is not for you');
    }

    if (assignment.status !== AssignmentStatus.PENDING) {
      throw new Error(`Cannot reject assignment with status: ${assignment.status}`);
    }

    // Update assignment
    assignment.status = AssignmentStatus.REJECTED;
    assignment.driverResponse = {
      status: AssignmentStatus.REJECTED,
      respondedAt: new Date(),
      reason,
    };
    await assignment.save();

    // Revert load — clear driver/truck/trailer and revert status to booked
    const load = await Load.findById(assignment.loadId);
    let loadNumber = '';
    let driverName = 'A driver';
    if (load) {
      loadNumber = load.loadNumber || assignment.loadId.toString();
      // Revert truck and trailer statuses to available
      if (load.truckId) {
        await Truck.findByIdAndUpdate(load.truckId, {
          status: 'available',
          $unset: { currentLoadId: 1, currentDriverId: 1 },
        });
      }
      if (load.trailerId) {
        await Trailer.findByIdAndUpdate(load.trailerId, {
          status: 'available',
          $unset: { currentLoadId: 1, currentTruckId: 1 },
        });
      }

      // Revert load
      load.status = LoadStatus.BOOKED;
      load.driverId = undefined as any;
      load.truckId = undefined as any;
      load.trailerId = undefined as any;
      await load.save();
    }

    // Get driver name for notification
    try {
      const driverDoc = await Driver.findById(driverId);
      if (driverDoc?.name) driverName = driverDoc.name;
    } catch (_) {}

    // Update the original "New Load Assigned" notification sent to driver
    try {
      const driverDoc = await Driver.findById(driverId);
      if (driverDoc?.userId) {
        await Notification.updateMany(
          {
            userId: driverDoc.userId as any,
            'metadata.assignmentId': assignmentId,
            'metadata.loadId': assignment.loadId.toString(),
          },
          {
            $set: {
              read: true,
              'metadata.status': 'rejected',
              title: 'Assignment Rejected',
              message: `You have rejected the assignment for Load #${loadNumber}`,
            },
          }
        );
      }
    } catch (err) {
      console.error('Failed to update driver notification:', err);
    }

    // Notify dispatcher — include loadNumber and action for auto-reassign on click
    await this.createNotification({
      userId: assignment.assignedBy.toString(),
      type: NotificationType.WARNING,
      title: 'Driver Declined Assignment',
      message: `${driverName} has declined Load #${loadNumber}. Please select another driver.${reason ? ` Reason: ${reason}` : ''}`,
      data: {
        loadId: assignment.loadId.toString(),
        loadNumber,
        assignmentId: assignmentId,
        driverId: driverId,
        status: 'rejected',
        action: 'reassign',
        reason,
      },
      actionUrl: '/loads',
    });

    return assignment.populate([
      { path: 'loadId' },
      { path: 'driverId' },
      { path: 'truckId' },
      { path: 'trailerId' },
    ]);
  }

  /**
   * Create a notification
   */
  private async createNotification(data: {
    userId: string;
    type: NotificationType;
    title: string;
    message: string;
    data?: any;
    actionUrl?: string;
  }): Promise<any> {
    try {
      // Resolve the correct companyId from the target user
      let companyId: string | undefined;
      try {
        const { User } = await import('../models/User.model');
        const targetUser = await User.findById(data.userId).select('companyId').lean();
        companyId = (targetUser as any)?.companyId?.toString();
      } catch (_) {}
      // Fallback: use the userId itself as companyId (owner's _id often equals companyId)
      if (!companyId) companyId = data.userId;

      const notification = new Notification({
        userId: data.userId,
        companyId,
        type: data.type,
        title: data.title,
        message: data.message,
        metadata: data.data,
        actionUrl: data.actionUrl || '/assignments',
        read: false,
      });

      return await notification.save();
    } catch (err) {
      console.error('Error creating notification:', err);
      // Don't throw - notification failure shouldn't block assignment flow
    }
  }
}

export default new AssignmentService();
