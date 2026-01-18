import mongoose from 'mongoose';
import { config } from './src/config/env';

const syncNotificationStatus = async () => {
  try {
    await mongoose.connect(config.mongoUri);
    console.log('✅ Connected to MongoDB\n');

    const db = mongoose.connection.db;

    // Get all assignments
    const assignments = await db?.collection('assignments').find({}).toArray();
    console.log(`Found ${assignments?.length || 0} assignments\n`);

    // Update notifications based on assignment status
    for (const assignment of assignments || []) {
      const status = assignment.status; // 'accepted', 'rejected', 'pending', etc.
      const loadId = assignment.loadId.toString();
      const assignmentId = assignment._id.toString();

      console.log(`Processing Assignment ${assignmentId}: ${status}`);

      // Find notifications for this assignment
      const result = await db?.collection('notifications').updateMany(
        {
          'metadata.assignmentId': assignmentId,
          'metadata.loadId': loadId,
        },
        {
          $set: {
            'metadata.status': status,
          },
        }
      );

      if (result && result.modifiedCount > 0) {
        console.log(`  ✅ Updated ${result.modifiedCount} notification(s) with status: ${status}`);
      } else {
        console.log(`  ⚠️ No notifications found for this assignment`);
      }
    }

    // Also update any notifications that don't have an assignment (old ones)
    console.log('\n--- Checking for notifications without assignments ---');
    const notificationsWithoutStatus = await db?.collection('notifications').find({
      'metadata.status': { $exists: false },
      'metadata.assignmentId': { $exists: true },
    }).toArray();

    console.log(`Found ${notificationsWithoutStatus?.length || 0} notifications without status\n`);

    await mongoose.connection.close();
    console.log('\n✅ Migration complete');
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
};

syncNotificationStatus();
