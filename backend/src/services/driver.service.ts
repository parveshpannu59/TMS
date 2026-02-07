import { Driver, DriverStatus } from '../models/Driver.model';
import { ApiError } from '../utils/ApiError';

interface CreateDriverData {
  userId?: string; // Link to User account for driver login
  name: string;
  email?: string;
  phone: string;
  licenseNumber: string;
  licenseExpiry: Date;
  address: string;
  city: string;
  state: string;
  pincode: string;
  aadharNumber?: string;
  panNumber?: string;
  bloodGroup?: string;
  emergencyContact: string;
  emergencyContactName: string;
  salary?: number;
  notes?: string;
  bankAccount?: {
    accountNumber: string;
    ifscCode: string;
    bankName: string;
    accountHolderName: string;
  };
}

export class DriverService {
  static async createDriver(data: CreateDriverData, userId: string) {
    const existingDriver = await Driver.findOne({
      $or: [{ phone: data.phone }, { licenseNumber: data.licenseNumber }],
    });

    if (existingDriver) {
      if (existingDriver.phone === data.phone) {
        throw ApiError.badRequest('Phone number already registered');
      }
      if (existingDriver.licenseNumber === data.licenseNumber) {
        throw ApiError.badRequest('License number already registered');
      }
    }

    const driver = await Driver.create({
      ...data,
      userId: data.userId || undefined, // Link to User account if provided
      status: DriverStatus.ACTIVE,
      joiningDate: new Date(),
      createdBy: userId,
    });

    return this.formatDriver(driver);
  }

  static async getAllDrivers() {
    const drivers = await Driver.find().sort({ createdAt: -1 });
    return drivers.map((driver) => this.formatDriver(driver));
  }

  static async getAvailableDrivers() {
    const drivers = await Driver.find({
      status: { $in: [DriverStatus.ACTIVE] },
    }).sort({ name: 1 });

    return drivers.map((driver) => ({
      id: driver._id.toString(),
      name: driver.name,
      phone: driver.phone,
      licenseNumber: driver.licenseNumber,
    }));
  }

  static async getDriverById(driverId: string) {
    const driver = await Driver.findById(driverId).populate('currentLoadId', 'loadNumber status');

    if (!driver) {
      throw ApiError.notFound('Driver not found');
    }

    return this.formatDriver(driver);
  }

  static async getDriverByUserId(userId: string) {
    const driver = await Driver.findOne({ userId }).populate('currentLoadId', 'loadNumber status');

    if (!driver) {
      throw ApiError.notFound('Driver profile not found. Please contact administrator.');
    }

    return this.formatDriver(driver);
  }

  static async updateDriver(driverId: string, updateData: Partial<CreateDriverData>) {
    const driver = await Driver.findById(driverId);

    if (!driver) {
      throw ApiError.notFound('Driver not found');
    }

    if (updateData.phone && updateData.phone !== driver.phone) {
      const existing = await Driver.findOne({ phone: updateData.phone });
      if (existing) {
        throw ApiError.badRequest('Phone number already registered');
      }
    }

    if (updateData.licenseNumber && updateData.licenseNumber !== driver.licenseNumber) {
      const existing = await Driver.findOne({ licenseNumber: updateData.licenseNumber });
      if (existing) {
        throw ApiError.badRequest('License number already registered');
      }
    }

    Object.assign(driver, updateData);
    await driver.save();

    return this.formatDriver(driver);
  }

  static async deleteDriver(driverId: string) {
    const driver = await Driver.findById(driverId);

    if (!driver) {
      throw ApiError.notFound('Driver not found');
    }

    if (driver.status === DriverStatus.ON_TRIP) {
      throw ApiError.badRequest('Cannot delete driver who is currently on a trip');
    }

    await Driver.findByIdAndDelete(driverId);

    return { message: 'Driver deleted successfully' };
  }

  static async getDriverStats() {
    const [totalDrivers, activeDrivers, onTripDrivers, inactiveDrivers] = await Promise.all([
      Driver.countDocuments(),
      Driver.countDocuments({ status: DriverStatus.ACTIVE }),
      Driver.countDocuments({ status: DriverStatus.ON_TRIP }),
      Driver.countDocuments({ status: DriverStatus.INACTIVE }),
    ]);

    return {
      totalDrivers,
      activeDrivers,
      onTripDrivers,
      inactiveDrivers,
    };
  }

  static async updateDriverDocument(driverId: string, docType: string, filePath: string) {
    const driver = await Driver.findById(driverId);

    if (!driver) {
      throw ApiError.notFound('Driver not found');
    }

    if (docType === 'other') {
      // Add to 'others' array
      if (!driver.documents.others) {
        driver.documents.others = [];
      }
      driver.documents.others.push(filePath);
    } else {
      // Update specific document field
      (driver.documents as any)[docType] = filePath;
    }

    await driver.save();

    // If uploading photo, also update the User's profilePicture so it shows in mobile app
    if (docType === 'photo' && driver.userId) {
      try {
        const User = (await import('../models/User.model')).User;
        await User.findByIdAndUpdate(driver.userId, { 
          profilePicture: filePath 
        });
      } catch (error) {
        console.error('Failed to update user profile picture:', error);
        // Don't throw error - driver photo is already saved
      }
    }

    return this.formatDriver(driver);
  }

  private static formatDriver(driver: any) {
    return {
      id: driver._id.toString(),
      userId: driver.userId,
      name: driver.name,
      email: driver.email,
      phone: driver.phone,
      licenseNumber: driver.licenseNumber,
      licenseExpiry: driver.licenseExpiry,
      address: driver.address,
      city: driver.city,
      state: driver.state,
      pincode: driver.pincode,
      aadharNumber: driver.aadharNumber,
      panNumber: driver.panNumber,
      bloodGroup: driver.bloodGroup,
      emergencyContact: driver.emergencyContact,
      emergencyContactName: driver.emergencyContactName,
      status: driver.status,
      currentLoadId: driver.currentLoadId,
      joiningDate: driver.joiningDate,
      salary: driver.salary,
      notes: driver.notes,
      bankAccount: driver.bankAccount,
      documents: driver.documents,
      createdAt: driver.createdAt,
      updatedAt: driver.updatedAt,
    };
  }
}