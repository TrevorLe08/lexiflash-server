import bcrypt from 'bcryptjs';
import { connectDatabase, disconnectDatabase } from '../db/mongo.js';
import { UserModel } from '../models/User.model.js';

// You may need it :D

async function main() {
  console.log('🔄 Connecting to database...');
  const conn = await connectDatabase();
  if (!conn) {
    console.error('❌ Failed to connect to MongoDB');
    process.exit(1);
  }

  const plainPassword = 'Password123!';
  const saltRounds = 10;
  const newHash = bcrypt.hashSync(plainPassword, saltRounds);

  console.log(`🔐 Generated bcrypt hash for '${plainPassword}'`);

  const users = await UserModel.find({});
  console.log(`📋 Found ${users.length} users in database:`);
  users.forEach((u) => {
    console.log(`  - ID: ${u.id}, Username: ${u.username}, Email: ${u.email}, Role: ${u.role}`);
  });

  const result = await UserModel.updateMany({}, { $set: { passwordHash: newHash } });
  console.log(`\n✅ Updated ${result.modifiedCount} / ${users.length} users with passwordHash for '${plainPassword}'!`);

  // Verify by re-fetching one user and checking bcrypt
  const sample = await UserModel.findOne({});
  if (sample) {
    const isMatch = bcrypt.compareSync(plainPassword, sample.passwordHash);
    console.log(`🔍 Verification check on user '${sample.username}': bcrypt.compareSync matches = ${isMatch}`);
  }

  await disconnectDatabase();
  console.log('🏁 Done.');
}

main().catch((err) => {
  console.error('❌ Error resetting passwords:', err);
  process.exit(1);
});
