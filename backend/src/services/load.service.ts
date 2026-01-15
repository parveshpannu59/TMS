import mongoose from 'mongoose';
import { Load, LoadStatus, LoadType } from '../models/Load.model';
import { Driver, DriverStatus } from '../models/Driver.model';
import { Truck, TruckStatus } from '../models/Truck.model';
import { ApiError } from '../utils/ApiError';

interface CreateLoadData {
  customerName: string;
  customerContact: string;
  customerEmail?: string;
  pickupLocation: {
    address: string;
    city: string;
    state: string;
    pincode: string;
    lat?: number;
    lng?: number;
  };
  deliveryLocation: {
    address: string;
    city: string;
    state: string;
    pincode: string;
    lat?: number;
    lng?: number;
  };
  pickupDate: Date;
  expectedDeliveryDate: Date;
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

export class LoadService {
  static async generateLoadNumber(): Promise<string> {
    const lastLoad = await Load.findOne().sort({ createdAt: -1 });
    if (!lastLoad) {
      return 'LOAD-001';
    }

    const lastNumber = parseInt(lastLoad.loadNumber.split('-')[1]);
    const newNumber = lastNumber + 1;
    return `LOAD-${newNumber.toString().padStart(3, '0')}`;
  }

  static async createLoad(data: CreateLoadData, userId: string) {
    if (data.pickupDate >= data.expectedDeliveryDate) {
      throw ApiError.badRequest('Delivery date must be after pickup date');
    }

    if (data.driverId) {
      const driver = await Driver.findById(data.driverId);
      if (!driver) {
        throw ApiError.notFound('Driver not found');
      }
      if (driver.status === DriverStatus.ON_TRIP) {
        throw ApiError.badRequest('Driver is already on a trip');
      }
    }

    if (data.truckId) {
      const truck = await Truck.findById(data.truckId);
      if (!truck) {
        throw ApiError.notFound('Truck not found');
      }
      if (truck.status === TruckStatus.ON_TRIP) {
        throw ApiError.badRequest('Truck is already on a trip');
      }
    }

    const loadNumber = await this.generateLoadNumber();

    // Ensure empty strings are converted to undefined
    const driverId = data.driverId && data.driverId.trim() !== '' ? data.driverId : undefined;
    const truckId = data.truckId && data.truckId.trim() !== '' ? data.truckId : undefined;

    const load = await Load.create({
      ...data,
      driverId,
      truckId,
      loadNumber,
      balance: data.rate - (data.advancePaid || 0),
      status: driverId && truckId ? LoadStatus.ASSIGNED : LoadStatus.CREATED,
      createdBy: userId,
      statusHistory: [
        {
          status: driverId && truckId ? LoadStatus.ASSIGNED : LoadStatus.CREATED,
          timestamp: new Date(),
          updatedBy: userId,
        },
      ],
    });

    if (driverId) {
      await Driver.findByIdAndUpdate(driverId, {
        status: DriverStatus.ON_TRIP,
        currentLoadId: load._id.toString(),
      });
    }

    if (truckId) {
      await Truck.findByIdAndUpdate(truckId, {
        status: TruckStatus.ON_TRIP,
        currentLoadId: load._id.toString(),
        currentDriverId: driverId,
      });
    }

    return this.formatLoad(load);
  }

