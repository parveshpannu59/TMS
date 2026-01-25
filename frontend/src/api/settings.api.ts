import { apiClient } from './client';
import { API_ENDPOINTS } from './endpoints';
import type { ApiResponse } from '@/types/api.types';

export interface UserSettings {
  _id?: string;
  userId: string;
  companyId?: string;
  
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

export const settingsApi = {
  /**
   * Get user settings
   */
  getSettings: async (): Promise<UserSettings> => {
    const response = await apiClient.get<ApiResponse<UserSettings>>(
      API_ENDPOINTS.SETTINGS.GET
    );
    return response.data.data!;
  },

  /**
   * Update all settings
   */
  updateSettings: async (settings: Partial<UserSettings>): Promise<UserSettings> => {
    const response = await apiClient.put<ApiResponse<UserSettings>>(
      API_ENDPOINTS.SETTINGS.UPDATE,
      settings
    );
    return response.data.data!;
  },

  /**
   * Update specific settings section
   */
  updateSection: async (section: string, data: Partial<UserSettings>): Promise<UserSettings> => {
    const response = await apiClient.patch<ApiResponse<UserSettings>>(
      `${API_ENDPOINTS.SETTINGS.UPDATE}/${section}`,
      data
    );
    return response.data.data!;
  },

  /**
   * Change password
   */
  changePassword: async (passwordData: PasswordChange): Promise<void> => {
    await apiClient.post(
      API_ENDPOINTS.SETTINGS.CHANGE_PASSWORD,
      passwordData
    );
  },

  /**
   * Upload profile picture
   */
  updateProfilePicture: async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append('profilePicture', file);

    const response = await apiClient.post<ApiResponse<{ url: string }>>(
      API_ENDPOINTS.SETTINGS.PROFILE_PICTURE,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );
    return response.data.data!.url;
  },

  /**
   * Test notification settings
   */
  testNotification: async (type: 'email' | 'sms' | 'push'): Promise<void> => {
    await apiClient.post(
      API_ENDPOINTS.SETTINGS.TEST_NOTIFICATION,
      { type }
    );
  },

  /**
   * Enable 2FA
   */
  enable2FA: async (): Promise<TwoFactorSetup> => {
    const response = await apiClient.post<ApiResponse<TwoFactorSetup>>(
      API_ENDPOINTS.SETTINGS.TWO_FACTOR.ENABLE
    );
    return response.data.data!;
  },

  /**
   * Verify and activate 2FA
   */
  verify2FA: async (code: string): Promise<void> => {
    await apiClient.post(
      API_ENDPOINTS.SETTINGS.TWO_FACTOR.VERIFY,
      { code }
    );
  },

  /**
   * Disable 2FA
   */
  disable2FA: async (password: string): Promise<void> => {
    await apiClient.post(
      API_ENDPOINTS.SETTINGS.TWO_FACTOR.DISABLE,
      { password }
    );
  },

  /**
   * Get 2FA backup codes
   */
  get2FABackupCodes: async (): Promise<string[]> => {
    const response = await apiClient.get<ApiResponse<{ codes: string[] }>>(
      API_ENDPOINTS.SETTINGS.TWO_FACTOR.BACKUP_CODES
    );
    return response.data.data!.codes;
  },

  /**
   * Regenerate 2FA backup codes
   */
  regenerate2FABackupCodes: async (password: string): Promise<string[]> => {
    const response = await apiClient.post<ApiResponse<{ codes: string[] }>>(
      API_ENDPOINTS.SETTINGS.TWO_FACTOR.REGENERATE_CODES,
      { password }
    );
    return response.data.data!.codes;
  },
};