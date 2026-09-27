/**
 * Phase 6 — Chat Web Push Notification Tests
 *
 * Verifies that Web Push notifications are:
 *  - Sent to the correct server-determined recipient after a message is persisted
 *  - NOT sent when chat authorization fails (wrong status, unrelated user)
 *  - NOT sent to the sender — only to the recipient
 *  - Non-fatal: push failures must never cause the chat operation to fail
 *  - Exactly one message is persisted per send event
 *
 * The push.service module is mocked so no real HTTP push requests are made.
 * Socket.io behavior is verified to remain intact alongside push delivery.
 */

import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from 'vitest';
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

// ── Mock push.service so no real pushes are sent ──────────────────────────────
vi.mock('../modules/notifications/push.service.js', () => ({
  sendPushToUser: vi.fn().mockResolvedValue({ sent: 1, removed: 0, failed: 0 }),
  configureWebPush: vi.fn(),
}));

import { sendPushToUser } from '../modules/notifications/push.service.js';

// ─────────────────────────────────────────────────────────────────────────────

const MONGODB_TEST_URI = process.env['MONGODB_TEST_URI'] ?? null;
const DB_AVAILABLE = MONGODB_TEST_URI !== null;

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeClient(port: number, token: string): ClientSocket {
  return Client(`http://localhost:${port}`, {
    auth: { token },
    autoConnect: false,
    transports: ['websocket'],
  });
}

function waitForConnect(client: ClientSocket): Promise<void> {
  return new Promise((resolve, reject) => {
    client.once('connect', () => resolve());
    client.once('connect_error', (err) => reject(err));
    client.connect();
  });
}

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

/** Send a message via socket and wait for the ACK to confirm persistence. */
function sendAndAck(
  client: ClientSocket,
  inquiryId: string,
  content: string,
  timeoutMs = 3000,
): Promise<any> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('ACK timed out')), timeoutMs);
    client.emit('chat:message:send', { inquiryId, content }, (ack: any) => {
      clearTimeout(timer);
      resolve(ack);
    });
  });
}

// ─────────────────────────────────────────────────────────────────────────────

