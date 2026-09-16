import 'dotenv/config';
import mongoose from 'mongoose';
import { User } from '../modules/users/user.model.js';
import { Room } from '../modules/rooms/room.model.js';

const MONGODB_URI = process.env['MONGODB_URI'];

async function check() {
  try {
    await mongoose.connect(MONGODB_URI!);
    const totalRooms = await Room.countDocuments();
    const nonDeletedRooms = await Room.countDocuments({ isDeleted: false });
    const demoOwner = await User.findOne({ email: 'demo_owner@roomsetu.in' });
    const locationDistribution = await Room.aggregate([
      { $group: { _id: '$location.area', count: { $sum: 1 } } }
    ]);

    console.log('--- DATABASE STATUS ---');
    console.log(`Room count: ${totalRooms}`);
    console.log(`Non-deleted room count: ${nonDeletedRooms}`);
    console.log(`Demo owner exists: ${!!demoOwner}`);
    console.log('Location distribution:');
    console.log(JSON.stringify(locationDistribution, null, 2));

    await mongoose.disconnect();
  } catch (error) {
    console.error('Connection failed:', error);
  }
}
check();
