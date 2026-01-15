import { Load } from '../models/Load.model';
import { ApiError } from '../utils/ApiError';
import { config } from '../config/env';

interface GPSLocation {
  lat: number;
  lng: number;
  speed?: number;
  heading?: number;
}

interface GPSLocationWithTimestamp {
  lat: number;
  lng: number;
  timestamp: Date;
  speed?: number;
  heading?: number;
}

// Reserved for future geofencing features
// interface GeofenceAlert {
//   loadId: string;
//   type: 'pickup' | 'delivery' | 'off_route';
//   message: string;
//   timestamp: Date;
// }

export class GPSService {
  static isEnabled(): boolean {
    return config.gps?.enabled === true;
  }

  static async updateLocation(
    loadId: string,
    location: GPSLocation
  ): Promise<{ success: boolean; message: string }> {
    if (!this.isEnabled()) {
      return { success: false, message: 'GPS tracking is not enabled' };
    }

    const load = await Load.findById(loadId);
    if (!load) {
      throw ApiError.notFound('Load not found');
    }

    const gpsLocation = {
      lat: location.lat,
      lng: location.lng,
      timestamp: new Date(),
      speed: location.speed,
      heading: location.heading,
    };

    load.currentLocation = gpsLocation;
    
    if (load.locationHistory.length > 1000) {
      load.locationHistory = load.locationHistory.slice(-1000);
    }
    load.locationHistory.push(gpsLocation);

    await load.save();

    await this.checkGeofences(loadId, location);

    return { success: true, message: 'Location updated successfully' };
  }

  static async getCurrentLocation(loadId: string): Promise<GPSLocationWithTimestamp | null> {
    if (!this.isEnabled()) {
      return null;
    }

    const load = await Load.findById(loadId).select('currentLocation');
    if (!load) {
      throw ApiError.notFound('Load not found');
    }

    return load.currentLocation || null;
  }

  static async getLocationHistory(loadId: string, limit: number = 100): Promise<GPSLocationWithTimestamp[]> {
    if (!this.isEnabled()) {
      return [];
    }

    const load = await Load.findById(loadId).select('locationHistory');
    if (!load) {
      throw ApiError.notFound('Load not found');
    }

    const history = load.locationHistory || [];
    return history.slice(-limit);
  }

  static async getRouteData(loadId: string): Promise<any> {
    if (!this.isEnabled()) {
      return null;
    }

    const load = await Load.findById(loadId).populate('driverId').populate('truckId');
    if (!load) {
      throw ApiError.notFound('Load not found');
    }

    const history = load.locationHistory || [];
    const currentLoc = load.currentLocation;

    let distanceTraveled = 0;
    for (let i = 1; i < history.length; i++) {
      distanceTraveled += this.calculateDistance(
        history[i - 1].lat,
        history[i - 1].lng,
        history[i].lat,
        history[i].lng
      );
    }

    const remainingDistance = load.distance - distanceTraveled;
    const eta = this.calculateETA(remainingDistance, currentLoc?.speed || 50);

    return {
      loadNumber: load.loadNumber,
      currentLocation: currentLoc,
      pickup: {
        lat: load.pickupLocation.lat,
        lng: load.pickupLocation.lng,
        address: load.pickupLocation.address,
      },
      delivery: {
        lat: load.deliveryLocation.lat,
        lng: load.deliveryLocation.lng,
        address: load.deliveryLocation.address,
      },
      totalDistance: load.distance,
      distanceTraveled,
      remainingDistance,
      eta,
      routeHistory: history,
      lastUpdate: currentLoc?.timestamp,
    };
  }

  static async startTracking(loadId: string): Promise<void> {
    if (!this.isEnabled()) {
      throw ApiError.badRequest('GPS tracking is not enabled');
    }

    const load = await Load.findById(loadId);
    if (!load) {
      throw ApiError.notFound('Load not found');
    }

    load.locationHistory = [];
    await load.save();
  }

  static async stopTracking(loadId: string): Promise<void> {
    if (!this.isEnabled()) {
      return;
    }

    const load = await Load.findById(loadId);
    if (!load) {
      throw ApiError.notFound('Load not found');
    }

    load.currentLocation = undefined;
    await load.save();
  }

  static async getActiveTrackedLoads() {
    if (!this.isEnabled()) {
      return [];
    }

    const loads = await Load.find({
      status: { $in: ['in_transit', 'assigned'] },
      currentLocation: { $exists: true },
    })
      .populate('driverId')
      .populate('truckId')
      .select('loadNumber customerName currentLocation status driverId truckId');

    return loads;
  }

  private static async checkGeofences(loadId: string, location: GPSLocation): Promise<void> {
    const load = await Load.findById(loadId);
    if (!load) return;

    const geofenceRadius = config.gps?.geofenceRadius || 500;

    if (load.pickupLocation.lat && load.pickupLocation.lng) {
      const distanceToPickup = this.calculateDistance(
        location.lat,
        location.lng,
        load.pickupLocation.lat,
        load.pickupLocation.lng
      );

      if (distanceToPickup <= geofenceRadius / 1000) {
        console.log(`Load ${load.loadNumber} reached pickup location`);
      }
    }

    if (load.deliveryLocation.lat && load.deliveryLocation.lng) {
      const distanceToDelivery = this.calculateDistance(
        location.lat,
        location.lng,
        load.deliveryLocation.lat,
        load.deliveryLocation.lng
      );

      if (distanceToDelivery <= geofenceRadius / 1000) {
        console.log(`Load ${load.loadNumber} reached delivery location`);
      }
    }
  }

  private static calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371;
    const dLat = this.deg2rad(lat2 - lat1);
    const dLon = this.deg2rad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.deg2rad(lat1)) *
        Math.cos(this.deg2rad(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private static deg2rad(deg: number): number {
    return deg * (Math.PI / 180);
  }

  private static calculateETA(distanceKm: number, speedKmh: number): string {
    if (speedKmh === 0) return 'N/A';
    const hours = distanceKm / speedKmh;
    const h = Math.floor(hours);
    const m = Math.floor((hours - h) * 60);
    return `${h}h ${m}m`;
  }
}