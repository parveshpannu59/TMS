import Assignment, { AssignmentStatus } from '../models/Assignment';
import { Load } from '../models/Load.model';
import Notification, { NotificationType } from '../models/Notification';
import { IAssignment } from '../models/Assignment';

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
      truckId: data.truckId,
      trailerId: data.trailerId,
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
    await Load.findByIdAndUpdate(
      assignment.loadId,
      { status: 'trip_accepted' },
      { new: true }
    );

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

    // Revert load status back to 'booked' or 'rate_confirmed'
    await Load.findByIdAndUpdate(
      assignment.loadId,
      { status: 'booked', driverId: undefined },
      { new: true }
    );

    // Notify dispatcher
    await this.createNotification({
      userId: assignment.assignedBy.toString(),
      type: NotificationType.WARNING,
      title: 'Assignment Rejected',
      message: `Driver has rejected the assignment for Load #${assignment.loadId}. Reason: ${reason || 'Not provided'}`,
      data: {
        loadId: assignment.loadId.toString(),
        assignmentId: assignmentId,
        driverId: driverId,
        status: 'rejected',
        reason,
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
      const notification = new Notification({
        userId: data.userId,
        companyId: process.env.DEFAULT_COMPANY_ID || '000000000000000000000001',
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