  static async getAllLoads(userId: string, userRole: string) {
    let query: any = {};

    if (userRole === 'driver') {
      query = { driverId: userId };
    }

    // Add conditions to exclude empty strings
    const andConditions: any[] = [
      {
        $or: [
          { driverId: { $exists: false } },
          { driverId: null },
          { driverId: { $ne: '' } },
        ],
      },
      {
        $or: [
          { truckId: { $exists: false } },
          { truckId: null },
          { truckId: { $ne: '' } },
        ],
      },
    ];

    if (userRole === 'driver') {
      query.$and = andConditions;
    } else {
      query = { $and: andConditions };
    }

    const loads = await Load.find(query)
      .lean() // Use lean() to get plain objects
      .sort({ createdAt: -1 });

    // Manually populate driver and truck for valid IDs only
    const populatedLoads = await Promise.all(
      loads.map(async (load: any) => {
        // Populate driverId if it's a valid ObjectId string
        if (load.driverId && typeof load.driverId === 'string' && load.driverId.trim() !== '') {
          try {
            if (mongoose.Types.ObjectId.isValid(load.driverId)) {
              const driver = await Driver.findById(load.driverId).select('name phone').lean();
              load.driverId = driver;
            } else {
              load.driverId = null;
            }
          } catch (err) {
            load.driverId = null;
          }
        } else if (!load.driverId || load.driverId === '') {
          load.driverId = null;
        }

        // Populate truckId if it's a valid ObjectId string
        if (load.truckId && typeof load.truckId === 'string' && load.truckId.trim() !== '') {
          try {
            if (mongoose.Types.ObjectId.isValid(load.truckId)) {
              const truck = await Truck.findById(load.truckId).select('truckNumber make model').lean();
              load.truckId = truck;
            } else {
              load.truckId = null;
            }
          } catch (err) {
            load.truckId = null;
          }
        } else if (!load.truckId || load.truckId === '') {
          load.truckId = null;
        }

        return load;
      })
    );

    return populatedLoads.map((load) => this.formatLoad(load));
  }

  static async getLoadById(loadId: string) {
    const load = await Load.findById(loadId)
      .populate({
        path: 'driverId',
        select: 'name phone email licenseNumber',
        strictPopulate: false,
      })
      .populate({
        path: 'truckId',
        select: 'truckNumber make model capacity registrationNumber',
        strictPopulate: false,
      });

    if (!load) {
      throw ApiError.notFound('Load not found');
    }

    return this.formatLoad(load);
  }

  static async updateLoad(loadId: string, updateData: Partial<CreateLoadData>, _userId: string) {
    const load = await Load.findById(loadId);

    if (!load) {
      throw ApiError.notFound('Load not found');
    }

    if (load.status === LoadStatus.COMPLETED || load.status === LoadStatus.CANCELLED) {
      throw ApiError.badRequest('Cannot update completed or cancelled load');
    }

    const oldDriverId = load.driverId?.toString();
    const oldTruckId = load.truckId?.toString();

    if (updateData.driverId && updateData.driverId !== oldDriverId) {
      const driver = await Driver.findById(updateData.driverId);
      if (!driver) {
        throw ApiError.notFound('Driver not found');
      }
      if (driver.status === DriverStatus.ON_TRIP && driver.currentLoadId !== loadId) {
        throw ApiError.badRequest('Driver is already on another trip');
      }

      if (oldDriverId) {
        await Driver.findByIdAndUpdate(oldDriverId, {
          status: DriverStatus.ACTIVE,
          currentLoadId: null,
        });
      }

      await Driver.findByIdAndUpdate(updateData.driverId, {
        status: DriverStatus.ON_TRIP,
        currentLoadId: loadId,
      });
    }

    if (updateData.truckId && updateData.truckId !== oldTruckId) {
      const truck = await Truck.findById(updateData.truckId);
      if (!truck) {
        throw ApiError.notFound('Truck not found');
      }
      if (truck.status === TruckStatus.ON_TRIP && truck.currentLoadId !== loadId) {
        throw ApiError.badRequest('Truck is already on another trip');
      }

      if (oldTruckId) {
        await Truck.findByIdAndUpdate(oldTruckId, {
          status: TruckStatus.ACTIVE,
          currentLoadId: null,
          currentDriverId: null,
        });
      }

      await Truck.findByIdAndUpdate(updateData.truckId, {
        status: TruckStatus.ON_TRIP,
        currentLoadId: loadId,
        currentDriverId: updateData.driverId || load.driverId,
      });
    }

    // Ensure empty strings are converted to undefined for driverId and truckId
    if (updateData.driverId !== undefined) {
      updateData.driverId = updateData.driverId && updateData.driverId.trim() !== '' ? updateData.driverId : undefined;
    }
    if (updateData.truckId !== undefined) {
      updateData.truckId = updateData.truckId && updateData.truckId.trim() !== '' ? updateData.truckId : undefined;
    }

    Object.assign(load, updateData);

    if (updateData.rate !== undefined || updateData.advancePaid !== undefined) {
      load.balance = (updateData.rate || load.rate) - (updateData.advancePaid || load.advancePaid);
    }

    await load.save();

    return this.formatLoad(load);
  }

