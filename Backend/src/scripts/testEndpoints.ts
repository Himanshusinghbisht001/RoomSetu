import 'dotenv/config';
import request from 'supertest';
import { connectDB, disconnectDB } from '../config/db.js';
import { User } from '../modules/users/user.model.js';
import { Room } from '../modules/rooms/room.model.js';
import { register, login } from '../modules/auth/auth.service.js';
import { createApp } from '../app.js';

const app = createApp();

async function runTests() {
  await connectDB();

  console.log('\n--- Cleaning up previous test data ---');
  await User.deleteMany({ email: { $in: ['owner_a@test.com', 'owner_b@test.com', 'seeker_a@test.com'] } });
  await Room.deleteMany({}); 

  try {
    console.log('\n--- Setting up users ---');
    await register({ name: 'Owner A', email: 'owner_a@test.com', password: 'password', role: 'owner' });
    await register({ name: 'Owner B', email: 'owner_b@test.com', password: 'password', role: 'owner' });
    await register({ name: 'Seeker A', email: 'seeker_a@test.com', password: 'password', role: 'seeker' });

    const ownerAToken = (await login({ email: 'owner_a@test.com', password: 'password' })).accessToken;
    const ownerBToken = (await login({ email: 'owner_b@test.com', password: 'password' })).accessToken;
    const seekerAToken = (await login({ email: 'seeker_a@test.com', password: 'password' })).accessToken;

    const roomPayload = {
      title: 'Beautiful Single Room',
      description: 'A very nice and clean single room with a great view.',
      rent: 5000,
      location: { country: 'India', state: 'Uttarakhand', city: 'Nainital', area: 'Mallital' },
      roomType: 'Single',
      contactNumber: '9876543210',
    };

    // 1. Unauthenticated user: POST /api/v1/rooms
    console.log('\n1. Unauthenticated user: POST /api/v1/rooms');
    const res1 = await request(app)
      .post('/api/v1/rooms')
      .send(roomPayload);
    console.log(`Expected: 401, Got: ${res1.status} -> ${res1.status === 401 ? '✅ PASS' : '❌ FAIL'}`);

    // 2. Seeker user: POST /api/v1/rooms
    console.log('\n2. Seeker user: POST /api/v1/rooms');
    const res2 = await request(app)
      .post('/api/v1/rooms')
      .set('Authorization', `Bearer ${seekerAToken}`)
      .send(roomPayload);
    console.log(`Expected: 403, Got: ${res2.status} -> ${res2.status === 403 ? '✅ PASS' : '❌ FAIL'}`);

    // Create a room as Owner A for subsequent tests
    const createRes = await request(app)
      .post('/api/v1/rooms')
      .set('Authorization', `Bearer ${ownerAToken}`)
      .send(roomPayload);
    
    if (createRes.status !== 201) throw new Error('Failed to create room for testing');
    const roomA = createRes.body.data;

    // 3. Owner A: GET /api/v1/rooms/my
    console.log('\n3. Owner A: GET /api/v1/rooms/my');
    const res3 = await request(app)
      .get('/api/v1/rooms/my')
      .set('Authorization', `Bearer ${ownerAToken}`);
    const myRooms = res3.body.data;
    const ownerAId = (await User.findOne({ email: 'owner_a@test.com' }))!.id;
    const allBelongToOwnerA = myRooms.every((r: any) => r.ownerId === ownerAId);
    console.log(`Expected: only rooms belonging to authenticated owner, Got: ${allBelongToOwnerA ? '✅ PASS' : '❌ FAIL'}`);

    // 4. Another owner: PATCH /api/v1/rooms/:id
    console.log('\n4. Another owner (Owner B): PATCH /api/v1/rooms/:id');
    const res4 = await request(app)
      .patch(`/api/v1/rooms/${roomA.id}`)
      .set('Authorization', `Bearer ${ownerBToken}`)
      .send({ rent: 6000 });
    console.log(`Expected: 404, Got: ${res4.status} -> ${res4.status === 404 ? '✅ PASS' : '❌ FAIL'}`);

    // 5. Another owner: DELETE /api/v1/rooms/:id
    console.log('\n5. Another owner (Owner B): DELETE /api/v1/rooms/:id');
    const res5 = await request(app)
      .delete(`/api/v1/rooms/${roomA.id}`)
      .set('Authorization', `Bearer ${ownerBToken}`);
    console.log(`Expected: 404, Got: ${res5.status} -> ${res5.status === 404 ? '✅ PASS' : '❌ FAIL'}`);

    // 6. Another owner: PATCH /api/v1/rooms/:id/availability
    console.log('\n6. Another owner (Owner B): PATCH /api/v1/rooms/:id/availability');
    const res6 = await request(app)
      .patch(`/api/v1/rooms/${roomA.id}/availability`)
      .set('Authorization', `Bearer ${ownerBToken}`)
      .send({ availability: 'Booked' });
    console.log(`Expected: 404, Got: ${res6.status} -> ${res6.status === 404 ? '✅ PASS' : '❌ FAIL'}`);

    // Delete the room as Owner A
    await request(app)
      .delete(`/api/v1/rooms/${roomA.id}`)
      .set('Authorization', `Bearer ${ownerAToken}`);

    // 7. Deleted room: GET /api/v1/rooms/:id
    console.log('\n7. Deleted room: GET /api/v1/rooms/:id');
    const res7 = await request(app)
      .get(`/api/v1/rooms/${roomA.id}`);
    console.log(`Expected: 404, Got: ${res7.status} -> ${res7.status === 404 ? '✅ PASS' : '❌ FAIL'}`);

    // 8. Deleted room: GET /api/v1/rooms
    console.log('\n8. Deleted room: GET /api/v1/rooms');
    const res8 = await request(app)
      .get('/api/v1/rooms');
    const publicRooms = res8.body.data;
    const isRoomIncluded = publicRooms.some((r: any) => r.id === roomA.id);
    console.log(`Expected: deleted room is not included, Got: ${isRoomIncluded ? 'Included ❌ FAIL' : 'Not included ✅ PASS'}`);

  } catch (error) {
    console.error('Test script failed:', error);
  } finally {
    // Clean up
    console.log('\n--- Cleaning up... ---');
    await User.deleteMany({ email: { $in: ['owner_a@test.com', 'owner_b@test.com', 'seeker_a@test.com'] } });
    await Room.deleteMany({});
    await disconnectDB();
  }
}

runTests();
