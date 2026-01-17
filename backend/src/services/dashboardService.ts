import { Load } from '../models/Load.model';
import { Driver, DriverStatus } from '../models/Driver.model';
import Truck from '../models/Truck';
import DashboardWidget from '../models/Dashboard';
import Invoice from '../models/Invoice';
import Expense from '../models/Expense';
import { startOfDay, endOfDay, subDays, subMonths, startOfMonth, endOfMonth } from 'date-fns';

export class DashboardService {
  async getOwnerDashboard(_userId: string, companyId: string, dateRange: string = 'today') {
    const { startDate, endDate } = this.getDateRange(dateRange);

    const [
      kpis,
      loadStatus,
      recentActivity,
      criticalTrips,
      invoices,
      financialMetrics,
      operationalMetrics,
    ] = await Promise.all([
      this.getKPIs(companyId, startDate, endDate),
      this.getLoadStatus(companyId),
      this.getRecentActivity(companyId, 10),
      this.getCriticalTrips(companyId),
      this.getInvoicesSummary(companyId),
      this.getFinancialMetrics(companyId, startDate, endDate),
      this.getOperationalMetrics(companyId, startDate, endDate),
    ]);

    return {
      currentDateTime: new Date().toISOString(),
      kpis,
      loadStatus,
      recentActivity,
      criticalTrips,
      invoices,
      financialMetrics,
      operationalMetrics,
    };
  }

