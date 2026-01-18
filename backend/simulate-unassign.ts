import mongoose from 'mongoose';
import { config } from './src/config/env';
import Notification from './src/models/Notification';
import { notifyAssignmentCancelled } from './src/utils/notificationHelper';
import { Driver } from './src/models/Driver.model';
import { Load } from './src/models/Load.model';

const simulateUnassign = async () => {
  try {
    await mongoose.connect(config.mongoUri);
    console.log('✅ Connected to MongoDB\n');

    // Get LOAD-1004
    const load = await Load.findOne({ loadNumber: 'LOAD-1004' });
    if (!load) {
      console.log('❌ Load not found');
      process.exit(1);
    }

    console.log(`📦 Load: ${load.loadNumber}`);
    console.log(`👤 Driver ID: ${load.driverId}`);
    console.log(`📊 Status: ${load.status}\n`);

    const driver = await Driver.findById(load.driverId).lean();
    const driverUserId = (driver as any)?.userId;
    console.log(`👥 Driver User ID: ${driverUserId}\n`);

    // Simulate notification for cancellation
    console.log('📬 Creating "Assignment Cancelled" notification...');
    await notifyAssignmentCancelled(
      load.companyId?.toString() || 'unknown',
      driverUserId,
      load.loadNumber,
      load._id.toString(),
      'Driver reassignment needed'
    );

    // Update old notifications
    console.log('📝 Updating old "New Load Assigned" notifications...\n');
    const updateResult = await Notification.updateMany(
      {
        userId: driverUserId as any,
        'metadata.loadId': load._id.toString(),
        type: 'load',
      },
      {
        $set: {
          read: true,
          title: 'Assignment Cancelled',
          message: `Assignment for Load #${load.loadNumber} has been cancelled`,
          'metadata.status': 'unassigned',
          readAt: new Date(),
        },
      }
    );

    console.log(`✅ Updated ${updateResult.modifiedCount} notification(s)\n`);

    // Show all notifications for this load
    console.log('📋 All notifications for this load after unassign:');
    const allNotifications = await Notification.find({
      userId: driverUserId as any,
      'metadata.loadId': load._id.toString(),
    });

    allNotifications.forEach((n, idx) => {
      console.log(`\n${idx + 1}. ${n.title}`);
      console.log(`   Type: ${n.type}`);
      console.log(`   Message: ${n.message}`);
      console.log(`   Status: ${n.metadata?.status || 'none'} 🟠 UNASSIGNED`);
      console.log(`   Read: ${n.read ? '✅' : '❌'}`);
      console.log(`   Created: ${n.createdAt}`);
    });

    await mongoose.connection.close();
    console.log('\n✅ Simulation complete');
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
};

simulateUnassign();
