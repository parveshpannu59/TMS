import mongoose from 'mongoose';
import { config } from './src/config/env';

const testUnassign = async () => {
  try {
    await mongoose.connect(config.mongoUri);
    console.log('✅ Connected to MongoDB\n');

    const db = mongoose.connection.db;

    // Get LOAD-1004 to unassign it
    const load = await db?.collection('loads').findOne({ loadNumber: 'LOAD-1004' });
    if (!load) {
      console.log('Load LOAD-1004 not found');
      process.exit(1);
    }

    console.log(`Load found: ${load.loadNumber}`);
    console.log(`Current Driver: ${load.driverId}`);
    console.log(`Current Status: ${load.status}\n`);

    // Before unassign - check assignments
    const beforeAssignments = await db?.collection('assignments').find({ loadId: load._id }).toArray();
    console.log(`Assignments before: ${beforeAssignments?.length}`);
    beforeAssignments?.forEach((a: any) => {
      console.log(`  - Status: ${a.status}, Driver: ${a.driverId}`);
    });

    // Before unassign - check notifications
    const beforeNotifications = await db?.collection('notifications').find({
      'metadata.loadId': load._id.toString(),
    }).toArray();
    console.log(`\nNotifications before: ${beforeNotifications?.length}`);
    beforeNotifications?.forEach((n: any) => {
      console.log(`  - Title: ${n.title}, Status: ${n.metadata?.status || 'none'}, Read: ${n.read}`);
    });

    await mongoose.connection.close();
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
};

testUnassign();
