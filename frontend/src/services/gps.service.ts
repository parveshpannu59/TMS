import { gpsApi } from '@api/all.api';
import type { GPSLocation } from '../types/all.types';

export class GPSService {
  /**
   * Check if GPS tracking is enabled
   */
  static async isEnabled(): Promise<boolean> {
    try {
      const status = await gpsApi.checkGPSStatus();
      return status.enabled;
    } catch (error) {
      console.error('Error checking GPS status:', error);
      return false;
    }
  }

  /**
   * Update location for a load
   */
  static async updateLocation(
    loadId: string,
    location: { lat: number; lng: number; speed?: number; heading?: number }
  ): Promise<void> {
    try {
      await gpsApi.updateLocation(loadId, location);
    } catch (error) {
      console.error('Error updating location:', error);
      throw error;
    }
  }

  /**
   * Get current location for a load
   */
  static async getCurrentLocation(loadId: string): Promise<GPSLocation | null> {
    try {
      return await gpsApi.getCurrentLocation(loadId);
    } catch (error) {
      console.error('Error getting current location:', error);
      return null;
    }
  }

  /**
   * Get route data for a load
   */
  static async getRouteData(loadId: string): Promise<any> {
    try {
      return await gpsApi.getRouteData(loadId);
    } catch (error) {
      console.error('Error getting route data:', error);
      return null;
    }
  }

  /**
   * Start tracking for a load
   */
  static async startTracking(loadId: string): Promise<void> {
    try {
      await gpsApi.startTracking(loadId);
    } catch (error) {
      console.error('Error starting tracking:', error);
      throw error;
    }
  }

  /**
   * Stop tracking for a load
   */
  static async stopTracking(loadId: string): Promise<void> {
    try {
      await gpsApi.stopTracking(loadId);
    } catch (error) {
      console.error('Error stopping tracking:', error);
      throw error;
    }
  }

  /**
   * Get location history for a load
   */
  static async getLocationHistory(loadId: string, limit: number = 100): Promise<GPSLocation[]> {
    try {
      // Note: This endpoint might need to be added to the API
      const apiBaseUrl = (import.meta as any).env?.VITE_API_BASE_URL || 'http://localhost:5000/api';
      const response = await fetch(
        `${apiBaseUrl}/gps/load/${loadId}/history?limit=${limit}`,
        {
          headers: {
            Authorization: `Bearer ${sessionStorage.getItem('auth_token')}`,
          },
        }
      );
      if (!response.ok) return [];
      const data = await response.json();
      return data.data || [];
    } catch (error) {
      console.error('Error getting location history:', error);
      return [];
    }
  }
}
