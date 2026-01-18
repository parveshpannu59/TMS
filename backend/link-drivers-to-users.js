const mongoose = require('mongoose');
require('dotenv').config();

const mongoUri = process.env.MONGODB_URI || 'mongodb+srv://admin:admin@tmshaulxp.vqmpy.mongodb.net/tms?retryWrites=true&w=majority';

async function linkDriversToUsers() {
  try {
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB');

    const db = mongoose.connection.db;
    
    // Get all drivers
    const drivers = await db.collection('drivers').find({}).toArray();
    console.log(`\n👥 Found ${drivers.length} drivers`);
    
    let linked = 0;
    let skipped = 0;
    
    for (const driver of drivers) {
      // Skip if already linked
      if (driver.userId) {
        console.log(`⏭️  ${driver.name}: Already linked to ${driver.userId}`);
        skipped++;
        continue;
      }
      
      // Try to find user by email
      let user = null;
      if (driver.email) {
        user = await db.collection('users').findOne({ 
          email: driver.email, 
          role: 'driver' 
        });
      }
      
      // Try by phone
      if (!user && driver.phone) {
        user = await db.collection('users').findOne({ 
          phone: driver.phone, 
          role: 'driver' 
        });
      }
      
      if (user) {
        const result = await db.collection('drivers').updateOne(
          { _id: driver._id },
          { $set: { userId: user._id.toString() } }
        );
        console.log(`✅ ${driver.name}: Linked to user ${user._id}`);
        linked++;
      } else {
        console.log(`❌ ${driver.name}: No matching user found (email: ${driver.email}, phone: ${driver.phone})`);
      }
    }
    
    console.log(`\n📊 Summary: Linked=${linked}, Skipped=${skipped}`);
    
    // Show updated drivers
    console.log('\n📋 Updated drivers:');
    const updatedDrivers = await db.collection('drivers').find({}).limit(5).toArray();
    updatedDrivers.forEach(d => {
      console.log(`  - ${d.name}: userId=${d.userId || 'NOT LINKED'}`);
    });
    
    mongoose.connection.close();
    console.log('\n✅ Link complete');
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

linkDriversToUsers();
