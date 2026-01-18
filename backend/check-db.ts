import mongoose from 'mongoose';
import { config } from './src/config/env';

const checkDatabase = async () => {
  try {
    // Connect to database
    await mongoose.connect(config.mongoUri);
    console.log('✅ Connected to MongoDB');

    const db = mongoose.connection.db;

    // Get Assignment Collection Stats
    console.log('\n========== ASSIGNMENTS ==========');
    const assignments = await db?.collection('assignments').find({}).toArray();
    console.log(`Total Assignments: ${assignments?.length || 0}`);
    
    if (assignments && assignments.length > 0) {
      // Group by status
      const statusMap = {} as any;
      assignments.forEach((doc: any) => {
        const status = doc.status || 'NO_STATUS';
        statusMap[status] = (statusMap[status] || 0) + 1;
      });
      
      console.log('\nAssignment Status Distribution:');
      Object.entries(statusMap).forEach(([status, count]) => {
        console.log(`  ${status}: ${count}`);
      });
      
      // Show sample assignments
      console.log('\nSample Assignments (first 3):');
      assignments.slice(0, 3).forEach((doc: any, idx: number) => {
        console.log(`\n${idx + 1}. Load: ${doc.loadId}`);
        console.log(`   Driver: ${doc.driverId}`);
        console.log(`   Status: ${doc.status}`);
        console.log(`   Created: ${doc.createdAt}`);
      });
    }

    // Get Notification Collection Stats
    console.log('\n\n========== NOTIFICATIONS ==========');
    const notifications = await db?.collection('notifications').find({}).toArray();
    console.log(`Total Notifications: ${notifications?.length || 0}`);
    
    if (notifications && notifications.length > 0) {
      // Group by type and metadata.status
      const typeMap = {} as any;
      const metadataStatusMap = {} as any;
      
      notifications.forEach((doc: any) => {
        const type = doc.type || 'NO_TYPE';
        const metaStatus = doc.metadata?.status || 'NO_META_STATUS';
        
        typeMap[type] = (typeMap[type] || 0) + 1;
        metadataStatusMap[metaStatus] = (metadataStatusMap[metaStatus] || 0) + 1;
      });
      
      console.log('\nNotification Type Distribution:');
      Object.entries(typeMap).forEach(([type, count]) => {
        console.log(`  ${type}: ${count}`);
      });

      console.log('\nNotification Metadata Status Distribution:');
      Object.entries(metadataStatusMap).forEach(([status, count]) => {
        console.log(`  ${status}: ${count}`);
      });
      
      // Show sample notifications
      console.log('\nSample Notifications (first 3):');
      notifications.slice(0, 3).forEach((doc: any, idx: number) => {
        console.log(`\n${idx + 1}. Title: ${doc.title}`);
        console.log(`   Type: ${doc.type}`);
        console.log(`   Read: ${doc.read}`);
        console.log(`   Metadata Status: ${doc.metadata?.status || 'none'}`);
        console.log(`   Created: ${doc.createdAt}`);
      });
    }

    // Check Assignment with Notification together
    console.log('\n\n========== RELATED DATA CHECK ==========');
    const assignmentsWithLoad = await db?.collection('assignments').aggregate([
      { $limit: 5 },
      {
        $lookup: {
          from: 'loads',
          localField: 'loadId',
          foreignField: '_id',
          as: 'loadDetails'
        }
      },
      {
        $lookup: {
          from: 'notifications',
          let: { loadId: '$loadId', driverId: '$driverId' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ['$metadata.loadId', '$$loadId'] },
                    { $eq: ['$metadata.driverId', '$$driverId'] }
                  ]
                }
              }
            }
          ],
          as: 'notifications'
        }
      }
    ]).toArray();

    console.log('Assignment + Notification Relationships (first 5):');
    assignmentsWithLoad?.forEach((doc: any, idx: number) => {
      console.log(`\n${idx + 1}. Assignment Status: ${doc.status}`);
      console.log(`   Load #: ${doc.loadDetails?.[0]?.loadNumber || 'N/A'}`);
      console.log(`   Notifications Found: ${doc.notifications?.length || 0}`);
      if (doc.notifications && doc.notifications.length > 0) {
        doc.notifications.forEach((notif: any) => {
          console.log(`     - ${notif.title} (metadata.status: ${notif.metadata?.status || 'none'})`);
        });
      }
    });

    await mongoose.connection.close();
    console.log('\n✅ Database check complete');
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
};

checkDatabase();
