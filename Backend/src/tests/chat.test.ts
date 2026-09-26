import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import { createServer, Server as HttpServer } from 'http';
import jwt from 'jsonwebtoken';

import { createApp } from '../app.js';
import { initSocketServer } from '../sockets/socket.js';
import { User } from '../modules/users/user.model.js';
import { Room } from '../modules/rooms/room.model.js';
import { Inquiry } from '../modules/inquiries/inquiry.model.js';
import { Message } from '../modules/chat/message.model.js';
import { env } from '../config/env.js';
import bcryptjs from 'bcryptjs';

const MONGODB_TEST_URI = process.env['MONGODB_TEST_URI'] ?? null;
const DB_AVAILABLE = MONGODB_TEST_URI !== null;

describe('Private Chat Feature', () => {
  const app = createApp();
  let httpServer: HttpServer;
  let _io: any;

  let ownerId: string;
  let ownerToken: string;
  let seekerId: string;
  let seekerToken: string;
  let unrelatedUserId: string;
  let unrelatedUserToken: string;

  let _roomId: string;
  let acceptedInquiryId: string;
  let pendingInquiryId: string;
  let rejectedInquiryId: string;
  let cancelledInquiryId: string;

  beforeAll(async () => {
    if (!DB_AVAILABLE) {
      console.warn('Skipping chat tests: MONGODB_TEST_URI is not set');
      return;
    }

    await mongoose.connect(MONGODB_TEST_URI as string);
    await mongoose.connection.dropDatabase();

    httpServer = createServer(app);
    _io = initSocketServer(httpServer);

    const salt = await bcryptjs.genSalt(10);
    const passwordHash = await bcryptjs.hash('password123', salt);

    // Create Owner
    const owner = await User.create({
      name: 'Owner User',
      email: 'owner@test.com',
      password: passwordHash,
      role: 'owner',
      phone: '1234567890',
      isPhoneVerified: true,
      authProvider: 'local',
    });
    ownerId = owner._id.toString();
    ownerToken = jwt.sign({ sub: ownerId, role: 'owner' }, env.JWT_ACCESS_SECRET, { expiresIn: '15m' });

    // Create Seeker
    const seeker = await User.create({
      name: 'Seeker User',
      email: 'seeker@test.com',
      password: passwordHash,
      role: 'seeker',
      phone: '1234567891',
      isPhoneVerified: true,
      authProvider: 'local',
    });
    seekerId = seeker._id.toString();
    seekerToken = jwt.sign({ sub: seekerId, role: 'seeker' }, env.JWT_ACCESS_SECRET, { expiresIn: '15m' });

    // Create Unrelated User
    const unrelatedUser = await User.create({
      name: 'Unrelated User',
      email: 'unrelated@test.com',
      password: passwordHash,
      role: 'seeker',
      phone: '1234567892',
      isPhoneVerified: true,
      authProvider: 'local',
    });
    unrelatedUserId = unrelatedUser._id.toString();
    unrelatedUserToken = jwt.sign({ sub: unrelatedUserId, role: 'seeker' }, env.JWT_ACCESS_SECRET, { expiresIn: '15m' });

    // Create Room
    const room = await Room.create({
      ownerId: owner._id,
      title: 'Chat Test Room',
      description: 'Room description',
      price: 1000,
      location: 'Test City',
      status: 'Available',
    });
    _roomId = room._id.toString();

    // Create Accepted Inquiry
    const acceptedInq = await Inquiry.create({
      roomId: room._id,
      roomOwnerId: owner._id,
      seekerId: seeker._id,
      fromLocation: 'Test Location',
      purpose: 'Student',
      status: 'Accepted',
    });
    acceptedInquiryId = acceptedInq._id.toString();

    // Create Pending Inquiry (different room to avoid unique constraint)
    const room2 = await Room.create({
      ownerId: owner._id,
      title: 'Chat Test Room 2',
      description: 'Room description',
      price: 1000,
      location: 'Test City',
      status: 'Available',
    });
    const pendingInq = await Inquiry.create({
      roomId: room2._id,
      roomOwnerId: owner._id,
      seekerId: seeker._id,
      fromLocation: 'Test Location',
      purpose: 'Student',
      status: 'Pending',
    });
    pendingInquiryId = pendingInq._id.toString();

    // Create Rejected Inquiry
    const room3 = await Room.create({
      ownerId: owner._id,
      title: 'Chat Test Room 3',
      description: 'Room description',
      price: 1000,
      location: 'Test City',
      status: 'Available',
    });
    const rejectedInq = await Inquiry.create({
      roomId: room3._id,
      roomOwnerId: owner._id,
      seekerId: seeker._id,
      fromLocation: 'Test Location',
      purpose: 'Student',
      status: 'Rejected',
    });
    rejectedInquiryId = rejectedInq._id.toString();

    // Create Cancelled Inquiry
    const room4 = await Room.create({
      ownerId: owner._id,
      title: 'Chat Test Room 4',
      description: 'Room description',
      price: 1000,
      location: 'Test City',
      status: 'Available',
    });
    const cancelledInq = await Inquiry.create({
      roomId: room4._id,
      roomOwnerId: owner._id,
      seekerId: seeker._id,
      fromLocation: 'Test Location',
      purpose: 'Student',
      status: 'Cancelled',
    });
    cancelledInquiryId = cancelledInq._id.toString();

  });

  afterAll(async () => {
    if (!DB_AVAILABLE) return;
    await mongoose.disconnect();
  });

  beforeEach(async () => {
    if (!DB_AVAILABLE) return;
    await Message.deleteMany({});
  });

  // 1. Accepted inquiry: Owner can send a message.
  // 2. Accepted inquiry: Seeker can send a message.
  it('Owner and Seeker can send messages for an accepted inquiry', async () => {
    if (!DB_AVAILABLE) return;

    // Owner sends message
    const res1 = await request(app)
      .post(`/api/v1/chat/${acceptedInquiryId}/messages`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ content: 'Hello from owner' });

    expect(res1.status).toBe(201);
    expect(res1.body.success).toBe(true);
    expect(res1.body.data.content).toBe('Hello from owner');
    expect(res1.body.data.senderId).toBe(ownerId);

    // Seeker sends message
    const res2 = await request(app)
      .post(`/api/v1/chat/${acceptedInquiryId}/messages`)
      .set('Authorization', `Bearer ${seekerToken}`)
      .send({ content: 'Hello from seeker' });

    expect(res2.status).toBe(201);
    expect(res2.body.success).toBe(true);
    expect(res2.body.data.content).toBe('Hello from seeker');
    expect(res2.body.data.senderId).toBe(seekerId);
  });

  // 3. Accepted inquiry: Owner can read messages.
  // 4. Accepted inquiry: Seeker can read messages.
  it('Owner and Seeker can read messages for an accepted inquiry', async () => {
    if (!DB_AVAILABLE) return;

    await Message.create({
      inquiryId: acceptedInquiryId,
      senderId: ownerId,
      content: 'Message 1',
    });
    await Message.create({
      inquiryId: acceptedInquiryId,
      senderId: seekerId,
      content: 'Message 2',
    });

    // Owner reads
    const res1 = await request(app)
      .get(`/api/v1/chat/${acceptedInquiryId}/messages`)
      .set('Authorization', `Bearer ${ownerToken}`);

    expect(res1.status).toBe(200);
    expect(res1.body.success).toBe(true);
    expect(res1.body.data.length).toBe(2);

    // Seeker reads
    const res2 = await request(app)
      .get(`/api/v1/chat/${acceptedInquiryId}/messages`)
      .set('Authorization', `Bearer ${seekerToken}`);

    expect(res2.status).toBe(200);
    expect(res2.body.success).toBe(true);
    expect(res2.body.data.length).toBe(2);
  });

  // 5. Pending inquiry: GET messages is rejected.
  it('Pending inquiry: GET messages is rejected', async () => {
    if (!DB_AVAILABLE) return;
    const res = await request(app)
      .get(`/api/v1/chat/${pendingInquiryId}/messages`)
      .set('Authorization', `Bearer ${ownerToken}`);
    expect(res.status).toBe(403);
  });

  // 6. Pending inquiry: POST message is rejected.
  it('Pending inquiry: POST message is rejected', async () => {
    if (!DB_AVAILABLE) return;
    const res = await request(app)
      .post(`/api/v1/chat/${pendingInquiryId}/messages`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ content: 'test' });
    expect(res.status).toBe(403);
  });

  // 7. Rejected inquiry: GET messages is rejected.
  it('Rejected inquiry: GET messages is rejected', async () => {
    if (!DB_AVAILABLE) return;
    const res = await request(app)
      .get(`/api/v1/chat/${rejectedInquiryId}/messages`)
      .set('Authorization', `Bearer ${ownerToken}`);
    expect(res.status).toBe(403);
  });

  // 8. Rejected inquiry: POST message is rejected.
  it('Rejected inquiry: POST message is rejected', async () => {
    if (!DB_AVAILABLE) return;
    const res = await request(app)
      .post(`/api/v1/chat/${rejectedInquiryId}/messages`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ content: 'test' });
    expect(res.status).toBe(403);
  });

  // 9. Cancelled inquiry: GET messages is rejected.
  it('Cancelled inquiry: GET messages is rejected', async () => {
    if (!DB_AVAILABLE) return;
    const res = await request(app)
      .get(`/api/v1/chat/${cancelledInquiryId}/messages`)
      .set('Authorization', `Bearer ${ownerToken}`);
    expect(res.status).toBe(403);
  });

  // 10. Cancelled inquiry: POST message is rejected.
  it('Cancelled inquiry: POST message is rejected', async () => {
    if (!DB_AVAILABLE) return;
    const res = await request(app)
      .post(`/api/v1/chat/${cancelledInquiryId}/messages`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ content: 'test' });
    expect(res.status).toBe(403);
  });

  // 10. Unrelated authenticated user: GET is rejected.
  it('Unrelated authenticated user: GET is rejected', async () => {
    if (!DB_AVAILABLE) return;
    const res = await request(app)
      .get(`/api/v1/chat/${acceptedInquiryId}/messages`)
      .set('Authorization', `Bearer ${unrelatedUserToken}`);
    expect(res.status).toBe(403);
  });

  // 11. Unrelated authenticated user: POST is rejected.
  it('Unrelated authenticated user: POST is rejected', async () => {
    if (!DB_AVAILABLE) return;
    const res = await request(app)
      .post(`/api/v1/chat/${acceptedInquiryId}/messages`)
      .set('Authorization', `Bearer ${unrelatedUserToken}`)
      .send({ content: 'test' });
    expect(res.status).toBe(403);
  });

  // 12. Non-existent inquiry: GET/POST returns standard Not Found response.
  it('Non-existent inquiry returns 404', async () => {
    if (!DB_AVAILABLE) return;
    const fakeId = new mongoose.Types.ObjectId().toString();
    const resGet = await request(app)
      .get(`/api/v1/chat/${fakeId}/messages`)
      .set('Authorization', `Bearer ${ownerToken}`);
    expect(resGet.status).toBe(404);

    const resPost = await request(app)
      .post(`/api/v1/chat/${fakeId}/messages`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ content: 'test' });
    expect(resPost.status).toBe(404);
  });

  // 13. Empty message: POST is rejected.
  it('Empty message: POST is rejected', async () => {
    if (!DB_AVAILABLE) return;
    const res = await request(app)
      .post(`/api/v1/chat/${acceptedInquiryId}/messages`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ content: '   ' });
    expect(res.status).toBe(400);
  });

  // 14. Client attempts to provide another senderId
  it('Client attempts to provide another senderId: server ignores it and uses authenticated user ID', async () => {
    if (!DB_AVAILABLE) return;
    const res = await request(app)
      .post(`/api/v1/chat/${acceptedInquiryId}/messages`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ content: 'Hello', senderId: unrelatedUserId });

    expect(res.status).toBe(201);
    expect(res.body.data.senderId).toBe(ownerId);
    expect(res.body.data.senderId).not.toBe(unrelatedUserId);
  });

  // 16. Whitespace-only content is explicitly rejected.
  it('Whitespace-only content: POST is rejected with 400', async () => {
    if (!DB_AVAILABLE) return;
    const res = await request(app)
      .post(`/api/v1/chat/${acceptedInquiryId}/messages`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ content: '     ' });
    expect(res.status).toBe(400);
  });

  // 20. Message response uses `id` serialization; `_id` and `__v` must not be exposed.
  it('POST message response uses id serialization, not _id or __v', async () => {
    if (!DB_AVAILABLE) return;
    const res = await request(app)
      .post(`/api/v1/chat/${acceptedInquiryId}/messages`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ content: 'Serialization check' });

    expect(res.status).toBe(201);
    expect(res.body.data).toHaveProperty('id');
    expect(res.body.data).not.toHaveProperty('_id');
    expect(res.body.data).not.toHaveProperty('__v');
  });

  // 15. Messages from one inquiry never appear in another inquiry's response.
  it('Messages from one inquiry never appear in another', async () => {
    if (!DB_AVAILABLE) return;

    // Create a second accepted inquiry
    const room4 = await Room.create({
      ownerId: ownerId,
      title: 'Chat Test Room 4',
      description: 'Room description',
      price: 1000,
      location: 'Test City',
      status: 'Available',
    });
    const acceptedInq2 = await Inquiry.create({
      roomId: room4._id,
      roomOwnerId: ownerId,
      seekerId: seekerId,
      fromLocation: 'Test',
      purpose: 'Student',
      status: 'Accepted',
    });
    const acceptedInquiryId2 = acceptedInq2._id.toString();

    await Message.create({
      inquiryId: acceptedInquiryId,
      senderId: ownerId,
      content: 'Inquiry 1 Message',
    });

    await Message.create({
      inquiryId: acceptedInquiryId2,
      senderId: seekerId,
      content: 'Inquiry 2 Message',
    });

    const res = await request(app)
      .get(`/api/v1/chat/${acceptedInquiryId}/messages`)
      .set('Authorization', `Bearer ${ownerToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(1);
    expect(res.body.data[0].content).toBe('Inquiry 1 Message');
  });
});
