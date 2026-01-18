/**
 * Script to link existing driver profiles to user accounts
 * Run this once to establish the userId relationship for existing drivers
 * 
 * Usage: npm run tsx src/scripts/linkDriversToUsers.ts
 */

import mongoose from 'mongoose';
import { Driver } from '../models/Driver.model';
import { User } from '../models/User.model';
import { config } from '../config/env';

async function linkDriversToUsers() {
  try {
    // Connect to MongoDB
    await mongoose.connect(config.mongoUri);
    console.log('✓ Connected to MongoDB');
    console.log('');

    // Find all drivers that don't have userId set but have an email
    const driversWithoutUserId = await Driver.find({ 
      email: { $exists: true, $ne: null, $ne: '' },
      userId: { $exists: false } 
    });

    console.log(`Found ${driversWithoutUserId.length} drivers without userId`);
    console.log('─'.repeat(80));

    let linkedCount = 0;
    let notFoundCount = 0;

    for (const driver of driversWithoutUserId) {
      // Try to find matching user by email with driver role
      const user = await User.findOne({ 
        email: driver.email, 
        role: 'driver' 
      });

      if (user) {
        // Link driver to user
        driver.userId = user._id.toString();
        await driver.save();
        linkedCount++;
        console.log(`✓ Linked: ${driver.name.padEnd(30)} | Email: ${driver.email}`);
      } else {
        notFoundCount++;
        console.log(`✗ No user: ${driver.name.padEnd(30)} | Email: ${driver.email}`);
      }
    }

    console.log('─'.repeat(80));
    console.log('');
    console.log('Summary:');
    console.log(`  Total drivers processed: ${driversWithoutUserId.length}`);
    console.log(`  Successfully linked:     ${linkedCount}`);
    console.log(`  No matching user found:  ${notFoundCount}`);
    console.log('');

    if (notFoundCount > 0) {
      console.log('⚠ For drivers without matching user accounts:');
      console.log('  1. Create user accounts with role="driver" for them');
      console.log('  2. Run this script again to link them');
      console.log('  3. Or manually update driver record with userId');
    }

    if (linkedCount > 0) {
      console.log('');
      console.log('✓ Successfully linked drivers can now:');
      console.log('  - Log in to their driver account');
      console.log('  - See loads assigned to them');
      console.log('  - Accept and manage trips');
    }

    await mongoose.disconnect();
    console.log('');
    console.log('✓ Disconnected from MongoDB');
    process.exit(0);
  } catch (error) {
    console.error('');
    console.error('✗ Error:', error);
    process.exit(1);
  }
}

// Alternative function to link drivers by phone number
async function linkDriversByPhone() {
  try {
    await mongoose.connect(config.mongoUri);
    console.log('✓ Connected to MongoDB');
    console.log('');

    const driversWithoutUserId = await Driver.find({ 
      phone: { $exists: true, $ne: null, $ne: '' },
      userId: { $exists: false } 
    });

    console.log(`Found ${driversWithoutUserId.length} drivers without userId`);
    console.log('Attempting to link by phone number...');
    console.log('─'.repeat(80));

    let linkedCount = 0;
    let notFoundCount = 0;

    for (const driver of driversWithoutUserId) {
      const user = await User.findOne({ 
        phone: driver.phone, 
        role: 'driver' 
      });

      if (user) {
        driver.userId = user._id.toString();
        await driver.save();
        linkedCount++;
        console.log(`✓ Linked: ${driver.name.padEnd(30)} | Phone: ${driver.phone}`);
      } else {
        notFoundCount++;
        console.log(`✗ No user: ${driver.name.padEnd(30)} | Phone: ${driver.phone}`);
      }
    }

    console.log('─'.repeat(80));
    console.log('');
    console.log(`Successfully linked: ${linkedCount}`);
    console.log(`No matching user found: ${notFoundCount}`);

    await mongoose.disconnect();
    console.log('✓ Disconnected from MongoDB');
    process.exit(0);
  } catch (error) {
    console.error('✗ Error:', error);
    process.exit(1);
  }
}

// Run the appropriate function based on command line argument
const mode = process.argv[2];

if (mode === '--phone') {
  linkDriversByPhone();
} else {
  linkDriversToUsers();
}
