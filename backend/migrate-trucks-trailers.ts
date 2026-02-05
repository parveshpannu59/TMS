import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { Vehicle, VehicleType, VehicleStatus } from './src/models/Vehicle.model';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/tms';

async function migrateTrucksAndTrailers() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    const db = mongoose.connection.db;
    if (!db) {
      throw new Error('Database connection not established');
    }

    // Check for trucks collection
    const collections = await db.listCollections().toArray();
    const collectionNames = collections.map(c => c.name);
    
    console.log('\n📦 Available collections:', collectionNames);

    let trucksCount = 0;
    let trailersCount = 0;
    let migratedCount = 0;

    // Migrate trucks
    if (collectionNames.includes('trucks')) {
      const trucksCollection = db.collection('trucks');
      const trucks = await trucksCollection.find({}).toArray();
      trucksCount = trucks.length;
      
      console.log(`\n🚛 Found ${trucksCount} trucks to migrate`);

      for (const truck of trucks) {
        try {
          const vehicleData = {
            companyId: truck.companyId || truck.owner || 'unknown',
            vehicleType: VehicleType.TRUCK,
            unitNumber: truck.unitNumber || truck.truckNumber || `TRUCK-${truck._id}`,
            vehicleName: truck.name || truck.truckName || 'Unnamed Truck',
            registrationNumber: truck.registrationNumber || truck.plateNumber || 'UNKNOWN',
            make: truck.make,
            vehicleModel: truck.model,
            year: truck.year,
            vin: truck.vin || `VIN-${truck._id}`,
            capacity: truck.capacity,
            status: truck.status === 'available' ? VehicleStatus.AVAILABLE : 
                   truck.status === 'assigned' ? VehicleStatus.ASSIGNED : 
                   truck.status === 'on_road' ? VehicleStatus.ON_ROAD :
                   VehicleStatus.AVAILABLE,
            currentLoadId: truck.currentLoad,
            currentDriverId: truck.currentDriver || truck.assignedDriver,
            vehicleImage: truck.image || truck.photo,
            documents: {
              registration: truck.documents?.registration,
              insurance: truck.documents?.insurance,
              permit: truck.documents?.permit,
              fitness: truck.documents?.fitness,
              pollution: truck.documents?.pollution,
              others: truck.documents?.others || [],
            },
            notes: truck.notes,
            createdBy: truck.createdBy || truck.owner || 'migrated',
          };

          await Vehicle.create(vehicleData);
          migratedCount++;
          console.log(`  ✅ Migrated truck: ${vehicleData.vehicleName}`);
        } catch (error: any) {
          console.log(`  ❌ Failed to migrate truck ${truck._id}: ${error.message}`);
        }
      }
    }

    // Migrate trailers
    if (collectionNames.includes('trailers')) {
      const trailersCollection = db.collection('trailers');
      const trailers = await trailersCollection.find({}).toArray();
      trailersCount = trailers.length;
      
      console.log(`\n🚚 Found ${trailersCount} trailers to migrate`);

      for (const trailer of trailers) {
        try {
          const vehicleData = {
            companyId: trailer.companyId || trailer.owner || 'unknown',
            vehicleType: VehicleType.TRAILER,
            unitNumber: trailer.unitNumber || trailer.trailerNumber || `TRAILER-${trailer._id}`,
            vehicleName: trailer.name || trailer.trailerName || 'Unnamed Trailer',
            registrationNumber: trailer.registrationNumber || trailer.plateNumber || 'UNKNOWN',
            make: trailer.make,
            vehicleModel: trailer.model,
            year: trailer.year,
            vin: trailer.vin || `VIN-${trailer._id}`,
            capacity: trailer.capacity,
            status: trailer.status === 'available' ? VehicleStatus.AVAILABLE : 
                   trailer.status === 'assigned' ? VehicleStatus.ASSIGNED : 
                   trailer.status === 'on_road' ? VehicleStatus.ON_ROAD :
                   VehicleStatus.AVAILABLE,
            currentLoadId: trailer.currentLoad,
            currentDriverId: trailer.currentDriver || trailer.assignedDriver,
            trailerType: trailer.trailerType,
            currentTruckId: trailer.assignedTruck || trailer.currentTruck,
            vehicleImage: trailer.image || trailer.photo,
            documents: {
              registration: trailer.documents?.registration,
              insurance: trailer.documents?.insurance,
              permit: trailer.documents?.permit,
              fitness: trailer.documents?.fitness,
              pollution: trailer.documents?.pollution,
              others: trailer.documents?.others || [],
            },
            notes: trailer.notes,
            createdBy: trailer.createdBy || trailer.owner || 'migrated',
          };

          await Vehicle.create(vehicleData);
          migratedCount++;
          console.log(`  ✅ Migrated trailer: ${vehicleData.vehicleName}`);
        } catch (error: any) {
          console.log(`  ❌ Failed to migrate trailer ${trailer._id}: ${error.message}`);
        }
      }
    }

    // Check current vehicles count
    const vehiclesCount = await Vehicle.countDocuments();
    
    console.log('\n📊 Migration Summary:');
    console.log(`  • Old Trucks found: ${trucksCount}`);
    console.log(`  • Old Trailers found: ${trailersCount}`);
    console.log(`  • Successfully migrated: ${migratedCount}`);
    console.log(`  • Total vehicles in database: ${vehiclesCount}`);

    if (trucksCount === 0 && trailersCount === 0) {
      console.log('\n✅ No old truck/trailer data found. Database is clean!');
    } else if (migratedCount > 0) {
      console.log('\n✅ Migration completed successfully!');
      console.log('⚠️  You can now safely drop the old collections:');
      console.log('   db.trucks.drop()');
      console.log('   db.trailers.drop()');
    }

  } catch (error) {
    console.error('❌ Migration error:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n👋 Database connection closed');
  }
}

migrateTrucksAndTrailers();
