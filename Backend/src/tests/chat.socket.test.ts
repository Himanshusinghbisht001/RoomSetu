/**
 * Chat Socket.io Integration Tests
 *
 * These tests require a live MongoDB connection (MONGODB_TEST_URI) because the
 * socket handler delegates authorization and persistence to chatService, which
 * queries the database.  When MONGODB_TEST_URI is not set the suite is skipped
 * with a warning, identical to the pattern used by inquiry.test.ts and
 * chat.test.ts.
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { createServer, Server as HttpServer } from 'http';
import { io as Client, Socket as ClientSocket } from 'socket.io-client';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import bcryptjs from 'bcryptjs';

import { createApp } from '../app.js';
import { initSocketServer } from '../sockets/socket.js';
import { User } from '../modules/users/user.model.js';
import { Room } from '../modules/rooms/room.model.js';
import { Inquiry } from '../modules/inquiries/inquiry.model.js';
import { Message } from '../modules/chat/message.model.js';
import { env } from '../config/env.js';

const MONGODB_TEST_URI = process.env['MONGODB_TEST_URI'] ?? null;
const DB_AVAILABLE = MONGODB_TEST_URI !== null;

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Create an authenticated socket client, returns the connected ClientSocket. */
function makeClient(port: number, token: string): ClientSocket {
  return Client(`http://localhost:${port}`, {
    auth: { token },
    autoConnect: false,
    transports: ['websocket'],
  });
}

/** Wait for a socket to connect, reject on connect_error. */
function waitForConnect(client: ClientSocket): Promise<void> {
  return new Promise((resolve, reject) => {
    client.once('connect', () => resolve());
    client.once('connect_error', (err) => reject(err));
    client.connect();
  });
}

/** Wait for a single named event on a socket, with an optional timeout. */
function waitForEvent<T = unknown>(
  client: ClientSocket,
  event: string,
  timeoutMs = 3000,
): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`Timed out waiting for event "${event}"`));
    }, timeoutMs);

    client.once(event, (data: T) => {
      clearTimeout(timer);
      resolve(data);
    });
  });
}

// ── Test suite ────────────────────────────────────────────────────────────────

