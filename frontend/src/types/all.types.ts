// LOAD TYPES
export enum LoadStatus {
    BOOKED = 'booked',
    RATE_CONFIRMED = 'rate_confirmed',
    ASSIGNED = 'assigned',
    TRIP_ACCEPTED = 'trip_accepted',
    TRIP_STARTED = 'trip_started',
    SHIPPER_CHECK_IN = 'shipper_check_in',
    SHIPPER_LOAD_IN = 'shipper_load_in',
    SHIPPER_LOAD_OUT = 'shipper_load_out',
    IN_TRANSIT = 'in_transit',
    RECEIVER_CHECK_IN = 'receiver_check_in',
    RECEIVER_OFFLOAD = 'receiver_offload',
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
  
  export interface BrokerConfirmationDetails {
    pickupAddress: Location;
    deliveryAddress: Location;
    miles: number;
  }

  export interface DriverFormDetails {
    loadNumber: string;
    pickupReferenceNumber: string;
    pickupTime: string;
    pickupPlace: string;
    pickupDate: string;
    pickupLocation: string;
    dropoffReferenceNumber: string;
    dropoffTime: string;
    dropoffLocation: string;
    dropoffDate: string;
  }

  export interface TripStartDetails {
    startingMileage: number;
    startingPhoto: string;
    tripStartedAt: string;
  }

  export interface ShipperCheckInDetails {
    poNumber: string;
    loadNumber: string;
    referenceNumber: string;
    checkInAt: string;
  }

  export interface ShipperLoadInDetails {
    confirmationDetails?: string;
    loadInAt: string;
  }

  export interface ShipperLoadOutDetails {
    loadOutAt: string;
    bolDocument?: string;
  }

  export interface ReceiverCheckInDetails {
    checkInAt: string;
    arrivalConfirmed: boolean;
  }

  export interface ReceiverOffloadDetails {
    offloadAt: string;
    quantity?: string;
    additionalDetails?: string;
    bolAcknowledged: boolean;
    podDocument?: string;
    podPhoto?: string;
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
    // Broker confirmation fields
    trackingLink?: string;
    brokerConfirmedRate?: boolean;
    brokerConfirmedAt?: string;
    brokerConfirmationDetails?: BrokerConfirmationDetails;
    // Driver acceptance and form fields
    tripAcceptedAt?: string;
    driverFormDetails?: DriverFormDetails;
    // Trip workflow fields
    tripStartDetails?: TripStartDetails;
    shipperCheckInDetails?: ShipperCheckInDetails;
    shipperLoadInDetails?: ShipperLoadInDetails;
    shipperLoadOutDetails?: ShipperLoadOutDetails;
    receiverCheckInDetails?: ReceiverCheckInDetails;
    receiverOffloadDetails?: ReceiverOffloadDetails;
    tripEndedAt?: string;
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