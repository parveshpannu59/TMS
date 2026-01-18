export enum TripStatus {
  NOT_STARTED = 'not_started',
  IN_PROGRESS = 'in_progress',
  AT_SHIPPER = 'at_shipper',
  LOADED = 'loaded',
  IN_TRANSIT = 'in_transit',
  AT_RECEIVER = 'at_receiver',
  OFFLOADED = 'offloaded',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

export enum ExpenseType {
  FUEL = 'fuel',
  TOLL = 'toll',
  LOADING = 'loading',
  OFFLOADING = 'offloading',
  OTHER = 'other',
}

export enum DocumentType {
  ODOMETER_START = 'odometer_start',
  ODOMETER_END = 'odometer_end',
  BILL_OF_LADING = 'bill_of_lading',
  PROOF_OF_DELIVERY = 'proof_of_delivery',
  OTHER = 'other',
}

export interface TripExpense {
  type: ExpenseType;
  amount: number;
  description?: string;
  receiptUrl?: string;
  location?: string;
  date: string;
}

export interface TripDocument {
  type: DocumentType;
  url: string;
  fileName: string;
  uploadedAt: string;
  description?: string;
}

export interface TripLocation {
  latitude: number;
  longitude: number;
  address?: string;
  timestamp: string;
}

export interface Trip {
  _id: string;
  loadId: string;
  driverId: string;
  truckId?: string;
  trailerId?: string;
  assignmentId: string;
  
  status: TripStatus;
  
  startingMileage?: number;
  endingMileage?: number;
  totalMiles?: number;
  odometerStartPhoto?: string;
  odometerEndPhoto?: string;
  
  ratePerMile: number;
  totalEarnings?: number;
  
  startedAt?: string;
  completedAt?: string;
  estimatedDeliveryTime?: string;
  
  currentLocation?: TripLocation;
  locationHistory: TripLocation[];
  distanceTraveled?: number;
  distanceRemaining?: number;
  
  expenses: TripExpense[];
  totalExpenses?: number;
  
  documents: TripDocument[];
  
  notes?: string;
  specialInstructions?: string;
  
  createdAt: string;
  updatedAt: string;
}

export interface StartTripData {
  loadId: string;
  assignmentId: string;
  startingMileage: number;
  odometerStartPhoto: File | string;
  notes?: string;
}

export interface UpdateTripLocationData {
  tripId: string;
  latitude: number;
  longitude: number;
  address?: string;
  distanceTraveled?: number;
  distanceRemaining?: number;
}

export interface EndTripData {
  tripId: string;
  endingMileage: number;
  odometerEndPhoto: File | string;
  expenses: TripExpense[];
  documents: {
    billOfLading?: File | string;
    proofOfDelivery?: File | string;
    other?: File[];
  };
  notes?: string;
}

export enum SOSStatus {
  ACTIVE = 'active',
  ACKNOWLEDGED = 'acknowledged',
  RESOLVED = 'resolved',
  CANCELLED = 'cancelled',
}

export interface SOSEmergency {
  _id: string;
  driverId: string;
  loadId?: string;
  tripId?: string;
  message: string;
  location: {
    latitude: number;
    longitude: number;
    address?: string;
  };
  status: SOSStatus;
  contactsNotified: string[];
  acknowledgedBy?: string;
  acknowledgedAt?: string;
  resolvedBy?: string;
  resolvedAt?: string;
  resolutionNotes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateSOSData {
  message: string;
  location: {
    latitude: number;
    longitude: number;
    address?: string;
  };
  loadId?: string;
  tripId?: string;
}
