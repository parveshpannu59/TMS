// LOAD TYPES
export enum LoadStatus {
    CREATED = 'created',
    ASSIGNED = 'assigned',
    IN_TRANSIT = 'in_transit',
    DELIVERED = 'delivered',
    COMPLETED = 'completed',
    CANCELLED = 'cancelled',
  }
  
  export enum LoadType {
    FTL = 'FTL',
    LTL = 'LTL',
  }
  
  export interface Location {
    address: string;
    city: string;
    state: string;
    pincode: string;
    lat?: number;
    lng?: number;
  }
  
  export interface GPSLocation {
    lat: number;
    lng: number;
    timestamp: string;
    speed?: number;
    heading?: number;
  }
  
  export interface Load {
    id: string;
    loadNumber: string;
    customerName: string;
    customerContact: string;
    customerEmail?: string;
    pickupLocation: Location;
    deliveryLocation: Location;
    pickupDate: string;
    expectedDeliveryDate: string;
    actualDeliveryDate?: string;
    driver?: Driver;
    truck?: Truck;
    cargoType: string;
    cargoDescription: string;
    weight: number;
    loadType: LoadType;
    rate: number;
    advancePaid: number;
    balance: number;
    fuelAdvance: number;
    distance: number;
    documents: {
      bol?: string;
      pod?: string;
      lr?: string;
      others: string[];
    };
    status: LoadStatus;
    specialInstructions?: string;
    currentLocation?: GPSLocation;
    createdAt: string;
    updatedAt: string;
  }
  
  export interface CreateLoadData {
    customerName: string;
    customerContact: string;
    customerEmail?: string;
    pickupLocation: Location;
    deliveryLocation: Location;
    pickupDate: string;
    expectedDeliveryDate: string;
    driverId?: string;
    truckId?: string;
    cargoType: string;
    cargoDescription: string;
    weight: number;
    loadType: LoadType;
    rate: number;
    advancePaid?: number;
    fuelAdvance?: number;
    distance: number;
    specialInstructions?: string;
  }
  
  export interface LoadStats {
    totalLoads: number;
    activeLoads: number;
    completedLoads: number;
    cancelledLoads: number;
    revenue: number;
    advancePaid: number;
    balanceDue: number;
    statusStats: Record<string, number>;
  }
  
  // DRIVER TYPES
  export enum DriverStatus {
    ACTIVE = 'active',
    INACTIVE = 'inactive',
    ON_TRIP = 'on_trip',
  }
  
  export interface Driver {
    id: string;
    name: string;
    email?: string;
    phone: string;
    licenseNumber: string;
    licenseExpiry: string;
    address: string;
    city: string;
    state: string;
    pincode: string;
    aadharNumber?: string;
    panNumber?: string;
    bloodGroup?: string;
    emergencyContact: string;
    emergencyContactName: string;
    status: DriverStatus;
    currentLoadId?: string;
    joiningDate: string;
    salary?: number;
    createdAt: string;
    updatedAt: string;
  }
  
  export interface CreateDriverData {
    name: string;
    email?: string;
    phone: string;
    licenseNumber: string;
    licenseExpiry: string;
    address: string;
    city: string;
    state: string;
    pincode: string;
    emergencyContact: string;
    emergencyContactName: string;
    salary?: number;
  }
  
  // TRUCK TYPES
  export enum TruckStatus {
    ACTIVE = 'active',
    INACTIVE = 'inactive',
    IN_SERVICE = 'in_service',
    ON_TRIP = 'on_trip',
  }
  
  export enum TruckType {
    OPEN_BODY = 'Open Body',
    CLOSED_CONTAINER = 'Closed Container',
    FLATBED = 'Flatbed',
    TANKER = 'Tanker',
    REFRIGERATED = 'Refrigerated',
    TRAILER = 'Trailer',
  }
  
  export interface Truck {
    id: string;
    truckNumber: string;
    make: string;
    model: string;
    year: number;
    truckType: TruckType;
    capacity: number;
    registrationNumber: string;
    registrationExpiry: string;
    insuranceExpiry?: string;
    status: TruckStatus;
    currentLoadId?: string;
    createdAt: string;
    updatedAt: string;
  }
  
  export interface CreateTruckData {
    truckNumber: string;
    make: string;
    model: string;
    year: number;
    truckType: string;
    capacity: number;
    registrationNumber: string;
    registrationExpiry: string;
    insuranceExpiry?: string;
  }