  static async updateLoadStatus(loadId: string, status: LoadStatus, userId: string, notes?: string) {
    const load = await Load.findById(loadId);

    if (!load) {
      throw ApiError.notFound('Load not found');
    }

    load.status = status;
    load.statusHistory.push({
      status,
      timestamp: new Date(),
      updatedBy: userId,
      notes,
    });

    if (status === LoadStatus.DELIVERED) {
      load.actualDeliveryDate = new Date();
    }

    if (status === LoadStatus.COMPLETED || status === LoadStatus.CANCELLED) {
      if (load.driverId) {
        await Driver.findByIdAndUpdate(load.driverId, {
          status: DriverStatus.ACTIVE,
          currentLoadId: null,
        });
      }

      if (load.truckId) {
        await Truck.findByIdAndUpdate(load.truckId, {
          status: TruckStatus.ACTIVE,
          currentLoadId: null,
          currentDriverId: null,
        });
      }
    }

    await load.save();

    return this.formatLoad(load);
  }

  static async deleteLoad(loadId: string) {
    const load = await Load.findById(loadId);

    if (!load) {
      throw ApiError.notFound('Load not found');
    }

    if (load.status === LoadStatus.IN_TRANSIT) {
      throw ApiError.badRequest('Cannot delete load that is in transit');
    }

    if (load.driverId) {
      await Driver.findByIdAndUpdate(load.driverId, {
        status: DriverStatus.ACTIVE,
        currentLoadId: null,
      });
    }

    if (load.truckId) {
      await Truck.findByIdAndUpdate(load.truckId, {
        status: TruckStatus.ACTIVE,
        currentLoadId: null,
        currentDriverId: null,
      });
    }

    await Load.findByIdAndDelete(loadId);

    return { message: 'Load deleted successfully' };
  }

  static async getLoadStats() {
    const [totalLoads, activeLoads, completedLoads, cancelledLoads] = await Promise.all([
      Load.countDocuments(),
      Load.countDocuments({ status: { $in: [LoadStatus.ASSIGNED, LoadStatus.IN_TRANSIT] } }),
      Load.countDocuments({ status: LoadStatus.COMPLETED }),
      Load.countDocuments({ status: LoadStatus.CANCELLED }),
    ]);

    const revenueData = await Load.aggregate([
      {
        $match: {
          status: { $in: [LoadStatus.COMPLETED, LoadStatus.DELIVERED] },
        },
      },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: '$rate' },
          totalAdvance: { $sum: '$advancePaid' },
          totalBalance: { $sum: '$balance' },
        },
      },
    ]);

    const revenue = revenueData[0] || { totalRevenue: 0, totalAdvance: 0, totalBalance: 0 };

    const loadsByStatus = await Load.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
        },
      },
    ]);

    const statusStats = loadsByStatus.reduce((acc, curr) => {
      acc[curr._id] = curr.count;
      return acc;
    }, {} as Record<string, number>);

    return {
      totalLoads,
      activeLoads,
      completedLoads,
      cancelledLoads,
      revenue: revenue.totalRevenue,
      advancePaid: revenue.totalAdvance,
      balanceDue: revenue.totalBalance,
      statusStats,
    };
  }

  private static formatLoad(load: any) {
    return {
      id: load._id.toString(),
      loadNumber: load.loadNumber,
      customerName: load.customerName,
      customerContact: load.customerContact,
      customerEmail: load.customerEmail,
      pickupLocation: load.pickupLocation,
      deliveryLocation: load.deliveryLocation,
      pickupDate: load.pickupDate,
      expectedDeliveryDate: load.expectedDeliveryDate,
      actualDeliveryDate: load.actualDeliveryDate,
      driver: load.driverId,
      truck: load.truckId,
      cargoType: load.cargoType,
      cargoDescription: load.cargoDescription,
      weight: load.weight,
      loadType: load.loadType,
      rate: load.rate,
      advancePaid: load.advancePaid,
      balance: load.balance,
      fuelAdvance: load.fuelAdvance,
      distance: load.distance,
      estimatedFuelCost: load.estimatedFuelCost,
      documents: load.documents,
      status: load.status,
      specialInstructions: load.specialInstructions,
      currentLocation: load.currentLocation,
      statusHistory: load.statusHistory,
      createdAt: load.createdAt,
      updatedAt: load.updatedAt,
    };
  }
}