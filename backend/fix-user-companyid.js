const mongoose = require('mongoose');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI;

async function fixUserCompanyId() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    const User = mongoose.model('User', new mongoose.Schema({}, { strict: false }));

    // Find owner
    const owner = await User.findOne({ role: 'owner' });
    if (!owner) {
      console.log('❌ No owner found');
      return;
    }

    const companyId = owner._id.toString();
    console.log(`🏢 Company ID (owner's _id): ${companyId}\n`);

    // Update all users to have the same companyId
    const result = await User.updateMany(
      {},
      { $set: { companyId: companyId } }
    );

    console.log(`✅ Updated ${result.modifiedCount} users with companyId\n`);

    // Verify
    const users = await User.find({});
    console.log('👥 Updated Users:');
    users.forEach(u => {
      console.log(`  - ${u.name} (${u.role})`);
      console.log(`    companyId: ${u.companyId}`);
    });

    console.log('\n✅ All users now have companyId set!');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.connection.close();
    console.log('\n👋 Done!');
    process.exit(0);
  }
}

fixUserCompanyId();
