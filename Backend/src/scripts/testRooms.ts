import 'dotenv/config';
import { connectDB, disconnectDB } from '../config/db.js';
import { register } from '../modules/auth/auth.service.js';
import { User } from '../modules/users/user.model.js';
import { Room } from '../modules/rooms/room.model.js';
import {
  createRoom,
  getPublicRooms,
  getRoomById,
  updateRoom,
  softDeleteRoom,
  updateAvailability,
} from '../modules/rooms/room.service.js';
import { AppError } from '../utils/AppError.js';

async function runTests() {
  await connectDB();

  console.log('\n--- Cleaning up previous test data ---');
  await User.deleteMany({ email: { $in: ['owner1@test.com', 'owner2@test.com', 'seeker@test.com'] } });
  await Room.deleteMany({}); // Delete all rooms for testing

  try {
    console.log('\n--- Setting up users ---');
    const owner1 = await register({ name: 'Owner 1', email: 'owner1@test.com', password: 'password', role: 'owner' });
    const owner2 = await register({ name: 'Owner 2', email: 'owner2@test.com', password: 'password', role: 'owner' });
    
    // Create a room as owner1
    console.log('\n1. Testing Create Room (Owner 1)...');
    const room1 = await createRoom({
      title: 'Beautiful Single Room',
      description: 'A very nice and clean single room with a great view.',
      rent: 5000,
      location: { country: 'India', state: 'Uttarakhand', city: 'Nainital', area: 'Mallital' },
      roomType: 'Single',
      contactNumber: '9876543210',
    }, owner1.id);
    console.log('✅ Room 1 created successfully:', room1.title);

    // Create a room as owner2
    const room2 = await createRoom({
      title: 'Spacious Double Room',
      description: 'Large double room suitable for sharing.',
      rent: 8000,
      location: { country: 'India', state: 'Uttarakhand', city: 'Nainital', area: 'Tallital' },
      roomType: 'Double',
      contactNumber: '1234567890',
    }, owner2.id);

    // Get public rooms
    console.log('\n2. Testing Get Public Rooms...');
    const publicRooms = await getPublicRooms({ page: 1, limit: 10 });
    if (publicRooms.total === 2) {
      console.log('✅ Public rooms fetched successfully. Total:', publicRooms.total);
    } else {
      throw new Error(`Expected 2 public rooms, got ${publicRooms.total}`);
    }

    // Update room (Success)
    console.log('\n3. Testing Update Room (Owner 1 updates Room 1)...');
    const updatedRoom1 = await updateRoom(room1.id, owner1.id, { rent: 5500 });
    if (updatedRoom1.rent === 5500) {
      console.log('✅ Room 1 updated successfully. New rent:', updatedRoom1.rent);
    } else {
      throw new Error('Room 1 rent update failed');
    }

    // Update room (Failure - Ownership mismatch)
    console.log('\n4. Testing Update Room (Owner 1 attempts to update Room 2)...');
    try {
      await updateRoom(room2.id, owner1.id, { rent: 9000 });
      throw new Error('Should have failed ownership check');
    } catch (error) {
      if (error instanceof AppError && error.statusCode === 404) {
        console.log('✅ Correctly blocked with 404 Not Found (ownership mismatch)');
      } else {
        throw error;
      }
    }

    // Update availability
    console.log('\n5. Testing Update Availability...');
    const availRoom = await updateAvailability(room1.id, owner1.id, 'Booked');
    if (availRoom.availability === 'Booked') {
      console.log('✅ Availability updated to Booked');
    } else {
      throw new Error('Availability update failed');
    }

    // Soft delete
    console.log('\n6. Testing Soft Delete Room...');
    await softDeleteRoom(room1.id, owner1.id);
    const deletedRoom = await Room.findById(room1.id);
    if (deletedRoom && deletedRoom.isDeleted === true) {
      console.log('✅ Room 1 soft deleted successfully (isDeleted = true in DB)');
    } else {
      throw new Error('Soft delete failed');
    }

    // Verify soft deleted room doesn't show in public list
    const publicRoomsAfterDelete = await getPublicRooms({ page: 1, limit: 10 });
    if (publicRoomsAfterDelete.total === 1) {
      console.log('✅ Public rooms count is correct after deletion:', publicRoomsAfterDelete.total);
    } else {
      throw new Error('Deleted room appeared in public list');
    }
    
    // Verify getRoomById throws 404 for deleted room
    console.log('\n7. Testing Get Room By Id (Deleted Room)...');
    try {
      await getRoomById(room1.id);
      throw new Error('Should have failed retrieving deleted room');
    } catch (error) {
      if (error instanceof AppError && error.statusCode === 404) {
        console.log('✅ Correctly blocked retrieving deleted room with 404 Not Found');
      } else {
        throw error;
      }
    }

    console.log('\n🎉 All Room tests passed successfully!');

  } catch (error) {
    if (error instanceof AppError) {
      console.error('❌ Test failed with AppError:', error.message);
    } else {
      console.error('❌ Test failed with unexpected error:', error);
    }
  } finally {
    // Clean up
    console.log('\n--- Cleaning up... ---');
    await User.deleteMany({ email: { $in: ['owner1@test.com', 'owner2@test.com', 'seeker@test.com'] } });
    await Room.deleteMany({});
    await disconnectDB();
  }
}

runTests();
