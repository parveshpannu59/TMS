export interface Load {
    _id: string;
    loadNumber: string;
    companyId: string;
    
    shipperName: string;
    shipperAddress: string;
    shipperCity: string;
    shipperState: string;
    shipperZip: string;
    pickupDate: string;
    pickupTime?: string;
    
    receiverName: string;
    receiverAddress: string;
    receiverCity: string;
    receiverState: string;
    receiverZip: string;
    deliveryDate: string;
    deliveryTime?: string;
    
    commodity: string;
    weight: number;
    pieces?: number;
    equipmentType: string;
    temperature?: number;
    
    poNumber?: string;
    refNumber?: string;
    bolNumber?: string;
    sealNumber?: string;
    
    driverId?: string;
    truckId?: string;
    trailerId?: string;
    
    status: LoadStatus;
    
    brokerName?: string;
    brokerContact?: string;
    rateAmount?: number;
    fuelSurcharge?: number;
    accessorials?: number;
    totalAmount?: number;
    
    rateConfirmationUrl?: string;
    
    specialInstructions?: string;
    driverInstructions?: string;
    
    createdBy: string;
    createdAt: string;
    updatedAt: string;
  }
  
  export type LoadStatus =
    | 'Booked'
    | 'Assigned'
    | 'Driver On Duty'
    | 'Arrived at Shipper'
    | 'Loading'
    | 'Departed Shipper'
    | 'In Transit'
    | 'Arrived at Receiver'
    | 'Unloading'
    | 'Delivered'
    | 'Completed';
  
  export interface CreateLoadDto {
    shipperName: string;
    shipperAddress: string;
    shipperCity: string;
    shipperState: string;
    shipperZip: string;
    pickupDate: string;
    pickupTime?: string;
    
    receiverName: string;
    receiverAddress: string;
    receiverCity: string;
    receiverState: string;
    receiverZip: string;
    deliveryDate: string;
    deliveryTime?: string;
    
    commodity: string;
    weight: number;
    pieces?: number;
    equipmentType: string;
    temperature?: number;
    
    poNumber?: string;
    refNumber?: string;
    bolNumber?: string;
    sealNumber?: string;
    
    brokerName?: string;
    brokerContact?: string;
    rateAmount?: number;
    fuelSurcharge?: number;
    accessorials?: number;
    
    specialInstructions?: string;
    driverInstructions?: string;
  }