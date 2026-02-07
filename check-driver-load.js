// Temporary script to check driver and load data
// Run this in backend directory: node check-driver-load.js

const mongoose = require('mongoose');
require('dotenv').config();

const checkDriverLoad = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/tms');
    console.log('✅ Connected to MongoDB');

    const Load = mongoose.model('Load');
    const Driver = mongoose.model('Driver');
    const User = mongoose.model('User');

    // Find the load
    const loadId = '69777fd3edcf7e32fddd02d6';
    const load = await Load.findById(loadId);
    
    if (!load) {
      console.log('❌ Load not found');
      process.exit(1);
    }

    console.log('\n📦 Load Details:');
    console.log('  Load ID:', load._id.toString());
    console.log('  Load Number:', load.loadNumber);
    console.log('  Driver ID (assigned):', load.driverId);
    console.log('  Driver ID type:', typeof load.driverId);
    console.log('  Driver ID toString:', load.driverId?.toString());
    console.log('  Status:', load.status);

    // Find the driver by driverId
    if (load.driverId) {
      const driver = await Driver.findById(load.driverId);
      if (driver) {
        console.log('\n👤 Assigned Driver Details:');
        console.log('  Driver _id:', driver._id.toString());
        console.log('  Driver Name:', driver.name);
        console.log('  Driver User ID:', driver.userId);
        console.log('  Driver User ID type:', typeof driver.userId);

        // Find the user
        if (driver.userId) {
          const user = await User.findById(driver.userId);
          if (user) {
            console.log('\n👤 Driver User Account:');
            console.log('  User _id:', user._id.toString());
            console.log('  User Email:', user.email);
            console.log('  User Role:', user.role);
            console.log('  User Status:', user.status);
          }
        }
      } else {
        console.log('❌ Driver not found with ID:', load.driverId);
      }
    }

    // Check all drivers to see if any match
    console.log('\n🔍 All Drivers:');
    const allDrivers = await Driver.find({}).limit(10);
    allDrivers.forEach(d => {
      console.log(`  - ${d.name} (ID: ${d._id.toString()}, UserID: ${d.userId})`);
      if (d._id.toString() === load.driverId?.toString()) {
        console.log('    ✅ THIS IS THE ASSIGNED DRIVER');
      }
    });

    await mongoose.connection.close();
    console.log('\n✅ Done');
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
};

checkDriverLoad();
