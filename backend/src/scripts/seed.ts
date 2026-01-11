import mongoose from 'mongoose';
import { User } from '../models/User.model';
import { config } from '../config/env';
import { UserRole } from '../types/auth.types';

const seedUsers = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(config.mongoUri);
    console.log('✅ Connected to MongoDB');

    // Clear existing users (optional - remove in production)
    await User.deleteMany({});
    console.log('🗑️  Cleared existing users');

    // Create test dispatcher
    const dispatcher = await User.create({
      name: 'Test Dispatcher',
      email: 'dispatcher@tms.com',
      password: '123456',
      role: UserRole.DISPATCHER,
      phone: '9876543210',
      status: 'active',
    });

    console.log('✅ Test Dispatcher created:');
    console.log('   Email: dispatcher@tms.com');
    console.log('   Password: 123456');
    console.log('   ID:', dispatcher._id);

    // Create test owner
    const owner = await User.create({
      name: 'Test Owner',
      email: 'owner@tms.com',
      password: '123456',
      role: UserRole.OWNER,
      phone: '9876543211',
      status: 'active',
    });

    console.log('✅ Test Owner created:');
    console.log('   Email: owner@tms.com');
    console.log('   Password: 123456');
    console.log('   ID:', owner._id);

    process.exit(0);
  } catch (error) {
    console.error('❌ Seed failed:', error);
    process.exit(1);
  }
};

seedUsers();