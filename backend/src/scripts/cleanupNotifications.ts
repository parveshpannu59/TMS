import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../.env') });

const MONGODB_URI = process.env.MONGODB_URI || '';

async function cleanupInvalidNotifications() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ MongoDB Connected');

    const db = mongoose.connection.db;
    if (!db) {
      throw new Error('Database connection not established');
    }

    console.log('\n🔧 Cleaning up invalid notifications...');

    // Delete all notifications with loadNumber metadata that reference non-existent loads
    const notificationsCollection = db.collection('notifications');
    const loadsCollection = db.collection('loads');

    // Get all notifications with LOAD type and loadNumber in metadata
    const invalidNotifications = await notificationsCollection
      .find({
        type: 'load',
        'metadata.loadNumber': { $exists: true }
      })
      .toArray();

    console.log(`Found ${invalidNotifications.length} load notifications to check...`);

    let deletedCount = 0;
    for (const notification of invalidNotifications) {
      const loadNumber = notification.metadata?.loadNumber;
      
      // Check if load exists with this loadNumber
      const loadExists = await loadsCollection.findOne({ loadNumber });
      
      if (!loadExists) {
        console.log(`❌ Deleting notification for non-existent load: ${loadNumber}`);
        await notificationsCollection.deleteOne({ _id: notification._id });
        deletedCount++;
      }
    }

    console.log(`\n✅ Deleted ${deletedCount} invalid notifications`);
    console.log('✅ Cleanup completed successfully');
    
  } catch (error) {
    console.error('❌ Error during cleanup:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
    process.exit(0);
  }
}

cleanupInvalidNotifications();
