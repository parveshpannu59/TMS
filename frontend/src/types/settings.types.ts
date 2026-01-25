// types/settings.types.ts

export interface UserSettings {
    _id?: string;
    userId: string;
    companyId: string;
    
    // Appearance
    theme: 'light' | 'dark';
    language: string;
    dateFormat: string;
    timeFormat: '12h' | '24h';
    
    // Notifications
    emailNotifications: boolean;
    smsNotifications: boolean;
    pushNotifications: boolean;
    loadUpdates: boolean;
    driverUpdates: boolean;
    maintenanceReminders: boolean;
    invoiceReminders: boolean;
    
    // Company
    companyName: string;
    companyEmail: string;
    companyPhone: string;
    companyAddress: string;
    taxId: string;
    dotNumber: string;
    mcNumber: string;
    
    // System
    autoAssignment: boolean;
    requireLoadApproval: boolean;
    enableGPSTracking: boolean;
    defaultCurrency: string;
    timezone: string;
    measurementUnit: 'metric' | 'imperial';
    
    // Security
    twoFactorEnabled: boolean;
    sessionTimeout: number;
    passwordExpiry: number;
    
    createdAt?: Date;
    updatedAt?: Date;
  }
  
  export interface PasswordChange {
    currentPassword: string;
    newPassword: string;
    confirmPassword: string;
  }
  
  export interface TwoFactorSetup {
    secret: string;
    qrCode: string;
    backupCodes: string[];
  }
  
  export interface ProfilePictureResponse {
    url: string;
  }
  
  export type SettingsSection = 
    | 'appearance' 
    | 'notifications' 
    | 'company' 
    | 'account' 
    | 'system' 
    | 'integrations';
  
  export type NotificationTestType = 'email' | 'sms' | 'push';
  
  export type Currency = 'USD' | 'EUR' | 'GBP' | 'CAD' | 'AUD' | 'INR';
  
  export type MeasurementUnit = 'metric' | 'imperial';
  
  export type TimeFormat = '12h' | '24h';
  
  export type Theme = 'light' | 'dark';
  
  export interface SettingsValidationErrors {
    [key: string]: string;
  }