/**
 * Phase 5 — Inquiry Web Push Notification Tests
 *
 * Verifies that Web Push notifications are:
 *  - Sent to the correct server-determined recipient after successful DB operations
 *  - NOT sent when the DB operation itself fails
 *  - Non-fatal: push failures must never cause the inquiry operation to fail
 *
 * The push.service module is mocked so no real HTTP push requests are made.
 */

import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import { createServer, Server as HttpServer } from 'http';
import { io as Client, Socket as ClientSocket } from 'socket.io-client';
import jwt from 'jsonwebtoken';
import bcryptjs from 'bcryptjs';

import { createApp } from '../app.js';
import { initSocketServer } from '../sockets/socket.js';
import { User } from '../modules/users/user.model.js';
import { Room } from '../modules/rooms/room.model.js';
import { Inquiry } from '../modules/inquiries/inquiry.model.js';
import { env } from '../config/env.js';

// ── Mock push.service so no real pushes are sent ──────────────────────────────
vi.mock('../modules/notifications/push.service.js', () => ({
  sendPushToUser: vi.fn().mockResolvedValue({ sent: 1, removed: 0, failed: 0 }),
  configureWebPush: vi.fn(),
}));

// Import AFTER the mock is registered so we get the mocked version
import { sendPushToUser } from '../modules/notifications/push.service.js';

// ─────────────────────────────────────────────────────────────────────────────

const MONGODB_TEST_URI = process.env['MONGODB_TEST_URI'] ?? null;
const DB_AVAILABLE = MONGODB_TEST_URI !== null;

