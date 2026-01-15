import Load from '../models/Load';
import Driver from '../models/Driver';
import Truck from '../models/Truck';
import DashboardWidget from '../models/Dashboard';
import { startOfDay, endOfDay, subDays, subMonths } from 'date-fns';

export class DashboardService {
  async getOwnerDashboard(_userId: string, companyId: string, dateRange: string = 'today') {
    const { startDate, endDate } = this.getDateRange(dateRange);

    const [kpis, loadStatus, recentActivity, criticalTrips] = await Promise.all([
      this.getKPIs(companyId, startDate, endDate),
      this.getLoadStatus(companyId),
      this.getRecentActivity(companyId, 10),
      this.getCriticalTrips(companyId),
    ]);

    return {
      currentDateTime: new Date().toISOString(),
      kpis,
      loadStatus,
      recentActivity,
      criticalTrips,
    };
  }

  private async getKPIs(companyId: string, startDate: Date, endDate: Date) {
    const [
      activeLoads,
      totalDrivers,
      totalTrucks,
      completedToday,
      previousPeriodLoads,
      previousPeriodDrivers,
      previousPeriodTrucks,
    ] = await Promise.all([
      Load.countDocuments({
        companyId,
        status: { $in: ['assigned', 'in_transit'] },
      }),
      Driver.countDocuments({ companyId, status: { $ne: 'on_leave' } }),
      Truck.countDocuments({ companyId, status: { $ne: 'out_of_service' } }),
      Load.countDocuments({
        companyId,
        status: 'completed',
        updatedAt: { $gte: startDate, $lte: endDate },
      }),
      Load.countDocuments({
        companyId,
        createdAt: { $gte: subMonths(startDate, 1), $lte: subMonths(endDate, 1) },
      }),
      Driver.countDocuments({
        companyId,
        createdAt: { $lte: subMonths(endDate, 1) },
      }),
      Truck.countDocuments({
        companyId,
        createdAt: { $lte: subMonths(endDate, 1) },
      }),
    ]);

    const [runningLate, availableDrivers, operationalTrucks] = await Promise.all([
      Load.countDocuments({
        companyId,
        status: 'in_transit',
        deliveryDate: { $lt: new Date() },
      }),
      Driver.countDocuments({ companyId, status: 'available' }),
      Truck.countDocuments({ companyId, status: 'available' }),
    ]);

    const calculateTrend = (current: number, previous: number) =>
      previous > 0 ? Math.round(((current - previous) / previous) * 100) : 0;

    return {
      activeLoadsCount: activeLoads,
      runningLateCount: runningLate,
      totalDrivers,
      availableDrivers,
      totalTrucks,
      operationalTrucks,
      completedToday,
      onTrack: completedToday,
      trends: {
        loads: calculateTrend(activeLoads, previousPeriodLoads),
        drivers: calculateTrend(totalDrivers, previousPeriodDrivers),
        trucks: calculateTrend(totalTrucks, previousPeriodTrucks),
      },
    };
  }

  private async getLoadStatus(companyId: string) {
    const [pending, inTransit, delayed] = await Promise.all([
      Load.countDocuments({ companyId, status: 'booked' }),
      Load.countDocuments({ companyId, status: 'in_transit' }),
      Load.countDocuments({
        companyId,
        status: 'in_transit',
        deliveryDate: { $lt: new Date() },
      }),
    ]);

    return { pending, inTransit, delayed };
  }

  private async getRecentActivity(companyId: string, limit: number) {
    const recentLoads = await Load.find({ companyId })
      .sort({ updatedAt: -1 })
      .limit(limit)
      .populate('driverId', 'name')
      .lean();

    return recentLoads.map((load: any) => ({
      id: load._id.toString(),
      message: this.generateActivityMessage(load),
      timestamp: load.updatedAt,
      type: this.getActivityType(load.status),
    }));
  }

