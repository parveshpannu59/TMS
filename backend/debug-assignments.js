const mongoose = require('mongoose');
require('dotenv').config();

const mongoUri = process.env.MONGODB_URI || 'mongodb+srv://admin:admin@tmshaulxp.vqmpy.mongodb.net/tms?retryWrites=true&w=majority';

async function debugAssignments() {
  try {
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB');

    const db = mongoose.connection.db;
    
    // Check assignments collection
    const assignmentsCount = await db.collection('assignments').countDocuments();
    console.log(`\n📦 Total Assignments in DB: ${assignmentsCount}`);
    
    if (assignmentsCount > 0) {
      const assignments = await db.collection('assignments').find({}).limit(5).toArray();
      console.log('📋 Recent assignments:');
      assignments.forEach(a => {
        console.log(`  - Load: ${a.loadId}, Driver: ${a.driverId}, Status: ${a.status}, Expires: ${a.expiresAt}`);
      });
    }
    
    // Check drivers with userId
    const driversWithUserId = await db.collection('drivers').countDocuments({ userId: { $exists: true, $ne: null } });
    console.log(`\n👤 Drivers with userId: ${driversWithUserId}`);
    
    // Get all drivers
    const allDrivers = await db.collection('drivers').find({}).limit(3).toArray();
    console.log('👥 Sample drivers:');
    allDrivers.forEach(d => {
      console.log(`  - ${d.name}: userId=${d.userId}, email=${d.email}`);
    });
    
    // Check users
    const users = await db.collection('users').find({ role: 'driver' }).limit(3).toArray();
    console.log(`\n🔐 Driver users:`);
    users.forEach(u => {
      console.log(`  - ${u.email}: _id=${u._id}`);
    });
    
    mongoose.connection.close();
    console.log('\n✅ Debug complete');
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

debugAssignments();