describe('Phase 6 — Chat Web Push Notifications', () => {
  let httpServer: HttpServer;
  let ioServer: ReturnType<typeof initSocketServer>;
  let port: number;

  let ownerId: string;
  let ownerToken: string;
  let seekerId: string;
  let seekerToken: string;
  let unrelatedId: string;
  let unrelatedToken: string;

  let acceptedInquiryId: string;
  let pendingInquiryId: string;
  let rejectedInquiryId: string;
  let cancelledInquiryId: string;

  beforeAll(async () => {
    if (!DB_AVAILABLE) {
      console.warn('Skipping chat-push tests: MONGODB_TEST_URI is not set');
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
      name: 'CP Owner',
      email: 'cp-owner@test.com',
      password: hash,
      role: 'owner',
      phone: '9100000001',
      isPhoneVerified: true,
      authProvider: 'local',
    });
    ownerId = owner._id.toString();
    ownerToken = jwt.sign({ sub: ownerId, role: 'owner' }, env.JWT_ACCESS_SECRET, { expiresIn: '15m' });

    const seeker = await User.create({
      name: 'CP Seeker',
      email: 'cp-seeker@test.com',
      password: hash,
      role: 'seeker',
      phone: '9100000002',
      isPhoneVerified: true,
      authProvider: 'local',
    });
    seekerId = seeker._id.toString();
    seekerToken = jwt.sign({ sub: seekerId, role: 'seeker' }, env.JWT_ACCESS_SECRET, { expiresIn: '15m' });

    const unrelated = await User.create({
      name: 'CP Unrelated',
      email: 'cp-unrelated@test.com',
      password: hash,
      role: 'seeker',
      phone: '9100000003',
      isPhoneVerified: true,
      authProvider: 'local',
    });
    unrelatedId = unrelated._id.toString();
    unrelatedToken = jwt.sign({ sub: unrelatedId, role: 'seeker' }, env.JWT_ACCESS_SECRET, { expiresIn: '15m' });

    // Create rooms and inquiries in different states
    const room1 = await Room.create({ ownerId: owner._id, title: 'CP Room 1', description: 'd', price: 1000, location: 'L', status: 'Available' });
    const accepted = await Inquiry.create({ roomId: room1._id, roomOwnerId: owner._id, seekerId: seeker._id, fromLocation: 'X', purpose: 'Student', status: 'Accepted' });
    acceptedInquiryId = accepted._id.toString();

    const room2 = await Room.create({ ownerId: owner._id, title: 'CP Room 2', description: 'd', price: 1000, location: 'L', status: 'Available' });
    const pending = await Inquiry.create({ roomId: room2._id, roomOwnerId: owner._id, seekerId: seeker._id, fromLocation: 'X', purpose: 'Student', status: 'Pending' });
    pendingInquiryId = pending._id.toString();

    const room3 = await Room.create({ ownerId: owner._id, title: 'CP Room 3', description: 'd', price: 1000, location: 'L', status: 'Available' });
    const rejected = await Inquiry.create({ roomId: room3._id, roomOwnerId: owner._id, seekerId: seeker._id, fromLocation: 'X', purpose: 'Student', status: 'Rejected' });
    rejectedInquiryId = rejected._id.toString();

    const room4 = await Room.create({ ownerId: owner._id, title: 'CP Room 4', description: 'd', price: 1000, location: 'L', status: 'Available' });
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
    vi.clearAllMocks();
    await Message.deleteMany({});
  });

  // ─── 1. Owner sends → seeker receives Web Push ────────────────────────────
  it('1. Owner sends message → seeker receives Web Push with correct payload', async () => {
    if (!DB_AVAILABLE) return;

    const ownerClient = makeClient(port, ownerToken);
    await waitForConnect(ownerClient);

    const ack = await sendAndAck(ownerClient, acceptedInquiryId, 'Hello seeker!');
    expect(ack.success).toBe(true);

    // Give async push a moment to settle
    await new Promise((r) => setTimeout(r, 100));

    expect(sendPushToUser).toHaveBeenCalledOnce();

    const [recipientId, payload] = (sendPushToUser as ReturnType<typeof vi.fn>).mock.calls[0];

    // Recipient is the seeker (not the sender/owner)
    expect(recipientId).toBe(seekerId);
    expect(recipientId).not.toBe(ownerId);

    // Payload content
    expect(payload.title).toBe('New Message');
    expect(payload.body).toBe('You have a new message from the room owner');
    expect(payload.url).toBe(`/chat/${acceptedInquiryId}`);
    expect(payload.tag).toBe(`chat-${acceptedInquiryId}`);

    // No sensitive data
    expect(payload.content).toBeUndefined();
    expect(payload.password).toBeUndefined();
    expect(payload.accessToken).toBeUndefined();

    ownerClient.close();
  });

  // ─── 2. Seeker sends → owner receives Web Push ───────────────────────────
  it('2. Seeker sends message → owner receives Web Push with correct payload', async () => {
    if (!DB_AVAILABLE) return;

    const seekerClient = makeClient(port, seekerToken);
    await waitForConnect(seekerClient);

    const ack = await sendAndAck(seekerClient, acceptedInquiryId, 'Hello owner!');
    expect(ack.success).toBe(true);

    await new Promise((r) => setTimeout(r, 100));

    expect(sendPushToUser).toHaveBeenCalledOnce();

    const [recipientId, payload] = (sendPushToUser as ReturnType<typeof vi.fn>).mock.calls[0];

    // Recipient is the owner (not the sender/seeker)
    expect(recipientId).toBe(ownerId);
    expect(recipientId).not.toBe(seekerId);

    expect(payload.title).toBe('New Message');
    expect(payload.body).toBe('You have a new message from a room seeker');
    expect(payload.url).toBe(`/chat/${acceptedInquiryId}`);
    expect(payload.tag).toBe(`chat-${acceptedInquiryId}`);

    // Message content must NOT be in payload
    expect(payload.content).toBeUndefined();
    expect(payload.body).not.toContain('Hello owner!');

    seekerClient.close();
  });

  // ─── 3. Sender does NOT receive Web Push ─────────────────────────────────
  it('3. Sender is NOT the push recipient', async () => {
    if (!DB_AVAILABLE) return;

    const ownerClient = makeClient(port, ownerToken);
    await waitForConnect(ownerClient);

    await sendAndAck(ownerClient, acceptedInquiryId, 'Check sender exclusion');

    await new Promise((r) => setTimeout(r, 100));

    // Push was called exactly once
    expect(sendPushToUser).toHaveBeenCalledOnce();

    const [recipientId] = (sendPushToUser as ReturnType<typeof vi.fn>).mock.calls[0];

    // Must not be the sender (owner)
    expect(recipientId).not.toBe(ownerId);
    // Must be the seeker
    expect(recipientId).toBe(seekerId);

    ownerClient.close();
  });

  // ─── 4. Pending inquiry → chat denied → no push ──────────────────────────
  it('4. Pending inquiry: chat rejected → no Web Push sent', async () => {
    if (!DB_AVAILABLE) return;

    const ownerClient = makeClient(port, ownerToken);
    await waitForConnect(ownerClient);

    const errorPromise = waitForEvent<any>(ownerClient, 'chat:error', 3000);
    ownerClient.emit('chat:message:send', { inquiryId: pendingInquiryId, content: 'test' });

    await errorPromise;
    await new Promise((r) => setTimeout(r, 100));

    expect(sendPushToUser).not.toHaveBeenCalled();

    ownerClient.close();
  });

  // ─── 5. Rejected inquiry → chat denied → no push ─────────────────────────
  it('5. Rejected inquiry: chat rejected → no Web Push sent', async () => {
    if (!DB_AVAILABLE) return;

    const ownerClient = makeClient(port, ownerToken);
    await waitForConnect(ownerClient);

    const errorPromise = waitForEvent<any>(ownerClient, 'chat:error', 3000);
    ownerClient.emit('chat:message:send', { inquiryId: rejectedInquiryId, content: 'test' });

    await errorPromise;
    await new Promise((r) => setTimeout(r, 100));

    expect(sendPushToUser).not.toHaveBeenCalled();

    ownerClient.close();
  });

  // ─── 6. Cancelled inquiry → chat denied → no push ────────────────────────
  it('6. Cancelled inquiry: chat rejected → no Web Push sent', async () => {
    if (!DB_AVAILABLE) return;

    const ownerClient = makeClient(port, ownerToken);
    await waitForConnect(ownerClient);

    const errorPromise = waitForEvent<any>(ownerClient, 'chat:error', 3000);
    ownerClient.emit('chat:message:send', { inquiryId: cancelledInquiryId, content: 'test' });

    await errorPromise;
    await new Promise((r) => setTimeout(r, 100));

    expect(sendPushToUser).not.toHaveBeenCalled();

    ownerClient.close();
  });

  // ─── 7. Unrelated user → chat denied → no push ───────────────────────────
  it('7. Unrelated user: chat rejected → no Web Push sent', async () => {
    if (!DB_AVAILABLE) return;

    const unrelatedClient = makeClient(port, unrelatedToken);
    await waitForConnect(unrelatedClient);

    const errorPromise = waitForEvent<any>(unrelatedClient, 'chat:error', 3000);
    unrelatedClient.emit('chat:message:send', { inquiryId: acceptedInquiryId, content: 'Sneaky' });

    await errorPromise;
    await new Promise((r) => setTimeout(r, 100));

    expect(sendPushToUser).not.toHaveBeenCalled();

    unrelatedClient.close();
  });

  // ─── 8. Push failure does NOT fail successful chat message ───────────────
  it('8. Push failure does NOT cause a successful chat send to fail', async () => {
    if (!DB_AVAILABLE) return;

    vi.mocked(sendPushToUser).mockRejectedValueOnce(new Error('Push provider unreachable'));

    const ownerClient = makeClient(port, ownerToken);
    await waitForConnect(ownerClient);

    const ack = await sendAndAck(ownerClient, acceptedInquiryId, 'Push will fail but chat succeeds');

    // Chat must still succeed
    expect(ack.success).toBe(true);
    expect(ack.data).toBeDefined();

    // Message was persisted
    const count = await Message.countDocuments({ inquiryId: acceptedInquiryId });
    expect(count).toBe(1);

    ownerClient.close();
  });

  // ─── 9. Correct recipient passed to sendPushToUser ───────────────────────
  it('9. Correct recipientId is passed to sendPushToUser (server-side derivation)', async () => {
    if (!DB_AVAILABLE) return;

    // Owner sends → recipient must be seeker
    const ownerClient = makeClient(port, ownerToken);
    await waitForConnect(ownerClient);

    await sendAndAck(ownerClient, acceptedInquiryId, 'Recipient check');
    await new Promise((r) => setTimeout(r, 100));

    const [recipientId] = (sendPushToUser as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(recipientId).toBe(seekerId);

    ownerClient.close();
    vi.clearAllMocks();

    // Seeker sends → recipient must be owner
    const seekerClient = makeClient(port, seekerToken);
    await waitForConnect(seekerClient);

    await sendAndAck(seekerClient, acceptedInquiryId, 'Recipient check 2');
    await new Promise((r) => setTimeout(r, 100));

    const [recipientId2] = (sendPushToUser as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(recipientId2).toBe(ownerId);

    seekerClient.close();
  });

  // ─── 10. Client-supplied recipientId is ignored ───────────────────────────
  it('10. Client-supplied recipientId / receiverId in payload is ignored', async () => {
    if (!DB_AVAILABLE) return;

    const ownerClient = makeClient(port, ownerToken);
    await waitForConnect(ownerClient);

    // Send with a bogus recipientId field — must be ignored by server
    const ack = await new Promise<any>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('ACK timed out')), 3000);
      ownerClient.emit(
        'chat:message:send',
        {
          inquiryId: acceptedInquiryId,
          content: 'Recipient spoof',
          recipientId: unrelatedId,    // attacker-supplied
          receiverId: unrelatedId,     // alternate field name
        },
        (ack: any) => { clearTimeout(timer); resolve(ack); },
      );
    });

    expect(ack.success).toBe(true);
    await new Promise((r) => setTimeout(r, 100));

    const [recipientId] = (sendPushToUser as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(recipientId).toBe(seekerId);        // correct server-derived recipient
    expect(recipientId).not.toBe(unrelatedId); // attacker's choice is ignored

    ownerClient.close();
  });

  // ─── 11. Exactly one chat message persisted ───────────────────────────────
  it('11. Exactly one DB message is persisted per send event (push does not duplicate)', async () => {
    if (!DB_AVAILABLE) return;

    const ownerClient = makeClient(port, ownerToken);
    await waitForConnect(ownerClient);

    await sendAndAck(ownerClient, acceptedInquiryId, 'Dedup check');
    await new Promise((r) => setTimeout(r, 200));

    const count = await Message.countDocuments({ inquiryId: acceptedInquiryId });
    expect(count).toBe(1);

    ownerClient.close();
  });

  // ─── 12. Existing Socket.io chat:message:new still delivered ─────────────
  it('12. Existing Socket.io chat:message:new is still delivered to recipient alongside push', async () => {
    if (!DB_AVAILABLE) return;

    const ownerClient = makeClient(port, ownerToken);
    const seekerClient = makeClient(port, seekerToken);

    await Promise.all([waitForConnect(ownerClient), waitForConnect(seekerClient)]);

    const recipientEventPromise = waitForEvent<any>(seekerClient, 'chat:message:new', 3000);

    await sendAndAck(ownerClient, acceptedInquiryId, 'Socket coexistence test');

    const eventData = await recipientEventPromise;

    // Socket.io delivery still correct
    expect(eventData.content).toBe('Socket coexistence test');
    expect(eventData.id).toBeDefined();
    expect(eventData).not.toHaveProperty('_id');
    expect(eventData).not.toHaveProperty('__v');

    // Push was also sent (coexistence)
    await new Promise((r) => setTimeout(r, 100));
    expect(sendPushToUser).toHaveBeenCalledOnce();

    ownerClient.close();
    seekerClient.close();
  });

  // ─── 13. Sender does NOT receive chat:message:new socket event ────────────
  it('13. Sender does NOT receive chat:message:new Socket.io event', async () => {
    if (!DB_AVAILABLE) return;

    const ownerClient = makeClient(port, ownerToken);
    const seekerClient = makeClient(port, seekerToken);

    await Promise.all([waitForConnect(ownerClient), waitForConnect(seekerClient)]);

    const senderReceivedPromise = waitForEvent(ownerClient, 'chat:message:new', 800).catch(() => null);
    const recipientReceivedPromise = waitForEvent<any>(seekerClient, 'chat:message:new', 3000);

    ownerClient.emit('chat:message:send', { inquiryId: acceptedInquiryId, content: 'Sender exclusion' });

    const [senderResult, recipientResult] = await Promise.all([senderReceivedPromise, recipientReceivedPromise]);

    expect(senderResult).toBeNull();           // sender did NOT get event back
    expect(recipientResult.content).toBe('Sender exclusion'); // recipient got it

    ownerClient.close();
    seekerClient.close();
  });

  // ─── 14. Existing chat socket tests remain intact (smoke) ─────────────────
  it('14. Core chat flow (accepted inquiry, persist, ACK) still works correctly with push in place', async () => {
    if (!DB_AVAILABLE) return;

    const ownerClient = makeClient(port, ownerToken);
    await waitForConnect(ownerClient);

    // Can send successfully
    const ack = await sendAndAck(ownerClient, acceptedInquiryId, 'Smoke test');
    expect(ack.success).toBe(true);
    expect(ack.data.content).toBe('Smoke test');
    expect(ack.data.senderId).toBe(ownerId);

    // Message stored with correct senderId (never from client)
    const msg = await Message.findOne({ inquiryId: acceptedInquiryId });
    expect(msg).not.toBeNull();
    expect(msg!.senderId.toString()).toBe(ownerId);

    // Push was called once
    await new Promise((r) => setTimeout(r, 100));
    expect(sendPushToUser).toHaveBeenCalledOnce();

    ownerClient.close();
  });
});