describe('Chat Socket.io Integration', () => {
  let httpServer: HttpServer;
  let ioServer: ReturnType<typeof initSocketServer>;
  let port: number;

  let ownerId: string;
  let ownerToken: string;
  let seekerId: string;
  let seekerToken: string;
  let unrelatedUserId: string;
  let unrelatedToken: string;

  let acceptedInquiryId: string;
  let pendingInquiryId: string;
  let rejectedInquiryId: string;
  let cancelledInquiryId: string;

  beforeAll(async () => {
    if (!DB_AVAILABLE) {
      console.warn('Skipping chat socket tests: MONGODB_TEST_URI is not set');
      return;
    }

    await mongoose.connect(MONGODB_TEST_URI as string);
    await mongoose.connection.dropDatabase();

    const app = createApp();
    httpServer = createServer(app);
    ioServer = initSocketServer(httpServer);

    await new Promise<void>((resolve) => {
      httpServer.listen(() => {
        port = (httpServer.address() as any).port;
        resolve();
      });
    });

    const salt = await bcryptjs.genSalt(10);
    const hash = await bcryptjs.hash('password123', salt);

    const owner = await User.create({
      name: 'CS Owner',
      email: 'cs-owner@test.com',
      password: hash,
      role: 'owner',
      phone: '9000000001',
      isPhoneVerified: true,
      authProvider: 'local',
    });
    ownerId = owner._id.toString();
    ownerToken = jwt.sign({ sub: ownerId, role: 'owner' }, env.JWT_ACCESS_SECRET, { expiresIn: '15m' });

    const seeker = await User.create({
      name: 'CS Seeker',
      email: 'cs-seeker@test.com',
      password: hash,
      role: 'seeker',
      phone: '9000000002',
      isPhoneVerified: true,
      authProvider: 'local',
    });
    seekerId = seeker._id.toString();
    seekerToken = jwt.sign({ sub: seekerId, role: 'seeker' }, env.JWT_ACCESS_SECRET, { expiresIn: '15m' });

    const unrelated = await User.create({
      name: 'CS Unrelated',
      email: 'cs-unrelated@test.com',
      password: hash,
      role: 'seeker',
      phone: '9000000003',
      isPhoneVerified: true,
      authProvider: 'local',
    });
    unrelatedUserId = unrelated._id.toString();
    unrelatedToken = jwt.sign({ sub: unrelatedUserId, role: 'seeker' }, env.JWT_ACCESS_SECRET, { expiresIn: '15m' });

    // Accepted inquiry room
    const room1 = await Room.create({ ownerId: owner._id, title: 'CS Room 1', description: 'd', price: 1000, location: 'L', status: 'Available' });
    const accepted = await Inquiry.create({ roomId: room1._id, roomOwnerId: owner._id, seekerId: seeker._id, fromLocation: 'X', purpose: 'Student', status: 'Accepted' });
    acceptedInquiryId = accepted._id.toString();

    // Pending inquiry room
    const room2 = await Room.create({ ownerId: owner._id, title: 'CS Room 2', description: 'd', price: 1000, location: 'L', status: 'Available' });
    const pending = await Inquiry.create({ roomId: room2._id, roomOwnerId: owner._id, seekerId: seeker._id, fromLocation: 'X', purpose: 'Student', status: 'Pending' });
    pendingInquiryId = pending._id.toString();

    // Rejected inquiry room
    const room3 = await Room.create({ ownerId: owner._id, title: 'CS Room 3', description: 'd', price: 1000, location: 'L', status: 'Available' });
    const rejected = await Inquiry.create({ roomId: room3._id, roomOwnerId: owner._id, seekerId: seeker._id, fromLocation: 'X', purpose: 'Student', status: 'Rejected' });
    rejectedInquiryId = rejected._id.toString();

    // Cancelled inquiry room
    const room4 = await Room.create({ ownerId: owner._id, title: 'CS Room 4', description: 'd', price: 1000, location: 'L', status: 'Available' });
    const cancelled = await Inquiry.create({ roomId: room4._id, roomOwnerId: owner._id, seekerId: seeker._id, fromLocation: 'X', purpose: 'Student', status: 'Cancelled' });
    cancelledInquiryId = cancelled._id.toString();
  });

  afterAll(async () => {
    if (!DB_AVAILABLE) return;
    ioServer.close();
    await new Promise<void>((resolve) => httpServer.close(() => resolve()));
    await mongoose.disconnect();
  });

  beforeEach(async () => {
    if (!DB_AVAILABLE) return;
    await Message.deleteMany({});
  });

  // ── Test 1: Accepted Owner can send a message ─────────────────────────────
  it('1. Accepted Owner can send chat:message:send', async () => {
    if (!DB_AVAILABLE) return;

    const owner = makeClient(port, ownerToken);
    await waitForConnect(owner);

    const errorPromise = waitForEvent(owner, 'chat:error', 500).catch(() => null);

    owner.emit('chat:message:send', { inquiryId: acceptedInquiryId, content: 'Hello from owner' });

    // Give the server time to process
    await new Promise((r) => setTimeout(r, 400));

    const err = await errorPromise;
    expect(err).toBeNull();

    const count = await Message.countDocuments({ inquiryId: acceptedInquiryId });
    expect(count).toBe(1);

    const msg = await Message.findOne({ inquiryId: acceptedInquiryId });
    expect(msg!.senderId.toString()).toBe(ownerId);
    expect(msg!.content).toBe('Hello from owner');

    owner.close();
  });

  // ── Test 2: Accepted Seeker can send a message ────────────────────────────
  it('2. Accepted Seeker can send chat:message:send', async () => {
    if (!DB_AVAILABLE) return;

    const seeker = makeClient(port, seekerToken);
    await waitForConnect(seeker);

    const errorPromise = waitForEvent(seeker, 'chat:error', 500).catch(() => null);

    seeker.emit('chat:message:send', { inquiryId: acceptedInquiryId, content: 'Hello from seeker' });

    await new Promise((r) => setTimeout(r, 400));

    const err = await errorPromise;
    expect(err).toBeNull();

    const msg = await Message.findOne({ inquiryId: acceptedInquiryId });
    expect(msg!.senderId.toString()).toBe(seekerId);

    seeker.close();
  });

  // ── Test 3: Recipient receives chat:message:new ───────────────────────────
  it('3. Recipient receives chat:message:new after Owner sends', async () => {
    if (!DB_AVAILABLE) return;

    const ownerClient = makeClient(port, ownerToken);
    const seekerClient = makeClient(port, seekerToken);

    await Promise.all([waitForConnect(ownerClient), waitForConnect(seekerClient)]);

    const receivedPromise = waitForEvent<any>(seekerClient, 'chat:message:new', 3000);

    ownerClient.emit('chat:message:send', { inquiryId: acceptedInquiryId, content: 'Real-time test' });

    const received = await receivedPromise;

    expect(received.content).toBe('Real-time test');
    expect(received.id).toBeDefined();
    expect(received).not.toHaveProperty('_id');
    expect(received).not.toHaveProperty('__v');
    expect(received.senderId).toBe(ownerId);
    expect(received.inquiryId).toBe(acceptedInquiryId);

    ownerClient.close();
    seekerClient.close();
  });

  // ── Test 4: Unrelated user cannot send ───────────────────────────────────
  it('4. Unrelated user receives chat:error, message not persisted', async () => {
    if (!DB_AVAILABLE) return;

    const client = makeClient(port, unrelatedToken);
    await waitForConnect(client);

    const errorPromise = waitForEvent<any>(client, 'chat:error', 3000);

    client.emit('chat:message:send', { inquiryId: acceptedInquiryId, content: 'Sneaky message' });

    const err = await errorPromise;
    expect(err.message).toBeTruthy();

    const count = await Message.countDocuments({ inquiryId: acceptedInquiryId });
    expect(count).toBe(0);

    client.close();
  });

  // ── Test 5: Pending inquiry cannot send ──────────────────────────────────
  it('5. Pending inquiry: chat:message:send is rejected', async () => {
    if (!DB_AVAILABLE) return;

    const owner = makeClient(port, ownerToken);
    await waitForConnect(owner);

    const errorPromise = waitForEvent<any>(owner, 'chat:error', 3000);
    owner.emit('chat:message:send', { inquiryId: pendingInquiryId, content: 'test' });

    const err = await errorPromise;
    expect(err.message).toBeTruthy();

    owner.close();
  });

  // ── Test 6: Rejected inquiry cannot send ─────────────────────────────────
  it('6. Rejected inquiry: chat:message:send is rejected', async () => {
    if (!DB_AVAILABLE) return;

    const owner = makeClient(port, ownerToken);
    await waitForConnect(owner);

    const errorPromise = waitForEvent<any>(owner, 'chat:error', 3000);
    owner.emit('chat:message:send', { inquiryId: rejectedInquiryId, content: 'test' });

    const err = await errorPromise;
    expect(err.message).toBeTruthy();

    owner.close();
  });

  // ── Test 7: Cancelled inquiry cannot send ────────────────────────────────
  it('7. Cancelled inquiry: chat:message:send is rejected', async () => {
    if (!DB_AVAILABLE) return;

    const owner = makeClient(port, ownerToken);
    await waitForConnect(owner);

    const errorPromise = waitForEvent<any>(owner, 'chat:error', 3000);
    owner.emit('chat:message:send', { inquiryId: cancelledInquiryId, content: 'test' });

    const err = await errorPromise;
    expect(err.message).toBeTruthy();

    owner.close();
  });

  // ── Test 8: Client cannot spoof senderId ─────────────────────────────────
  it('8. Client-supplied senderId is ignored; stored senderId equals auth userId', async () => {
    if (!DB_AVAILABLE) return;

    const owner = makeClient(port, ownerToken);
    await waitForConnect(owner);

    // Send a payload with a bogus senderId field
    owner.emit('chat:message:send', {
      inquiryId: acceptedInquiryId,
      content: 'Spoof attempt',
      senderId: unrelatedUserId,
    });

    await new Promise((r) => setTimeout(r, 500));

    const msg = await Message.findOne({ inquiryId: acceptedInquiryId });
    expect(msg).not.toBeNull();
    expect(msg!.senderId.toString()).toBe(ownerId);
    expect(msg!.senderId.toString()).not.toBe(unrelatedUserId);

    owner.close();
  });

  // ── Test 9: Client cannot choose recipientId ─────────────────────────────
  it('9. Client cannot choose recipientId; server derives it from the Inquiry', async () => {
    if (!DB_AVAILABLE) return;

    const ownerClient = makeClient(port, ownerToken);
    const seekerClient = makeClient(port, seekerToken);
    const unrelatedClient = makeClient(port, unrelatedToken);

    await Promise.all([
      waitForConnect(ownerClient),
      waitForConnect(seekerClient),
      waitForConnect(unrelatedClient),
    ]);

    // Unrelated user should NOT receive chat:message:new
    const unrelatedReceivedPromise = waitForEvent(unrelatedClient, 'chat:message:new', 1000).catch(() => null);

    ownerClient.emit('chat:message:send', {
      inquiryId: acceptedInquiryId,
      content: 'Recipient test',
      // Client tries to trick the server into delivering to the unrelated user
      recipientId: unrelatedUserId,
    });

    const unrelatedReceived = await unrelatedReceivedPromise;
    expect(unrelatedReceived).toBeNull();

    ownerClient.close();
    seekerClient.close();
    unrelatedClient.close();
  });

  // ── Test 10: Message is persisted exactly once ────────────────────────────
  it('10. Message is persisted exactly once per chat:message:send', async () => {
    if (!DB_AVAILABLE) return;

    const owner = makeClient(port, ownerToken);
    await waitForConnect(owner);

    owner.emit('chat:message:send', { inquiryId: acceptedInquiryId, content: 'Persist once' });

    await new Promise((r) => setTimeout(r, 500));

    const count = await Message.countDocuments({ inquiryId: acceptedInquiryId });
    expect(count).toBe(1);

    owner.close();
  });

  // ── Test 11: Message sent only to recipient, not to sender socket ─────────
  it('11. chat:message:new is emitted to recipient, not back to sender', async () => {
    if (!DB_AVAILABLE) return;

    const ownerClient = makeClient(port, ownerToken);
    const seekerClient = makeClient(port, seekerToken);

    await Promise.all([waitForConnect(ownerClient), waitForConnect(seekerClient)]);

    const senderReceived = waitForEvent(ownerClient, 'chat:message:new', 800).catch(() => null);
    const recipientReceived = waitForEvent<any>(seekerClient, 'chat:message:new', 3000);

    ownerClient.emit('chat:message:send', { inquiryId: acceptedInquiryId, content: 'Directed message' });

    const [senderResult, recipientResult] = await Promise.all([senderReceived, recipientReceived]);

    // Sender should NOT receive the chat:message:new back on their own socket
    expect(senderResult).toBeNull();
    // Recipient should receive it
    expect(recipientResult.content).toBe('Directed message');

    ownerClient.close();
    seekerClient.close();
  });

  // ── Test 12: Existing inquiry socket events still work ────────────────────
  it('12. Socket server still authenticates and connects correctly after chat handler added', async () => {
    if (!DB_AVAILABLE) return;

    const owner = makeClient(port, ownerToken);
    await waitForConnect(owner);
    expect(owner.connected).toBe(true);
    owner.close();
  });
});
