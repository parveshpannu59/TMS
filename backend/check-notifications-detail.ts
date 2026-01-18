import mongoose from 'mongoose';
import { config } from './src/config/env';

const checkNotifications = async () => {
  try {
    await mongoose.connect(config.mongoUri);
    console.log('✅ Connected to MongoDB\n');

    const db = mongoose.connection.db;

    // Get all notifications with full details
    const notifications = await db?.collection('notifications').find({}).toArray();
    
    console.log('========== ALL NOTIFICATIONS (DETAILED) ==========\n');
    console.log(`Total: ${notifications?.length || 0}\n`);

    notifications?.forEach((notif: any, idx: number) => {
      console.log(`--- Notification ${idx + 1} ---`);
      console.log(`ID: ${notif._id}`);
      console.log(`Title: ${notif.title}`);
      console.log(`Message: ${notif.message}`);
      console.log(`Type: ${notif.type}`);
      console.log(`Read: ${notif.read}`);
      console.log(`Created: ${notif.createdAt}`);
      console.log(`Metadata:`, JSON.stringify(notif.metadata, null, 2));
      console.log('');
    });

    await mongoose.connection.close();
    console.log('✅ Check complete');
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
};

checkNotifications();