describe('Phase 5 — Inquiry Web Push Notifications', () => {
  const app = createApp();
  let httpServer: HttpServer;
  let io: any;
  let port: number;

  let ownerToken: string;
  let seeker1Token: string;

  let ownerId: string;
  let seeker1Id: string;

  let roomId: string;

  beforeAll(async () => {
    if (!DB_AVAILABLE) {
      console.warn('Skipping inquiry-push tests: MONGODB_TEST_URI is not set');
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
    const owner = await User.create({
      name: 'Push Owner',
      email: 'push-owner@test.com',
      passwordHash,
      role: 'owner',
    });
    const seeker1 = await User.create({
      name: 'Push Seeker',
      email: 'push-seeker@test.com',
      passwordHash,
      role: 'seeker',
    });

    ownerId = owner._id.toString();
    seeker1Id = seeker1._id.toString();

    // Login to get tokens
    const login = async (email: string) => {
      const res = await request(httpServer)
        .post('/api/v1/auth/login')
        .send({ email, password: 'password123' });
      return res.body.data.accessToken;
    };

    ownerToken = await login('push-owner@test.com');
    seeker1Token = await login('push-seeker@test.com');

    // Create a room
    const room = await Room.create({
      ownerId: owner._id,
      title: 'Push Test Room',
      description: 'Room used for push notification tests',
      rent: 5000,
      location: { country: 'IN', state: 'DL', city: 'Delhi', area: 'Central' },
      roomType: 'Single',
      contactNumber: '1234567890',
    });
    roomId = room._id.toString();
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
    vi.clearAllMocks();
    await Inquiry.deleteMany({});
  });

  // ─── 1. New inquiry → push sent to owner ─────────────────────────────────────
  it('1. New inquiry triggers Web Push to the room owner', async () => {
    if (!DB_AVAILABLE) return;

    const res = await request(httpServer)
      .post(`/api/v1/rooms/${roomId}/inquiries`)
      .set('Authorization', `Bearer ${seeker1Token}`)
      .send({ fromLocation: 'Delhi', purpose: 'Student', message: 'Interested!' });

    expect(res.status).toBe(201);

    expect(sendPushToUser).toHaveBeenCalledOnce();

    const [recipientId, payload] = (sendPushToUser as ReturnType<typeof vi.fn>).mock.calls[0];

    // Recipient must be the owner, determined server-side
    expect(recipientId).toBe(ownerId);

    // Payload shape
    expect(payload.title).toBe('New Interest Request');
    expect(payload.body).toContain('Push Seeker');
    expect(payload.url).toBe('/owner');
    expect(payload.tag).toMatch(/^interest-new-/);

    // No sensitive data in payload
    expect(payload.password).toBeUndefined();
    expect(payload.accessToken).toBeUndefined();
    expect(payload.refreshToken).toBeUndefined();
  });

  // ─── 2. Accept inquiry → push sent to seeker ─────────────────────────────────
  it('2. Accepted inquiry triggers Web Push to the seeker', async () => {
    if (!DB_AVAILABLE) return;

    // Create inquiry first
    const createRes = await request(httpServer)
      .post(`/api/v1/rooms/${roomId}/inquiries`)
      .set('Authorization', `Bearer ${seeker1Token}`)
      .send({ fromLocation: 'Mumbai', purpose: 'Working Professional' });

    expect(createRes.status).toBe(201);
    const inquiryId = createRes.body.data.id;

    vi.clearAllMocks(); // Reset so only the accept push is counted

    const res = await request(httpServer)
      .patch(`/api/v1/inquiries/${inquiryId}/accept`)
      .set('Authorization', `Bearer ${ownerToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('Accepted');

    expect(sendPushToUser).toHaveBeenCalledOnce();

    const [recipientId, payload] = (sendPushToUser as ReturnType<typeof vi.fn>).mock.calls[0];

    // Recipient must be the seeker, determined server-side
    expect(recipientId).toBe(seeker1Id);

    expect(payload.title).toBe('Interest Accepted');
    expect(payload.body).toBe('Your interest request has been accepted by the owner');
    expect(payload.url).toBe(`/chat/${inquiryId}`);
    expect(payload.tag).toBe(`interest-accepted-${inquiryId}`);

    // No sensitive data
    expect(payload.password).toBeUndefined();
    expect(payload.accessToken).toBeUndefined();
  });

  // ─── 3. Reject inquiry → push sent to seeker ─────────────────────────────────
  it('3. Rejected inquiry triggers Web Push to the seeker', async () => {
    if (!DB_AVAILABLE) return;

    const createRes = await request(httpServer)
      .post(`/api/v1/rooms/${roomId}/inquiries`)
      .set('Authorization', `Bearer ${seeker1Token}`)
      .send({ fromLocation: 'Pune', purpose: 'Business' });

    expect(createRes.status).toBe(201);
    const inquiryId = createRes.body.data.id;

    vi.clearAllMocks();

    const res = await request(httpServer)
      .patch(`/api/v1/inquiries/${inquiryId}/reject`)
      .set('Authorization', `Bearer ${ownerToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('Rejected');

    expect(sendPushToUser).toHaveBeenCalledOnce();

    const [recipientId, payload] = (sendPushToUser as ReturnType<typeof vi.fn>).mock.calls[0];

    expect(recipientId).toBe(seeker1Id);
    expect(payload.title).toBe('Interest Request Rejected');
    expect(payload.body).toBe('Your interest request was rejected by the owner');
    expect(payload.url).toBe('/');
    expect(payload.tag).toBe(`interest-rejected-${inquiryId}`);
  });

  // ─── 4. Failed inquiry creation → NO push ────────────────────────────────────
  it('4. Failed inquiry creation does NOT trigger Web Push', async () => {
    if (!DB_AVAILABLE) return;

    // Creating with a nonexistent room triggers a 404 before any push
    const fakeId = new mongoose.Types.ObjectId().toString();
    const res = await request(httpServer)
      .post(`/api/v1/rooms/${fakeId}/inquiries`)
      .set('Authorization', `Bearer ${seeker1Token}`)
      .send({ fromLocation: 'Delhi', purpose: 'Student' });

    expect(res.status).toBe(404);
    expect(sendPushToUser).not.toHaveBeenCalled();
  });

  // ─── 5. Failed accept (role guard) → NO push ─────────────────────────────────
  it('5. Failed accept (unauthorized role) does NOT trigger Web Push', async () => {
    if (!DB_AVAILABLE) return;

    const createRes = await request(httpServer)
      .post(`/api/v1/rooms/${roomId}/inquiries`)
      .set('Authorization', `Bearer ${seeker1Token}`)
      .send({ fromLocation: 'Bengaluru', purpose: 'Other' });

    const inquiryId = createRes.body.data.id;
    vi.clearAllMocks();

    // Use the seeker token — seeker cannot accept (role guard → 403)
    const res = await request(httpServer)
      .patch(`/api/v1/inquiries/${inquiryId}/accept`)
      .set('Authorization', `Bearer ${seeker1Token}`);

    expect(res.status).toBe(403);
    expect(sendPushToUser).not.toHaveBeenCalled();
  });

  // ─── 6. Failed reject (wrong state) → NO push ───────────────────────────────
  it('6. Failed reject (inquiry already accepted) does NOT trigger Web Push', async () => {
    if (!DB_AVAILABLE) return;

    const createRes = await request(httpServer)
      .post(`/api/v1/rooms/${roomId}/inquiries`)
      .set('Authorization', `Bearer ${seeker1Token}`)
      .send({ fromLocation: 'Chennai', purpose: 'Family / Relocation' });

    const inquiryId = createRes.body.data.id;

    // Accept it first
    await request(httpServer)
      .patch(`/api/v1/inquiries/${inquiryId}/accept`)
      .set('Authorization', `Bearer ${ownerToken}`);

    vi.clearAllMocks();

    // Now try to reject — should fail with 409
    const res = await request(httpServer)
      .patch(`/api/v1/inquiries/${inquiryId}/reject`)
      .set('Authorization', `Bearer ${ownerToken}`);

    expect(res.status).toBe(409);
    expect(sendPushToUser).not.toHaveBeenCalled();
  });

  // ─── 7. Push failure does NOT make the inquiry operation fail ─────────────────
  it('7. Push failure does NOT cause the inquiry creation to fail', async () => {
    if (!DB_AVAILABLE) return;

    // Override mock to throw
    vi.mocked(sendPushToUser).mockRejectedValueOnce(new Error('Push provider unreachable'));

    const res = await request(httpServer)
      .post(`/api/v1/rooms/${roomId}/inquiries`)
      .set('Authorization', `Bearer ${seeker1Token}`)
      .send({ fromLocation: 'Hyderabad', purpose: 'Student' });

    // The inquiry must still succeed despite push failure
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('Pending');
  });

  // ─── 7b. Push failure does NOT make accept fail ───────────────────────────────
  it('7b. Push failure does NOT cause the accept operation to fail', async () => {
    if (!DB_AVAILABLE) return;

    const createRes = await request(httpServer)
      .post(`/api/v1/rooms/${roomId}/inquiries`)
      .set('Authorization', `Bearer ${seeker1Token}`)
      .send({ fromLocation: 'Kolkata', purpose: 'Working Professional' });

    const inquiryId = createRes.body.data.id;
    vi.clearAllMocks();

    vi.mocked(sendPushToUser).mockRejectedValueOnce(new Error('Push provider unreachable'));

    const res = await request(httpServer)
      .patch(`/api/v1/inquiries/${inquiryId}/accept`)
      .set('Authorization', `Bearer ${ownerToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('Accepted');
  });

  // ─── 7c. Push failure does NOT make reject fail ───────────────────────────────
  it('7c. Push failure does NOT cause the reject operation to fail', async () => {
    if (!DB_AVAILABLE) return;

    const createRes = await request(httpServer)
      .post(`/api/v1/rooms/${roomId}/inquiries`)
      .set('Authorization', `Bearer ${seeker1Token}`)
      .send({ fromLocation: 'Jaipur', purpose: 'Business' });

    const inquiryId = createRes.body.data.id;
    vi.clearAllMocks();

    vi.mocked(sendPushToUser).mockRejectedValueOnce(new Error('Push provider unreachable'));

    const res = await request(httpServer)
      .patch(`/api/v1/inquiries/${inquiryId}/reject`)
      .set('Authorization', `Bearer ${ownerToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('Rejected');
  });

  // ─── 8. Correct recipient userId from server-side data ────────────────────────
  it('8. Push recipient is always taken from server-side inquiry data, not from the client', async () => {
    if (!DB_AVAILABLE) return;

    // Even if the client sends a bogus body field, the recipient is always derived
    // from the room ownerId (server-side). Confirm the exact value passed matches ownerId.
    const res = await request(httpServer)
      .post(`/api/v1/rooms/${roomId}/inquiries`)
      .set('Authorization', `Bearer ${seeker1Token}`)
      // Attempt to inject a recipient — backend must ignore this completely
      .send({ fromLocation: 'Agra', purpose: 'Other', recipientId: 'hacker-id-12345' });

    expect(res.status).toBe(201);

    const [recipientId] = (sendPushToUser as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(recipientId).toBe(ownerId);
    expect(recipientId).not.toBe('hacker-id-12345');
  });

  // ─── 9. Client cannot control push recipient ─────────────────────────────────
  it('9. Client cannot supply a custom push recipient via the request body on accept', async () => {
    if (!DB_AVAILABLE) return;

    const createRes = await request(httpServer)
      .post(`/api/v1/rooms/${roomId}/inquiries`)
      .set('Authorization', `Bearer ${seeker1Token}`)
      .send({ fromLocation: 'Surat', purpose: 'Student' });

    const inquiryId = createRes.body.data.id;
    vi.clearAllMocks();

    // Owner tries to accept while passing a fake recipient — must be ignored
    const res = await request(httpServer)
      .patch(`/api/v1/inquiries/${inquiryId}/accept`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ recipientId: 'attacker-user-id-9999' });

    expect(res.status).toBe(200);

    const [recipientId] = (sendPushToUser as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(recipientId).toBe(seeker1Id);
    expect(recipientId).not.toBe('attacker-user-id-9999');
  });

  // ─── 10. Existing Socket.io behavior is intact ───────────────────────────────
  it('10. Existing Socket.io room:interest:new event still fires correctly alongside push', async () => {
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

    await new Promise<void>((resolve) => {
      ownerClient.on('connect', () => resolve());
      ownerClient.connect();
    });

    const eventPromise = new Promise<any>((resolve) => {
      ownerClient.on('room:interest:new', (data: any) => resolve(data));
    });

    await request(httpServer)
      .post(`/api/v1/rooms/${roomId}/inquiries`)
      .set('Authorization', `Bearer ${seeker1Token}`)
      .send({ fromLocation: 'Nagpur', purpose: 'Student', message: 'Socket test!' });

    const eventData = await eventPromise;

    // Socket.io payload still correct
    expect(eventData.roomId).toBe(roomId);
    expect(eventData.seekerId).toBe(seeker1Id);
    expect(eventData.seekerName).toBe('Push Seeker');
    expect(eventData.status).toBe('Pending');

    // Push was also called (coexistence confirmed)
    expect(sendPushToUser).toHaveBeenCalledOnce();

    ownerClient.close();
  });

  // ─── 11. Existing inquiry tests still pass (smoke) ───────────────────────────
  it('11. Core inquiry lifecycle (create / accept / reject) still works correctly with push in place', async () => {
    if (!DB_AVAILABLE) return;

    // Create
    const createRes = await request(httpServer)
      .post(`/api/v1/rooms/${roomId}/inquiries`)
      .set('Authorization', `Bearer ${seeker1Token}`)
      .send({ fromLocation: 'Lucknow', purpose: 'Family / Relocation' });

    expect(createRes.status).toBe(201);
    expect(createRes.body.data.status).toBe('Pending');

    const inquiryId = createRes.body.data.id;
    vi.clearAllMocks();

    // Reject
    const rejectRes = await request(httpServer)
      .patch(`/api/v1/inquiries/${inquiryId}/reject`)
      .set('Authorization', `Bearer ${ownerToken}`);

    expect(rejectRes.status).toBe(200);
    expect(rejectRes.body.data.status).toBe('Rejected');

    // Attempting double-reject must still return 409
    const doubleRejectRes = await request(httpServer)
      .patch(`/api/v1/inquiries/${inquiryId}/reject`)
      .set('Authorization', `Bearer ${ownerToken}`);

    expect(doubleRejectRes.status).toBe(409);
  });
});
