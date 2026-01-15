import { Truck, TruckStatus } from '../models/Truck.model';
import { ApiError } from '../utils/ApiError';

interface CreateTruckData {
  truckNumber: string;
  make: string;
  model: string;
  year: number;
  truckType: string;
  capacity: number;
  registrationNumber: string;
  registrationExpiry: Date;
  insuranceNumber?: string;
  insuranceExpiry?: Date;
  pucExpiry?: Date;
  fitnessExpiry?: Date;
  permitNumber?: string;
  permitExpiry?: Date;
  chassisNumber?: string;
  engineNumber?: string;
  fuelType?: string;
  mileage?: number;
}

export class TruckService {
  static async createTruck(data: CreateTruckData, userId: string) {
    const existingTruck = await Truck.findOne({
      $or: [{ truckNumber: data.truckNumber }, { registrationNumber: data.registrationNumber }],
    });

    if (existingTruck) {
      if (existingTruck.truckNumber === data.truckNumber) {
        throw ApiError.badRequest('Truck number already registered');
      }
      if (existingTruck.registrationNumber === data.registrationNumber) {
        throw ApiError.badRequest('Registration number already registered');
      }
    }

    const truck = await Truck.create({
      ...data,
      status: TruckStatus.ACTIVE,
      currentKm: 0,
      createdBy: userId,
    });

    return this.formatTruck(truck);
  }

  static async getAllTrucks() {
    const trucks = await Truck.find().sort({ createdAt: -1 });
    return trucks.map((truck) => this.formatTruck(truck));
  }

  static async getAvailableTrucks() {
    const trucks = await Truck.find({
      status: { $in: [TruckStatus.ACTIVE] },
    }).sort({ truckNumber: 1 });

    return trucks.map((truck) => ({
      id: truck._id.toString(),
      truckNumber: truck.truckNumber,
      make: truck.make,
      model: truck.model,
      capacity: truck.capacity,
      truckType: truck.truckType,
    }));
  }

  static async getTruckById(truckId: string) {
    const truck = await Truck.findById(truckId)
      .populate('currentLoadId', 'loadNumber status')
      .populate('currentDriverId', 'name phone');

    if (!truck) {
      throw ApiError.notFound('Truck not found');
    }

    return this.formatTruck(truck);
  }

  static async updateTruck(truckId: string, updateData: Partial<CreateTruckData>) {
    const truck = await Truck.findById(truckId);

    if (!truck) {
      throw ApiError.notFound('Truck not found');
    }

    if (updateData.truckNumber && updateData.truckNumber !== truck.truckNumber) {
      const existing = await Truck.findOne({ truckNumber: updateData.truckNumber });
      if (existing) {
        throw ApiError.badRequest('Truck number already registered');
      }
    }

    if (updateData.registrationNumber && updateData.registrationNumber !== truck.registrationNumber) {
      const existing = await Truck.findOne({ registrationNumber: updateData.registrationNumber });
      if (existing) {
        throw ApiError.badRequest('Registration number already registered');
      }
    }

    Object.assign(truck, updateData);
    await truck.save();

    return this.formatTruck(truck);
  }

  static async deleteTruck(truckId: string) {
    const truck = await Truck.findById(truckId);

    if (!truck) {
      throw ApiError.notFound('Truck not found');
    }

    if (truck.status === TruckStatus.ON_TRIP) {
      throw ApiError.badRequest('Cannot delete truck that is currently on a trip');
    }

    await Truck.findByIdAndDelete(truckId);

    return { message: 'Truck deleted successfully' };
  }

  static async getTruckStats() {
    const [totalTrucks, activeTrucks, onTripTrucks, inServiceTrucks, inactiveTrucks] = await Promise.all([
      Truck.countDocuments(),
      Truck.countDocuments({ status: TruckStatus.ACTIVE }),
      Truck.countDocuments({ status: TruckStatus.ON_TRIP }),
      Truck.countDocuments({ status: TruckStatus.IN_SERVICE }),
      Truck.countDocuments({ status: TruckStatus.INACTIVE }),
    ]);

    return {
      totalTrucks,
      activeTrucks,
      onTripTrucks,
      inServiceTrucks,
      inactiveTrucks,
    };
  }

  private static formatTruck(truck: any) {
    return {
      id: truck._id.toString(),
      truckNumber: truck.truckNumber,
      make: truck.make,
      model: truck.model,
      year: truck.year,
      truckType: truck.truckType,
      capacity: truck.capacity,
      registrationNumber: truck.registrationNumber,
      registrationExpiry: truck.registrationExpiry,
      insuranceNumber: truck.insuranceNumber,
      insuranceExpiry: truck.insuranceExpiry,
      pucExpiry: truck.pucExpiry,
      fitnessExpiry: truck.fitnessExpiry,
      permitNumber: truck.permitNumber,
      permitExpiry: truck.permitExpiry,
      chassisNumber: truck.chassisNumber,
      engineNumber: truck.engineNumber,
      fuelType: truck.fuelType,
      mileage: truck.mileage,
      currentKm: truck.currentKm,
      lastServiceDate: truck.lastServiceDate,
      nextServiceDue: truck.nextServiceDue,
      status: truck.status,
      currentLoadId: truck.currentLoadId,
      currentDriverId: truck.currentDriverId,
      documents: truck.documents,
      createdAt: truck.createdAt,
      updatedAt: truck.updatedAt,
    };
  }
}