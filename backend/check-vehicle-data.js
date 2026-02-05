const mongoose = require('mongoose');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI;

async function checkData() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    const Vehicle = mongoose.model('Vehicle', new mongoose.Schema({}, { strict: false }));
    const User = mongoose.model('User', new mongoose.Schema({}, { strict: false }));

    // Get all users
    const users = await User.find({});
    console.log('👥 Users:');
    users.forEach(u => {
      console.log(`  - ${u.name} (${u.role})`);
      console.log(`    _id: ${u._id}`);
      console.log(`    companyId: ${u.companyId || 'NOT SET'}`);
      console.log('');
    });

    // Get all vehicles
    const vehicles = await Vehicle.find({});
    console.log(`\n🚗 Vehicles (${vehicles.length} total):`);
    vehicles.forEach(v => {
      console.log(`  - ${v.vehicleName} (${v.vehicleType})`);
      console.log(`    companyId: ${v.companyId}`);
      console.log(`    createdBy: ${v.createdBy}`);
    });

    // Find owner
    const owner = await User.findOne({ role: 'owner' });
    if (owner) {
      const ownerCompanyId = owner.companyId || owner._id.toString();
      console.log(`\n🔍 Owner's companyId: ${ownerCompanyId}`);
      
      // Check how many vehicles match
      const matchingVehicles = await Vehicle.countDocuments({ companyId: ownerCompanyId });
      console.log(`✅ Vehicles matching owner's companyId: ${matchingVehicles}`);

      if (matchingVehicles === 0 && vehicles.length > 0) {
        console.log('\n⚠️  MISMATCH DETECTED! Fixing companyId...');
        
        // Update all vehicles to match owner's companyId
        const result = await Vehicle.updateMany(
          {},
          { $set: { companyId: ownerCompanyId, createdBy: owner._id.toString() } }
        );
        
        console.log(`✅ Updated ${result.modifiedCount} vehicles with correct companyId`);
        
        // Verify
        const verifyCount = await Vehicle.countDocuments({ companyId: ownerCompanyId });
        console.log(`✅ Verification: ${verifyCount} vehicles now match owner's companyId`);
      }
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.connection.close();
    console.log('\n👋 Done!');
    process.exit(0);
  }
}

checkData();
