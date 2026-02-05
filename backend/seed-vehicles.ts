import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { Vehicle, VehicleType, VehicleStatus, TrailerType } from './src/models/Vehicle.model';
import { User } from './src/models/User.model';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/tms';

async function seedVehicles() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Find an owner user
    const owner = await User.findOne({ role: 'owner' });
    if (!owner) {
      console.log('❌ No owner found. Please run seed script first.');
      return;
    }

    const companyId = owner.companyId || owner._id.toString();
    const createdBy = owner._id.toString();

    // Check if vehicles already exist
    const existingVehicles = await Vehicle.countDocuments({ companyId });
    if (existingVehicles > 0) {
      console.log(`✅ Already have ${existingVehicles} vehicles in database`);
      const vehicles = await Vehicle.find({ companyId }).limit(5);
      vehicles.forEach(v => {
        console.log(`  - ${v.vehicleName} (${v.vehicleType}) - ${v.status}`);
      });
      return;
    }

    console.log('\n📦 Creating test vehicles...');

    // Create sample trucks
    const trucks = [
      {
        companyId,
        vehicleType: VehicleType.TRUCK,
        unitNumber: 'TRK001',
        vehicleName: 'Volvo FH16',
        registrationNumber: 'TN01AB1234',
        make: 'Volvo',
        vehicleModel: 'FH16',
        year: 2022,
        vin: 'VIN1234567890ABCD1',
        capacity: '25 Tons',
        status: VehicleStatus.AVAILABLE,
        documents: { others: [] },
        createdBy,
      },
      {
        companyId,
        vehicleType: VehicleType.TRUCK,
        unitNumber: 'TRK002',
        vehicleName: 'Tata Prima',
        registrationNumber: 'TN02CD5678',
        make: 'Tata',
        vehicleModel: 'Prima 4940',
        year: 2021,
        vin: 'VIN1234567890ABCD2',
        capacity: '20 Tons',
        status: VehicleStatus.AVAILABLE,
        documents: { others: [] },
        createdBy,
      },
      {
        companyId,
        vehicleType: VehicleType.TRUCK,
        unitNumber: 'TRK003',
        vehicleName: 'Ashok Leyland',
        registrationNumber: 'KA03EF9012',
        make: 'Ashok Leyland',
        vehicleModel: '3718',
        year: 2023,
        vin: 'VIN1234567890ABCD3',
        capacity: '18 Tons',
        status: VehicleStatus.AVAILABLE,
        documents: { others: [] },
        createdBy,
      },
    ];

    // Create sample trailers
    const trailers = [
      {
        companyId,
        vehicleType: VehicleType.TRAILER,
        unitNumber: 'TRL001',
        vehicleName: 'Dry Van Trailer',
        registrationNumber: 'TN04GH3456',
        make: 'Utility',
        vehicleModel: '3000R',
        year: 2022,
        vin: 'VIN1234567890ABCD4',
        capacity: '28 Tons',
        status: VehicleStatus.AVAILABLE,
        trailerType: TrailerType.DRY_VAN,
        documents: { others: [] },
        createdBy,
      },
      {
        companyId,
        vehicleType: VehicleType.TRAILER,
        unitNumber: 'TRL002',
        vehicleName: 'Reefer Trailer',
        registrationNumber: 'KA05IJ7890',
        make: 'Wabash',
        vehicleModel: 'DuraPlate',
        year: 2021,
        vin: 'VIN1234567890ABCD5',
        capacity: '24 Tons',
        status: VehicleStatus.AVAILABLE,
        trailerType: TrailerType.REEFER,
        documents: { others: [] },
        createdBy,
      },
    ];

    // Insert vehicles
    const createdTrucks = await Vehicle.insertMany(trucks);
    const createdTrailers = await Vehicle.insertMany(trailers);

    console.log(`\n✅ Created ${createdTrucks.length} trucks`);
    createdTrucks.forEach(t => console.log(`  🚛 ${t.vehicleName} - ${t.registrationNumber}`));

    console.log(`\n✅ Created ${createdTrailers.length} trailers`);
    createdTrailers.forEach(t => console.log(`  🚚 ${t.vehicleName} - ${t.registrationNumber}`));

    const totalVehicles = await Vehicle.countDocuments({ companyId });
    console.log(`\n📊 Total vehicles in database: ${totalVehicles}`);

  } catch (error) {
    console.error('❌ Error seeding vehicles:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n👋 Database connection closed');
  }
}

seedVehicles();
