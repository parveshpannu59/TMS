export interface KPIData {
    activeLoadsCount: number;
    runningLateCount: number;
    totalDrivers: number;
    availableDrivers: number;
    totalTrucks: number;
    operationalTrucks: number;
    completedToday: number;
    onTrack: number;
    trends: {
      loads: number;
      drivers: number;
      trucks: number;
    };
  }
  
  export interface LoadStatusByStage {
    booked: number;
    assigned: number;
    tripAccepted: number;
    tripStarted: number;
    shipperCheckIn: number;
    shipperLoadIn: number;
    shipperLoadOut: number;
    inTransit: number;
    receiverCheckIn: number;
    receiverOffload: number;
    completed: number;
  }

  export interface LoadStatus {
    pending: number;
    inTransit: number;
    delayed: number;
    byStatus?: LoadStatusByStage;
  }
  
  export interface Activity {
    id: string;
    message: string;
    timestamp: string;
    type: 'success' | 'info' | 'warning' | 'error';
  }
  
  export interface CriticalTrip {
    id: string;
    type: string;
    severity: 'critical' | 'warning' | 'info';
    tripId: string;
    message: string;
    route: string;
    timestamp: string;
    driverName?: string;
    truckNumber?: string;
  }
  
  export interface DashboardData {
    currentDateTime: string;
    kpis: KPIData;
    loadStatus: LoadStatus;
    recentActivity: Activity[];
    criticalTrips: CriticalTrip[];
  }
  
  export interface DashboardWidget {
    widgetId: string;
    type: 'kpi' | 'chart' | 'list' | 'table';
    title: string;
    position: { x: number; y: number; w: number; h: number };
    visible: boolean;
    settings?: Record<string, any>;
  }