  // Get accountant dashboard data - automatic aggregation
  async getAccountantDashboard(_userId: string, companyId: string, dateRange: string = 'month') {
    const { startDate, endDate } = this.getDateRange(dateRange);

    const [
      driverAssignments,
      payments,
      documents,
      expenses,
      invoices,
      profitLoss,
    ] = await Promise.all([
      this.getDriverAssignments(companyId, startDate, endDate),
      this.getPaymentsSummary(companyId, startDate, endDate),
      this.getDocumentsSummary(companyId, startDate, endDate),
      this.getExpensesSummary(companyId, startDate, endDate),
      this.getInvoicesDetailed(companyId, startDate, endDate),
      this.getProfitLoss(companyId, startDate, endDate),
    ]);

    return {
      currentDateTime: new Date().toISOString(),
      dateRange: { startDate, endDate },
      driverAssignments,
      payments,
      documents,
      expenses,
      invoices,
      profitLoss,
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
      Driver.countDocuments({ companyId, status: { $in: [DriverStatus.ACTIVE, DriverStatus.ON_TRIP] } }),
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
        expectedDeliveryDate: { $lt: new Date() },
      }),
      Driver.countDocuments({ companyId, status: DriverStatus.ACTIVE }),
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
        expectedDeliveryDate: { $lt: new Date() },
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
        { expectedDeliveryDate: { $lt: now } },
        { expectedDeliveryDate: { $lt: new Date(now.getTime() + 2 * 60 * 60 * 1000) } },
      ],
    })
      .populate('driverId', 'name')
      .populate('truckId', 'unitNumber')
      .limit(10)
      .lean();

    return criticalLoads.map((load: any) => {
      const isLate = new Date(load.expectedDeliveryDate) < now;
      return {
        id: load._id.toString(),
        type: isLate ? 'RUNNING_LATE' : 'TIME_CRITICAL',
        severity: isLate ? 'critical' : 'warning',
        tripId: load.loadNumber,
        message: isLate ? 'Running Late' : 'Approaching Deadline',
        route: `${load.pickupLocation?.city || 'N/A'}, ${load.pickupLocation?.state || 'N/A'} → ${load.deliveryLocation?.city || 'N/A'}, ${load.deliveryLocation?.state || 'N/A'}`,
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
    let endDate = endOfDay(now);

    switch (range) {
      case 'week':
        startDate = startOfDay(subDays(now, 7));
        endDate = endOfDay(now);
        break;
      case 'month':
        startDate = startOfMonth(now);
        endDate = endOfMonth(now);
        break;
      case 'today':
      default:
        startDate = startOfDay(now);
        endDate = endOfDay(now);
        break;
    }

    return { startDate, endDate };
  }

  // Get invoices summary (paid/unpaid)
  private async getInvoicesSummary(companyId: string) {
    const [totalInvoices, paidInvoices, unpaidInvoices, overdueInvoices] = await Promise.all([
      Invoice.countDocuments({ companyId }),
      Invoice.countDocuments({ companyId, status: 'paid' }),
      Invoice.countDocuments({ companyId, status: { $in: ['draft', 'submitted'] } }),
      Invoice.countDocuments({ companyId, status: 'overdue' }),
    ]);

    const [totalAmount, paidAmount, unpaidAmount] = await Promise.all([
      Invoice.aggregate([
        { $match: { companyId } },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]),
      Invoice.aggregate([
        { $match: { companyId, status: 'paid' } },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]),
      Invoice.aggregate([
        { $match: { companyId, status: { $in: ['draft', 'submitted', 'overdue'] } } },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]),
    ]);

    return {
      total: totalInvoices,
      paid: paidInvoices,
      unpaid: unpaidInvoices,
      overdue: overdueInvoices,
      totalAmount: totalAmount[0]?.total || 0,
      paidAmount: paidAmount[0]?.total || 0,
      unpaidAmount: unpaidAmount[0]?.total || 0,
    };
  }

  // Get financial metrics (profit, revenue, expenses)
  private async getFinancialMetrics(companyId: string, startDate: Date, endDate: Date) {
    // Get completed loads for revenue
    const completedLoads = await Load.find({
      companyId,
      status: 'completed',
      completedAt: { $gte: startDate, $lte: endDate },
    }).lean();

    // Calculate revenue from loads (rate + additional charges)
    let totalRevenue = 0;
    let totalExpenses = 0;
    let totalDistanceKm = 0;
    let totalDistanceMiles = 0;

    completedLoads.forEach((load: any) => {
      // Revenue from load rate
      totalRevenue += load.rate || 0;
      
      // Expenses from trip completion details
      if (load.tripCompletionDetails?.expenses) {
        totalExpenses += load.tripCompletionDetails.expenses.totalExpenses || 0;
      }
      
      // Distance tracking
      if (load.tripCompletionDetails?.totalMiles) {
        totalDistanceMiles += load.tripCompletionDetails.totalMiles;
        totalDistanceKm += load.tripCompletionDetails.totalMiles * 1.60934; // Convert to km
      } else if (load.distance) {
        totalDistanceMiles += load.distance;
        totalDistanceKm += load.distance * 1.60934;
      }
    });

    // Get additional expenses
    const additionalExpenses = await Expense.aggregate([
      {
        $match: {
          companyId,
          status: 'approved',
          date: { $gte: startDate, $lte: endDate },
        },
      },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]);

    totalExpenses += additionalExpenses[0]?.total || 0;

    const totalProfit = totalRevenue - totalExpenses;
    const profitMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;

    return {
      totalRevenue,
      totalExpenses,
      totalProfit,
      profitMargin: Math.round(profitMargin * 100) / 100,
      totalDistanceKm: Math.round(totalDistanceKm * 100) / 100,
      totalDistanceMiles: Math.round(totalDistanceMiles * 100) / 100,
    };
  }

  // Get operational metrics (loads, drivers, distance)
  private async getOperationalMetrics(companyId: string, startDate: Date, endDate: Date) {
    const [
      totalLoads,
      assignedDrivers,
      totalDistance,
      completedLoads,
    ] = await Promise.all([
      Load.countDocuments({ companyId }),
      Load.countDocuments({
        companyId,
        status: { $in: ['assigned', 'trip_accepted', 'trip_started', 'shipper_check_in', 'shipper_load_in', 'shipper_load_out', 'in_transit', 'receiver_check_in', 'receiver_offload'] },
        driverId: { $exists: true, $ne: null },
      }),
      Load.aggregate([
        {
          $match: {
            companyId,
            status: 'completed',
            completedAt: { $gte: startDate, $lte: endDate },
          },
        },
        {
          $group: {
            _id: null,
            totalMiles: {
              $sum: {
                $ifNull: ['$tripCompletionDetails.totalMiles', { $ifNull: ['$distance', 0] }],
              },
            },
          },
        },
      ]),
      Load.countDocuments({
        companyId,
        status: 'completed',
        completedAt: { $gte: startDate, $lte: endDate },
      }),
    ]);

    return {
      totalLoads,
      assignedDrivers,
      completedLoads,
      totalDistanceMiles: totalDistance[0]?.totalMiles || 0,
      totalDistanceKm: ((totalDistance[0]?.totalMiles || 0) * 1.60934).toFixed(2),
    };
  }

  // Accountant dashboard methods
  private async getDriverAssignments(companyId: string, startDate: Date, endDate: Date) {
    const assignments = await Load.find({
      companyId,
      assignedAt: { $gte: startDate, $lte: endDate },
      driverId: { $exists: true, $ne: null },
    })
      .populate('driverId', 'name phone licenseNumber')
      .populate('truckId', 'unitNumber make model')
      .lean();

    return assignments.map((load: any) => ({
      loadNumber: load.loadNumber,
      driverName: load.driverId?.name || 'N/A',
      driverPhone: load.driverId?.phone || 'N/A',
      truckNumber: load.truckId?.unitNumber || 'N/A',
      assignedAt: load.assignedAt,
      status: load.status,
      rate: load.rate,
    }));
  }

  private async getPaymentsSummary(companyId: string, startDate: Date, endDate: Date) {
    const payments = await Load.find({
      companyId,
      status: 'completed',
      tripCompletionDetails: { $exists: true },
      completedAt: { $gte: startDate, $lte: endDate },
    })
      .populate('driverId', 'name')
      .lean();

    return payments.map((load: any) => ({
      loadNumber: load.loadNumber,
      driverName: load.driverId?.name || 'N/A',
      totalPayment: load.tripCompletionDetails?.totalPayment || 0,
      payPerMile: load.tripCompletionDetails?.rate || 0,
      totalMiles: load.tripCompletionDetails?.totalMiles || 0,
      paymentDate: load.tripCompletionDetails?.completedAt || load.completedAt,
    }));
  }

  private async getDocumentsSummary(companyId: string, startDate: Date, endDate: Date) {
    const loads = await Load.find({
      companyId,
      completedAt: { $gte: startDate, $lte: endDate },
      status: 'completed',
    }).lean();

    const bolCount = loads.filter((load: any) => load.documents?.bol || load.shipperLoadOutDetails?.bolDocument).length;
    const podCount = loads.filter((load: any) => load.documents?.pod || load.receiverOffloadDetails?.podDocument || load.receiverOffloadDetails?.podPhoto).length;

    return {
      totalLoads: loads.length,
      bolDocuments: bolCount,
      podDocuments: podCount,
      missingBol: loads.length - bolCount,
      missingPod: loads.length - podCount,
    };
  }

  private async getExpensesSummary(companyId: string, startDate: Date, endDate: Date) {
    const expenses = await Expense.find({
      companyId,
      date: { $gte: startDate, $lte: endDate },
    })
      .populate('loadId', 'loadNumber')
      .populate('driverId', 'name')
      .lean();

    const total = expenses.reduce((sum: number, exp: any) => sum + (exp.amount || 0), 0);
    const byCategory = expenses.reduce((acc: any, exp: any) => {
      acc[exp.category] = (acc[exp.category] || 0) + (exp.amount || 0);
      return acc;
    }, {});

    return {
      total,
      count: expenses.length,
      byCategory,
      expenses: expenses.slice(0, 50), // Latest 50 expenses
    };
  }

  private async getInvoicesDetailed(companyId: string, startDate: Date, endDate: Date) {
    return await Invoice.find({
      companyId,
      invoiceDate: { $gte: startDate, $lte: endDate },
    })
      .populate('loadId', 'loadNumber')
      .sort({ invoiceDate: -1 })
      .lean();
  }

  private async getProfitLoss(companyId: string, startDate: Date, endDate: Date) {
    const { totalRevenue, totalExpenses, totalProfit } = await this.getFinancialMetrics(companyId, startDate, endDate);

    return {
      revenue: totalRevenue,
      expenses: totalExpenses,
      profit: totalProfit,
      margin: totalRevenue > 0 ? ((totalProfit / totalRevenue) * 100).toFixed(2) : '0.00',
    };
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