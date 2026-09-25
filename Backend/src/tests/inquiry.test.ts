import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import { createServer, Server as HttpServer } from 'http';
import { io as Client, Socket as ClientSocket } from 'socket.io-client';
import jwt from 'jsonwebtoken';

import { createApp } from '../app.js';
import { initSocketServer } from '../sockets/socket.js';
import { User } from '../modules/users/user.model.js';
import { Room } from '../modules/rooms/room.model.js';
import { Inquiry } from '../modules/inquiries/inquiry.model.js';
import { env } from '../config/env.js';
import bcryptjs from 'bcryptjs';

const MONGODB_TEST_URI = process.env['MONGODB_TEST_URI'] ?? null;
const DB_AVAILABLE = MONGODB_TEST_URI !== null;

describe('Room Inquiry Feature (Phase 1)', () => {
  const app = createApp();
  let httpServer: HttpServer;
  let io: any;
  let port: number;

  let ownerToken: string;
  let seeker1Token: string;
  let seeker2Token: string;

  let ownerId: string;
  let _owner2Id: string;
  let owner2Token: string;
  let seeker1Id: string;
  let _seeker2Id: string;

  let roomId: string;
  let room2Id: string;
  let deletedRoomId: string;

  beforeAll(async () => {
    if (!DB_AVAILABLE) {
      console.warn('Skipping inquiry tests: MONGODB_TEST_URI is not set');
      return;
    }

    await mongoose.connect(MONGODB_TEST_URI as string);
    await mongoose.connection.dropDatabase();

    httpServer = createServer(app);
    io = initSocketServer(httpServer);

    await new Promise<void>((resolve) => {
      httpServer.listen(() => {
        port = (httpServer.address() as any).port;
        resolve();
      });
    });

    const salt = await bcryptjs.genSalt(10);
    const passwordHash = await bcryptjs.hash('password123', salt);

    // Create users
    const owner = await User.create({ name: 'Owner One', email: 'owner-inq@test.com', passwordHash, role: 'owner' });
    const owner2 = await User.create({ name: 'Owner Two', email: 'owner2-inq@test.com', passwordHash, role: 'owner' });
    const seeker1 = await User.create({ name: 'Seeker One', email: 'seeker1-inq@test.com', passwordHash, role: 'seeker' });
    const seeker2 = await User.create({ name: 'Seeker Two', email: 'seeker2-inq@test.com', passwordHash, role: 'seeker' });

    ownerId = owner._id.toString();
    _owner2Id = owner2._id.toString();
    seeker1Id = seeker1._id.toString();
    _seeker2Id = seeker2._id.toString();

    // Login to get tokens
    const login = async (email: string) => {
      const res = await request(httpServer).post('/api/v1/auth/login').send({ email, password: 'password123' });
      return res.body.data.accessToken;
    };

    ownerToken = await login('owner-inq@test.com');
    owner2Token = await login('owner2-inq@test.com');
    seeker1Token = await login('seeker1-inq@test.com');
    seeker2Token = await login('seeker2-inq@test.com');

    // Create rooms
    const room = await Room.create({
      ownerId: owner._id,
      title: 'Room For Inquiry Tests',
      description: 'A room for testing the inquiry feature',
      rent: 5000,
      location: { country: 'IN', state: 'DL', city: 'Delhi', area: 'Central' },
      roomType: 'Single',
      contactNumber: '1234567890',
    });
    roomId = room._id.toString();

    const room2 = await Room.create({
      ownerId: owner._id,
      title: 'Another Room for Inquiries',
      description: 'A second room for testing different-room scenario',
      rent: 8000,
      location: { country: 'IN', state: 'MH', city: 'Mumbai', area: 'Andheri' },
      roomType: 'Double',
      contactNumber: '9876543210',
    });
    room2Id = room2._id.toString();

    const deletedRoom = await Room.create({
      ownerId: owner._id,
      title: 'Deleted Room for Inquiry',
      description: 'This room is deleted and should not receive inquiries',
      rent: 3000,
      location: { country: 'IN', state: 'KA', city: 'Bangalore', area: 'HSR' },
      roomType: 'PG',
      contactNumber: '5555555555',
      isDeleted: true,
      deletedAt: new Date(),
    });
    deletedRoomId = deletedRoom._id.toString();
  });

  afterAll(async () => {
    if (io) io.close();
    if (httpServer) {
      await new Promise<void>((resolve) => {
        httpServer.close(() => resolve());
      });
    }
    if (DB_AVAILABLE) await mongoose.disconnect();
  });

  beforeEach(async () => {
    if (!DB_AVAILABLE) return;
    await Inquiry.deleteMany({});
  });

  // ─── 1. Guest cannot create inquiry ────────────────────────────────────────
  it('1. Guest cannot create inquiry', async () => {
    if (!DB_AVAILABLE) return;
    const res = await request(httpServer)
      .post(`/api/v1/rooms/${roomId}/inquiries`)
      .send({ message: 'I am interested' });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  // ─── 2. Seeker can create inquiry ──────────────────────────────────────────
  it('2. Seeker can create inquiry', async () => {
    if (!DB_AVAILABLE) return;
    const res = await request(httpServer)
      .post(`/api/v1/rooms/${roomId}/inquiries`)
      .set('Authorization', `Bearer ${seeker1Token}`)
      .send({ fromLocation: 'Delhi', purpose: 'Student', message: 'I am interested in this room' });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('Pending');
    expect(res.body.data.roomId).toBe(roomId);
    expect(res.body.data.seekerId).toBe(seeker1Id);
    expect(res.body.data.fromLocation).toBe('Delhi');
    expect(res.body.data.purpose).toBe('Student');
  });

  // ─── 3. Invalid roomId returns 400 ────────────────────────────────────────
  it('3. Invalid roomId returns 400', async () => {
    if (!DB_AVAILABLE) return;
    const res = await request(httpServer)
      .post('/api/v1/rooms/invalid-id-123/inquiries')
      .set('Authorization', `Bearer ${seeker1Token}`)
      .send({});

    expect(res.status).toBe(400);
  });

  // ─── 4. Nonexistent room returns 404 ──────────────────────────────────────
  it('4. Nonexistent room returns 404', async () => {
    if (!DB_AVAILABLE) return;
    const fakeId = new mongoose.Types.ObjectId().toString();
    const res = await request(httpServer)
      .post(`/api/v1/rooms/${fakeId}/inquiries`)
      .set('Authorization', `Bearer ${seeker1Token}`)
      .send({});

    expect(res.status).toBe(404);
  });

  // ─── 5. Deleted room cannot receive inquiry ───────────────────────────────
  it('5. Deleted room cannot receive inquiry', async () => {
    if (!DB_AVAILABLE) return;
    const res = await request(httpServer)
      .post(`/api/v1/rooms/${deletedRoomId}/inquiries`)
      .set('Authorization', `Bearer ${seeker1Token}`)
      .send({});

    expect(res.status).toBe(404);
  });

  // ─── 6. Owner cannot create inquiry for own room ──────────────────────────
  it('6. Owner cannot create inquiry for own room', async () => {
    if (!DB_AVAILABLE) return;
    // The owner role is blocked by requireRole('seeker') middleware
    const res = await request(httpServer)
      .post(`/api/v1/rooms/${roomId}/inquiries`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({});

    expect(res.status).toBe(403);
  });

  // ─── 7. Duplicate active inquiry returns 409 ──────────────────────────────
  it('7. Duplicate active inquiry returns 409', async () => {
    if (!DB_AVAILABLE) return;
    // First inquiry
    await request(httpServer)
      .post(`/api/v1/rooms/${roomId}/inquiries`)
      .set('Authorization', `Bearer ${seeker1Token}`)
      .send({ fromLocation: 'Mumbai', purpose: 'Working Professional', message: 'First interest' });

    // Duplicate
    const res = await request(httpServer)
      .post(`/api/v1/rooms/${roomId}/inquiries`)
      .set('Authorization', `Bearer ${seeker1Token}`)
      .send({ fromLocation: 'Delhi', purpose: 'Student', message: 'Duplicate interest' });

    expect(res.status).toBe(409);
  });

  // ─── 8. Same seeker can inquire about different rooms ─────────────────────
  it('8. Same seeker can inquire about different rooms', async () => {
    if (!DB_AVAILABLE) return;
    const payload = { fromLocation: 'Pune', purpose: 'Business' };

    const res1 = await request(httpServer)
      .post(`/api/v1/rooms/${roomId}/inquiries`)
      .set('Authorization', `Bearer ${seeker1Token}`)
      .send(payload);

    const res2 = await request(httpServer)
      .post(`/api/v1/rooms/${room2Id}/inquiries`)
      .set('Authorization', `Bearer ${seeker1Token}`)
      .send(payload);

    expect(res1.status).toBe(201);
    expect(res2.status).toBe(201);
  });

  // ─── 9. Owner can fetch received inquiries ────────────────────────────────
  it('9. Owner can fetch received inquiries', async () => {
    if (!DB_AVAILABLE) return;
    const payload = { fromLocation: 'Hyderabad', purpose: 'Family / Relocation' };

    // Seeker1 creates inquiry
    await request(httpServer)
      .post(`/api/v1/rooms/${roomId}/inquiries`)
      .set('Authorization', `Bearer ${seeker1Token}`)
      .send(payload);

    // Seeker2 creates inquiry for the same room
    await request(httpServer)
      .post(`/api/v1/rooms/${roomId}/inquiries`)
      .set('Authorization', `Bearer ${seeker2Token}`)
      .send(payload);

    const res = await request(httpServer)
      .get('/api/v1/inquiries/received')
      .set('Authorization', `Bearer ${ownerToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.length).toBe(2);
    expect(res.body.pagination.total).toBe(2);
  });

  // ─── 10. Owner cannot access another owner's inquiries ────────────────────
  it('10. Owner cannot access another owners inquiries', async () => {
    if (!DB_AVAILABLE) return;
    // Seeker creates inquiry for owner1's room
    await request(httpServer)
      .post(`/api/v1/rooms/${roomId}/inquiries`)
      .set('Authorization', `Bearer ${seeker1Token}`)
      .send({ fromLocation: 'Bengaluru', purpose: 'Other' });

    // Owner2 tries to see them — should see empty (not owner1's data)
    const res = await request(httpServer)
      .get('/api/v1/inquiries/received')
      .set('Authorization', `Bearer ${owner2Token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(0);
  });

  // ─── 11. Seeker can fetch own inquiries ───────────────────────────────────
  it('11. Seeker can fetch own inquiries', async () => {
    if (!DB_AVAILABLE) return;
    await request(httpServer)
      .post(`/api/v1/rooms/${roomId}/inquiries`)
      .set('Authorization', `Bearer ${seeker1Token}`)
      .send({ fromLocation: 'Kolkata', purpose: 'Student' });

    const res = await request(httpServer)
      .get('/api/v1/inquiries/my')
      .set('Authorization', `Bearer ${seeker1Token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.length).toBe(1);
  });

  // ─── 12. Seeker cannot fetch another user's inquiries ─────────────────────
  it('12. Seeker cannot fetch another users inquiries', async () => {
    if (!DB_AVAILABLE) return;
    await request(httpServer)
      .post(`/api/v1/rooms/${roomId}/inquiries`)
      .set('Authorization', `Bearer ${seeker1Token}`)
      .send({ fromLocation: 'Chennai', purpose: 'Working Professional' });

    // Seeker2 fetches their own — should only see their own (empty here)
    const res = await request(httpServer)
      .get('/api/v1/inquiries/my')
      .set('Authorization', `Bearer ${seeker2Token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(0);
  });

  // ─── 13. Owner can accept pending inquiry ─────────────────────────────────
  it('13. Owner can accept pending inquiry', async () => {
    if (!DB_AVAILABLE) return;
    const createRes = await request(httpServer)
      .post(`/api/v1/rooms/${roomId}/inquiries`)
      .set('Authorization', `Bearer ${seeker1Token}`)
      .send({ fromLocation: 'Jaipur', purpose: 'Other' });

    const inquiryId = createRes.body.data.id;

    const res = await request(httpServer)
      .patch(`/api/v1/inquiries/${inquiryId}/accept`)
      .set('Authorization', `Bearer ${ownerToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('Accepted');
  });

  // ─── 14. Owner can reject pending inquiry ─────────────────────────────────
  it('14. Owner can reject pending inquiry', async () => {
    if (!DB_AVAILABLE) return;
    const createRes = await request(httpServer)
      .post(`/api/v1/rooms/${roomId}/inquiries`)
      .set('Authorization', `Bearer ${seeker1Token}`)
      .send({ fromLocation: 'Ahmedabad', purpose: 'Business' });

    const inquiryId = createRes.body.data.id;

    const res = await request(httpServer)
      .patch(`/api/v1/inquiries/${inquiryId}/reject`)
      .set('Authorization', `Bearer ${ownerToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('Rejected');
  });

  // ─── 15. Non-owner cannot accept/reject ───────────────────────────────────
  it('15. Non-owner cannot accept or reject', async () => {
    if (!DB_AVAILABLE) return;
    const createRes = await request(httpServer)
      .post(`/api/v1/rooms/${roomId}/inquiries`)
      .set('Authorization', `Bearer ${seeker1Token}`)
      .send({ fromLocation: 'Indore', purpose: 'Student' });

    const inquiryId = createRes.body.data.id;

    // Owner2 tries to accept (not the owner of the room)
    const res = await request(httpServer)
      .patch(`/api/v1/inquiries/${inquiryId}/accept`)
      .set('Authorization', `Bearer ${owner2Token}`);

    expect(res.status).toBe(404); // returns 404 to avoid leaking existence
  });

  // ─── 16. Invalid status transition is rejected ────────────────────────────
  it('16. Invalid status transition is rejected', async () => {
    if (!DB_AVAILABLE) return;
    const createRes = await request(httpServer)
      .post(`/api/v1/rooms/${roomId}/inquiries`)
      .set('Authorization', `Bearer ${seeker1Token}`)
      .send({ fromLocation: 'Lucknow', purpose: 'Other' });

    const inquiryId = createRes.body.data.id;

    // Accept the inquiry first
    await request(httpServer)
      .patch(`/api/v1/inquiries/${inquiryId}/accept`)
      .set('Authorization', `Bearer ${ownerToken}`);

    // Try to reject an already accepted inquiry
    const res = await request(httpServer)
      .patch(`/api/v1/inquiries/${inquiryId}/reject`)
      .set('Authorization', `Bearer ${ownerToken}`);

    expect(res.status).toBe(409);
  });

  // ─── 17. Deleted inquiries are excluded ───────────────────────────────────
  it('17. Deleted inquiries are excluded from feeds', async () => {
    if (!DB_AVAILABLE) return;
    // Create an inquiry and then soft-delete it directly in the DB
    const createRes = await request(httpServer)
      .post(`/api/v1/rooms/${roomId}/inquiries`)
      .set('Authorization', `Bearer ${seeker1Token}`)
      .send({ fromLocation: 'Varanasi', purpose: 'Family / Relocation' });

    await Inquiry.findByIdAndUpdate(createRes.body.data.id, { isDeleted: true });

    // Owner feed
    const ownerRes = await request(httpServer)
      .get('/api/v1/inquiries/received')
      .set('Authorization', `Bearer ${ownerToken}`);

    expect(ownerRes.body.data.length).toBe(0);

    // Seeker feed
    const seekerRes = await request(httpServer)
      .get('/api/v1/inquiries/my')
      .set('Authorization', `Bearer ${seeker1Token}`);

    expect(seekerRes.body.data.length).toBe(0);
  });

  // ─── 18. Socket notification emitted to correct owner ─────────────────────
  it('18. Socket notification is emitted to the correct owner', async () => {
    if (!DB_AVAILABLE) return;

    const ownerSocketToken = jwt.sign(
      { sub: ownerId, role: 'owner' },
      env.JWT_ACCESS_SECRET,
      { expiresIn: '1m' },
    );

    const ownerClient: ClientSocket = Client(`http://localhost:${port}`, {
      auth: { token: ownerSocketToken },
      autoConnect: false,
    });

    // Wait for connection
    await new Promise<void>((resolve) => {
      ownerClient.on('connect', () => resolve());
      ownerClient.connect();
    });

    // Set up listener for the event
    const eventPromise = new Promise<any>((resolve) => {
      ownerClient.on('room:interest:new', (data: any) => {
        resolve(data);
      });
    });

    // Create inquiry via API
    await request(httpServer)
      .post(`/api/v1/rooms/${roomId}/inquiries`)
      .set('Authorization', `Bearer ${seeker1Token}`)
      .send({ fromLocation: 'Nagpur', purpose: 'Student', message: 'Interested!' });

    // Wait for the socket event
    const eventData = await eventPromise;
    expect(eventData.roomId).toBe(roomId);
    expect(eventData.seekerId).toBe(seeker1Id);
    expect(eventData.seekerName).toBe('Seeker One');
    expect(eventData.status).toBe('Pending');
    expect(eventData.roomTitle).toBe('Room For Inquiry Tests');

    // No sensitive data
    expect(eventData.password).toBeUndefined();
    expect(eventData.accessToken).toBeUndefined();
    expect(eventData.refreshToken).toBeUndefined();

    ownerClient.close();
  });

  // ─── 19. Owner response notification emitted to correct seeker ────────────
  it('19. Owner response notification is emitted to the correct seeker', async () => {
    if (!DB_AVAILABLE) return;

    // Create inquiry first
    const createRes = await request(httpServer)
      .post(`/api/v1/rooms/${roomId}/inquiries`)
      .set('Authorization', `Bearer ${seeker1Token}`)
      .send({ fromLocation: 'Surat', purpose: 'Working Professional' });

    const inquiryId = createRes.body.data.id;

    // Connect seeker1 via socket
    const seekerSocketToken = jwt.sign(
      { sub: seeker1Id, role: 'seeker' },
      env.JWT_ACCESS_SECRET,
      { expiresIn: '1m' },
    );

    const seekerClient: ClientSocket = Client(`http://localhost:${port}`, {
      auth: { token: seekerSocketToken },
      autoConnect: false,
    });

    await new Promise<void>((resolve) => {
      seekerClient.on('connect', () => resolve());
      seekerClient.connect();
    });

    // Listen for accepted event
    const eventPromise = new Promise<any>((resolve) => {
      seekerClient.on('room:interest:accepted', (data: any) => {
        resolve(data);
      });
    });

    // Owner accepts
    await request(httpServer)
      .patch(`/api/v1/inquiries/${inquiryId}/accept`)
      .set('Authorization', `Bearer ${ownerToken}`);

    const eventData = await eventPromise;
    expect(eventData.inquiryId).toBe(inquiryId);
    expect(eventData.status).toBe('Accepted');
    expect(eventData.roomTitle).toBe('Room For Inquiry Tests');

    seekerClient.close();
  });

  // ─── Inquiry without message (optional field) ─────────────────────────────
  it('should allow creating inquiry without a message', async () => {
    if (!DB_AVAILABLE) return;
    const res = await request(httpServer)
      .post(`/api/v1/rooms/${roomId}/inquiries`)
      .set('Authorization', `Bearer ${seeker1Token}`)
      .send({ fromLocation: 'Mysore', purpose: 'Student' });

    expect(res.status).toBe(201);
    expect(res.body.data.message).toBeUndefined();
  });

  // ─── Missing fromLocation returns 400 ─────────────────────────────────────
  it('should return 400 when fromLocation is missing', async () => {
    if (!DB_AVAILABLE) return;
    const res = await request(httpServer)
      .post(`/api/v1/rooms/${roomId}/inquiries`)
      .set('Authorization', `Bearer ${seeker1Token}`)
      .send({ purpose: 'Student' });

    expect(res.status).toBe(400);
  });

  // ─── Missing purpose returns 400 ──────────────────────────────────────────
  it('should return 400 when purpose is missing', async () => {
    if (!DB_AVAILABLE) return;
    const res = await request(httpServer)
      .post(`/api/v1/rooms/${roomId}/inquiries`)
      .set('Authorization', `Bearer ${seeker1Token}`)
      .send({ fromLocation: 'Delhi' });

    expect(res.status).toBe(400);
  });

  // ─── Invalid purpose value returns 400 ────────────────────────────────────
  it('should return 400 when purpose is an invalid value', async () => {
    if (!DB_AVAILABLE) return;
    const res = await request(httpServer)
      .post(`/api/v1/rooms/${roomId}/inquiries`)
      .set('Authorization', `Bearer ${seeker1Token}`)
      .send({ fromLocation: 'Delhi', purpose: 'Alien' });

    expect(res.status).toBe(400);
  });

  // ─── Empty trimmed message rejected ───────────────────────────────────────
  it('should reject empty message after trimming', async () => {
    if (!DB_AVAILABLE) return;
    const res = await request(httpServer)
      .post(`/api/v1/rooms/${roomId}/inquiries`)
      .set('Authorization', `Bearer ${seeker1Token}`)
      .send({ fromLocation: 'Delhi', purpose: 'Student', message: '   ' });

    expect(res.status).toBe(400);
  });

  // ─── Seeker cannot accept/reject (role guard) ─────────────────────────────
  it('seeker cannot accept inquiries (role guard)', async () => {
    if (!DB_AVAILABLE) return;
    const createRes = await request(httpServer)
      .post(`/api/v1/rooms/${roomId}/inquiries`)
      .set('Authorization', `Bearer ${seeker1Token}`)
      .send({ fromLocation: 'Chandigarh', purpose: 'Other' });

    const inquiryId = createRes.body.data.id;

    const res = await request(httpServer)
      .patch(`/api/v1/inquiries/${inquiryId}/accept`)
      .set('Authorization', `Bearer ${seeker2Token}`);

    expect(res.status).toBe(403);
  });
});
