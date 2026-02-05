const mongoose = require('mongoose');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI;

const VehicleSchema = new mongoose.Schema({
  companyId: String,
  vehicleType: String,
  unitNumber: String,
  vehicleName: String,
  registrationNumber: String,
  make: String,
  vehicleModel: String,
  year: Number,
  vin: String,
  capacity: String,
  status: String,
  currentLoadId: String,
  currentDriverId: String,
  trailerType: String,
  currentTruckId: String,
  vehicleImage: String,
  documents: {
    registration: String,
    insurance: String,
    permit: String,
    fitness: String,
    pollution: String,
    others: [String]
  },
  notes: String,
  createdBy: String
}, { timestamps: true });

async function addVehicles() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    const Vehicle = mongoose.model('Vehicle', VehicleSchema);
    const User = mongoose.model('User', new mongoose.Schema({}, { strict: false }));
    const db = mongoose.connection.db;

    // Find owner
    const owner = await User.findOne({ role: 'owner' });
    if (!owner) {
      console.log('❌ No owner found');
      return;
    }

    const companyId = owner.companyId || owner._id.toString();
    const createdBy = owner._id.toString();

    // Check for old trucks/trailers collections
    const collections = await db.listCollections().toArray();
    const collectionNames = collections.map(c => c.name);
    console.log('📦 Collections:', collectionNames.join(', '));

    let migratedCount = 0;

    // Check for old trucks
    if (collectionNames.includes('trucks')) {
      const Truck = mongoose.model('Truck', new mongoose.Schema({}, { strict: false }));
      const trucks = await Truck.find({});
      console.log(`\n🚛 Found ${trucks.length} old trucks`);

      for (const truck of trucks) {
        try {
          await Vehicle.create({
            companyId: truck.companyId || companyId,
            vehicleType: 'truck',
            unitNumber: truck.unitNumber || truck.truckNumber || `TRK-${Date.now()}`,
            vehicleName: truck.name || truck.truckName || 'Truck',
            registrationNumber: truck.registrationNumber || truck.plateNumber || 'N/A',
            make: truck.make,
            vehicleModel: truck.model,
            year: truck.year,
            vin: truck.vin || `VIN${Date.now()}`,
            capacity: truck.capacity,
            status: truck.status || 'available',
            currentLoadId: truck.currentLoad,
            currentDriverId: truck.currentDriver || truck.assignedDriver,
            vehicleImage: truck.image || truck.photo,
            documents: truck.documents || { others: [] },
            notes: truck.notes,
            createdBy: truck.createdBy || createdBy
          });
          migratedCount++;
          console.log(`  ✅ Migrated: ${truck.name || 'Truck'}`);
        } catch (err) {
          console.log(`  ⚠️ Skip duplicate: ${truck.name || 'Truck'}`);
        }
      }
    }

    // Check for old trailers
    if (collectionNames.includes('trailers')) {
      const Trailer = mongoose.model('Trailer', new mongoose.Schema({}, { strict: false }));
      const trailers = await Trailer.find({});
      console.log(`\n🚚 Found ${trailers.length} old trailers`);

      for (const trailer of trailers) {
        try {
          await Vehicle.create({
            companyId: trailer.companyId || companyId,
            vehicleType: 'trailer',
            unitNumber: trailer.unitNumber || trailer.trailerNumber || `TRL-${Date.now()}`,
            vehicleName: trailer.name || trailer.trailerName || 'Trailer',
            registrationNumber: trailer.registrationNumber || trailer.plateNumber || 'N/A',
            make: trailer.make,
            vehicleModel: trailer.model,
            year: trailer.year,
            vin: trailer.vin || `VIN${Date.now()}`,
            capacity: trailer.capacity,
            status: trailer.status || 'available',
            currentLoadId: trailer.currentLoad,
            currentDriverId: trailer.currentDriver,
            trailerType: trailer.trailerType,
            currentTruckId: trailer.assignedTruck,
            vehicleImage: trailer.image || trailer.photo,
            documents: trailer.documents || { others: [] },
            notes: trailer.notes,
            createdBy: trailer.createdBy || createdBy
          });
          migratedCount++;
          console.log(`  ✅ Migrated: ${trailer.name || 'Trailer'}`);
        } catch (err) {
          console.log(`  ⚠️ Skip duplicate: ${trailer.name || 'Trailer'}`);
        }
      }
    }

    // Check current vehicle count
    const vehicleCount = await Vehicle.countDocuments({ companyId });
    console.log(`\n📊 Total vehicles in database: ${vehicleCount}`);

    // If no vehicles exist, create sample data
    if (vehicleCount === 0) {
      console.log('\n📝 Creating sample vehicles...');

      const sampleVehicles = [
        {
          companyId,
          vehicleType: 'truck',
          unitNumber: 'TRK001',
          vehicleName: 'Tata Prima 4940',
          registrationNumber: 'TN01AB1234',
          make: 'Tata',
          vehicleModel: 'Prima 4940',
          year: 2022,
          vin: 'VIN1234567890TRK001',
          capacity: '25 Tons',
          status: 'available',
          documents: { others: [] },
          createdBy
        },
        {
          companyId,
          vehicleType: 'truck',
          unitNumber: 'TRK002',
          vehicleName: 'Ashok Leyland 3718',
          registrationNumber: 'TN02CD5678',
          make: 'Ashok Leyland',
          vehicleModel: '3718',
          year: 2021,
          vin: 'VIN1234567890TRK002',
          capacity: '20 Tons',
          status: 'available',
          documents: { others: [] },
          createdBy
        },
        {
          companyId,
          vehicleType: 'truck',
          unitNumber: 'TRK003',
          vehicleName: 'Volvo FH16',
          registrationNumber: 'KA03EF9012',
          make: 'Volvo',
          vehicleModel: 'FH16',
          year: 2023,
          vin: 'VIN1234567890TRK003',
          capacity: '28 Tons',
          status: 'available',
          documents: { others: [] },
          createdBy
        },
        {
          companyId,
          vehicleType: 'trailer',
          unitNumber: 'TRL001',
          vehicleName: 'Dry Van Trailer',
          registrationNumber: 'TN04GH3456',
          make: 'Utility',
          vehicleModel: '3000R',
          year: 2022,
          vin: 'VIN1234567890TRL001',
          capacity: '28 Tons',
          status: 'available',
          trailerType: 'dry_van',
          documents: { others: [] },
          createdBy
        },
        {
          companyId,
          vehicleType: 'trailer',
          unitNumber: 'TRL002',
          vehicleName: 'Reefer Trailer',
          registrationNumber: 'KA05IJ7890',
          make: 'Wabash',
          vehicleModel: 'DuraPlate',
          year: 2021,
          vin: 'VIN1234567890TRL002',
          capacity: '24 Tons',
          status: 'available',
          trailerType: 'reefer',
          documents: { others: [] },
          createdBy
        }
      ];

      await Vehicle.insertMany(sampleVehicles);
      console.log(`✅ Created ${sampleVehicles.length} sample vehicles`);
      console.log('  🚛 3 Trucks: Tata Prima, Ashok Leyland, Volvo FH16');
      console.log('  🚚 2 Trailers: Dry Van, Reefer');
    } else if (migratedCount > 0) {
      console.log(`\n✅ Migrated ${migratedCount} vehicles from old data`);
    } else {
      console.log('\n✅ Vehicles already exist in database');
    }

    const finalCount = await Vehicle.countDocuments({ companyId });
    console.log(`\n🎉 Total vehicles ready: ${finalCount}`);

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.connection.close();
    console.log('\n👋 Done!');
    process.exit(0);
  }
}

addVehicles();