  private async getCriticalTrips(companyId: string) {
    const now = new Date();
    const criticalLoads = await Load.find({
      companyId,
      status: 'in_transit',
      $or: [
        { deliveryDate: { $lt: now } },
        { deliveryDate: { $lt: new Date(now.getTime() + 2 * 60 * 60 * 1000) } },
      ],
    })
      .populate('driverId', 'name')
      .populate('truckId', 'unitNumber')
      .limit(10)
      .lean();

    return criticalLoads.map((load: any) => {
      const isLate = new Date(load.deliveryDate) < now;
      return {
        id: load._id.toString(),
        type: isLate ? 'RUNNING_LATE' : 'TIME_CRITICAL',
        severity: isLate ? 'critical' : 'warning',
        tripId: load.loadNumber,
        message: isLate ? 'Running Late' : 'Approaching Deadline',
        route: `${load.origin.city}, ${load.origin.state} → ${load.destination.city}, ${load.destination.state}`,
        timestamp: this.getTimeAgo(load.updatedAt),
        driverName: load.driverId?.name || 'Unassigned',
        truckNumber: load.truckId?.unitNumber || 'N/A',
      };
    });
  }

  private generateActivityMessage(load: any): string {
    switch (load.status) {
      case 'completed':
        return `Load #${load.loadNumber} delivered successfully`;
      case 'in_transit':
        return `Load #${load.loadNumber} is in transit`;
      case 'assigned':
        return `Load #${load.loadNumber} assigned to ${load.driverId?.name || 'driver'}`;
      default:
        return `Load #${load.loadNumber} ${load.status}`;
    }
  }

  private getActivityType(status: string): 'success' | 'info' | 'warning' | 'error' {
    switch (status) {
      case 'completed':
        return 'success';
      case 'in_transit':
        return 'info';
      case 'assigned':
        return 'info';
      default:
        return 'warning';
    }
  }

  private getTimeAgo(date: Date): string {
    const seconds = Math.floor((new Date().getTime() - new Date(date).getTime()) / 1000);
    
    if (seconds < 60) return `${seconds} sec ago`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)} min ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)} hr ago`;
    return `${Math.floor(seconds / 86400)} days ago`;
  }

  private getDateRange(range: string) {
    const now = new Date();
    let startDate = startOfDay(now);
    const endDate = endOfDay(now);

    switch (range) {
      case 'week':
        startDate = subDays(now, 7);
        break;
      case 'month':
        startDate = subMonths(now, 1);
        break;
      case 'today':
      default:
        break;
    }

    return { startDate, endDate };
  }

  // Dashboard Layout Management
  async getUserWidgets(userId: string) {
    return await DashboardWidget.find({ userId }).lean();
  }

  async saveUserWidgets(userId: string, widgets: any[]) {
    await DashboardWidget.deleteMany({ userId });
    const widgetDocs = widgets.map(w => ({ ...w, userId }));
    return await DashboardWidget.insertMany(widgetDocs);
  }

  async resetUserWidgets(userId: string) {
    await DashboardWidget.deleteMany({ userId });
    return this.getDefaultWidgets();
  }

  private getDefaultWidgets() {
    return [
      { widgetId: 'kpi-loads', type: 'kpi', title: 'Active Loads', position: { x: 0, y: 0, w: 3, h: 1 }, visible: true },
      { widgetId: 'kpi-drivers', type: 'kpi', title: 'Total Drivers', position: { x: 3, y: 0, w: 3, h: 1 }, visible: true },
      { widgetId: 'kpi-trucks', type: 'kpi', title: 'Total Trucks', position: { x: 6, y: 0, w: 3, h: 1 }, visible: true },
      { widgetId: 'kpi-completed', type: 'kpi', title: 'Completed Today', position: { x: 9, y: 0, w: 3, h: 1 }, visible: true },
      { widgetId: 'load-status', type: 'chart', title: 'Load Status', position: { x: 0, y: 1, w: 6, h: 2 }, visible: true },
      { widgetId: 'recent-activity', type: 'list', title: 'Recent Activity', position: { x: 6, y: 1, w: 6, h: 2 }, visible: true },
      { widgetId: 'critical-trips', type: 'list', title: 'Critical Trips', position: { x: 0, y: 3, w: 12, h: 2 }, visible: true },
    ];
  }
}

export default new DashboardService();