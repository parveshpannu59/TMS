const mongoose = require('mongoose');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI;

async function debugAPI() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    const Vehicle = mongoose.model('Vehicle', new mongoose.Schema({}, { strict: false }));
    const User = mongoose.model('User', new mongoose.Schema({}, { strict: false }));

    // Get owner
    const owner = await User.findOne({ role: 'owner' });
    console.log('👤 Owner Data:');
    console.log(`   _id: ${owner._id}`);
    console.log(`   companyId: ${owner.companyId}`);
    console.log(`   name: ${owner.name}`);

    // Test Query 1: Using owner's companyId
    const query1 = { companyId: owner.companyId };
    const vehicles1 = await Vehicle.find(query1);
    console.log(`\n🔍 Query 1: { companyId: '${owner.companyId}' }`);
    console.log(`   Result: ${vehicles1.length} vehicles`);

    // Test Query 2: Using owner's _id as companyId (fallback)
    const query2 = { companyId: owner._id.toString() };
    const vehicles2 = await Vehicle.find(query2);
    console.log(`\n🔍 Query 2: { companyId: '${owner._id}' } (fallback)`);
    console.log(`   Result: ${vehicles2.length} vehicles`);

    // Show all vehicles
    console.log('\n🚗 All Vehicles in DB:');
    const allVehicles = await Vehicle.find({});
    allVehicles.forEach((v, i) => {
      console.log(`   ${i+1}. ${v.vehicleName || 'Unnamed'} (${v.vehicleType})`);
      console.log(`      companyId: ${v.companyId}`);
    });

    // Show what companyId values exist
    console.log('\n📊 Unique companyId values in vehicles:');
    const uniqueCompanyIds = await Vehicle.distinct('companyId');
    uniqueCompanyIds.forEach(id => {
      const count = allVehicles.filter(v => v.companyId === id).length;
      console.log(`   ${id}: ${count} vehicles`);
    });

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.connection.close();
    console.log('\n👋 Done!');
    process.exit(0);
  }
}

debugAPI();
