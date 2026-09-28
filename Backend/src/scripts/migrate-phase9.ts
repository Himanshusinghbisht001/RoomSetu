import mongoose from 'mongoose';
import { env } from '../config/env.js';
import { User } from '../modules/users/user.model.js';

async function run() {
  console.log('Connecting to database...');
  await mongoose.connect(env.MONGODB_URI);
  
  console.log('Updating legacy users to emailVerified: true...');
  const result = await User.updateMany(
    { emailVerified: { $exists: false } },
    { $set: { emailVerified: true } }
  );
  
  console.log(`Matched: ${result.matchedCount}, Modified: ${result.modifiedCount}`);
  
  await mongoose.disconnect();
  console.log('Done.');
}

run().catch(console.error);
