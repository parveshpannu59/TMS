import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../.env') });

const MONGODB_URI = process.env.MONGODB_URI || '';

async function dropOldIndexes() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ MongoDB Connected');

    const db = mongoose.connection.db;
    if (!db) {
      throw new Error('Database connection not established');
    }

    // Drop old truck indexes
    const oldTruckIndexes = ['truckNumber_1', 'registrationNumber_1'];
    for (const indexName of oldTruckIndexes) {
      try {
        console.log(`\n🔧 Dropping old ${indexName} index from trucks collection...`);
        await db.collection('trucks').dropIndex(indexName);
        console.log(`✅ Dropped ${indexName} index`);
      } catch (err: any) {
        if (err.code === 27 || err.codeName === 'IndexNotFound') {
          console.log(`ℹ️  ${indexName} index does not exist (already dropped or never created)`);
        } else {
          console.error(`❌ Error dropping ${indexName} index:`, err.message);
        }
      }
    }

    // Drop old userId_1 index from drivers collection if it exists and recreate as sparse
    try {
      console.log('\n🔧 Checking userId_1 index on drivers collection...');
      const indexes = await db.collection('drivers').indexes();
      const userIdIndex = indexes.find((idx: any) => idx.name === 'userId_1');
      
      if (userIdIndex && !userIdIndex.sparse) {
        console.log('Dropping non-sparse userId_1 index...');
        await db.collection('drivers').dropIndex('userId_1');
        console.log('✅ Dropped non-sparse userId_1 index');
        
        console.log('Creating sparse userId_1 index...');
        await db.collection('drivers').createIndex({ userId: 1 }, { sparse: true });
        console.log('✅ Created sparse userId_1 index');
      } else if (userIdIndex && userIdIndex.sparse) {
        console.log('ℹ️  userId_1 index is already sparse');
      } else {
        console.log('Creating sparse userId_1 index...');
        await db.collection('drivers').createIndex({ userId: 1 }, { sparse: true });
        console.log('✅ Created sparse userId_1 index');
      }
    } catch (err: any) {
      console.error('❌ Error managing userId index:', err.message);
    }

    console.log('\n✅ Index cleanup completed successfully');
    
  } catch (error) {
    console.error('❌ Error during index cleanup:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
    process.exit(0);
  }
}

dropOldIndexes();
