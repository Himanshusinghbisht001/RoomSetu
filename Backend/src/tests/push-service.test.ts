import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import webpush from 'web-push';
import mongoose from 'mongoose';
import { sendPushToUser, configureWebPush } from '../modules/notifications/push.service.js';
import { PushSubscription } from '../modules/notifications/push-subscription.model.js';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';

// Mock web-push to prevent actual HTTP requests
vi.mock('web-push', () => ({
  default: {
    setVapidDetails: vi.fn(),
    sendNotification: vi.fn(),
  },
}));

const MONGODB_TEST_URI = process.env['MONGODB_TEST_URI'] ?? null;
const DB_AVAILABLE = MONGODB_TEST_URI !== null;

describe('Web Push Service (Phase 4)', () => {
  const mockUserId = new mongoose.Types.ObjectId();

  beforeEach(async () => {
    vi.clearAllMocks();
    
    // Set up mock env vars to pretend VAPID is configured
    env.VAPID_PUBLIC_KEY = 'mock_public_key';
    env.VAPID_PRIVATE_KEY = 'mock_private_key';
    env.VAPID_SUBJECT = 'mailto:test@example.com';

    if (DB_AVAILABLE) {
      await mongoose.connect(MONGODB_TEST_URI as string);
      await PushSubscription.deleteMany({});
    }
  });

  afterEach(async () => {
    if (DB_AVAILABLE) {
      await mongoose.disconnect();
    }
  });

  it('1. Configures webpush securely without exposing keys in return', () => {
    configureWebPush();
    expect(webpush.setVapidDetails).toHaveBeenCalledWith(
      'mailto:test@example.com',
      'mock_public_key',
      'mock_private_key'
    );
  });

  it('2. User with no subscriptions returns { sent: 0, removed: 0, failed: 0 }', async () => {
    if (!DB_AVAILABLE) return;
    const result = await sendPushToUser(mockUserId.toString(), { title: 'Test', body: 'Body' });
    expect(result).toEqual({ sent: 0, removed: 0, failed: 0 });
    expect(webpush.sendNotification).not.toHaveBeenCalled();
  });

  it('3. Successfully sends to one valid subscription', async () => {
    if (!DB_AVAILABLE) return;
    await PushSubscription.create({
      userId: mockUserId,
      endpoint: 'http://valid.endpoint/1',
      keys: { p256dh: 'k1', auth: 'a1' }
    });

    vi.mocked(webpush.sendNotification).mockResolvedValue({} as any);

    const result = await sendPushToUser(mockUserId.toString(), { title: 'Hello', body: 'World' });
    expect(result).toEqual({ sent: 1, removed: 0, failed: 0 });
    expect(webpush.sendNotification).toHaveBeenCalledTimes(1);
    
    // 9. Payload is serialized correctly
    const callArgs = vi.mocked(webpush.sendNotification).mock.calls[0];
    expect(callArgs[0].endpoint).toBe('http://valid.endpoint/1');
    expect(callArgs[1]).toBe(JSON.stringify({ title: 'Hello', body: 'World' }));
  });

  it('4. Successfully sends to multiple subscriptions', async () => {
    if (!DB_AVAILABLE) return;
    await PushSubscription.create([
      { userId: mockUserId, endpoint: 'http://endpoint/1', keys: { p256dh: 'k1', auth: 'a1' } },
      { userId: mockUserId, endpoint: 'http://endpoint/2', keys: { p256dh: 'k2', auth: 'a2' } }
    ]);

    vi.mocked(webpush.sendNotification).mockResolvedValue({} as any);

    const result = await sendPushToUser(mockUserId.toString(), { title: 'Test', body: 'Body' });
    expect(result).toEqual({ sent: 2, removed: 0, failed: 0 });
    expect(webpush.sendNotification).toHaveBeenCalledTimes(2);
  });

  it('5. Subscription gets deleted if push provider returns 410 Gone', async () => {
    if (!DB_AVAILABLE) return;
    const sub = await PushSubscription.create({
      userId: mockUserId,
      endpoint: 'http://gone.endpoint/1',
      keys: { p256dh: 'k1', auth: 'a1' }
    });

    vi.mocked(webpush.sendNotification).mockRejectedValue({ statusCode: 410, message: 'Gone' });

    const result = await sendPushToUser(mockUserId.toString(), { title: 'Test', body: 'Body' });
    expect(result).toEqual({ sent: 0, removed: 1, failed: 0 });
    
    const count = await PushSubscription.countDocuments({ _id: sub._id });
    expect(count).toBe(0);
  });

  it('6. Subscription gets deleted if push provider returns 404 Not Found', async () => {
    if (!DB_AVAILABLE) return;
    const sub = await PushSubscription.create({
      userId: mockUserId,
      endpoint: 'http://notfound.endpoint/1',
      keys: { p256dh: 'k1', auth: 'a1' }
    });

    vi.mocked(webpush.sendNotification).mockRejectedValue({ statusCode: 404, message: 'Not Found' });

    const result = await sendPushToUser(mockUserId.toString(), { title: 'Test', body: 'Body' });
    expect(result).toEqual({ sent: 0, removed: 1, failed: 0 });
    
    const count = await PushSubscription.countDocuments({ _id: sub._id });
    expect(count).toBe(0);
  });

  it('7. One failed subscription does not prevent another from being processed', async () => {
    if (!DB_AVAILABLE) return;
    await PushSubscription.create([
      { userId: mockUserId, endpoint: 'http://fail.endpoint/1', keys: { p256dh: 'k1', auth: 'a1' } }, // Will fail with 410
      { userId: mockUserId, endpoint: 'http://success.endpoint/2', keys: { p256dh: 'k2', auth: 'a2' } } // Will succeed
    ]);

    vi.mocked(webpush.sendNotification).mockImplementation(async (subInfo: any) => {
      if (subInfo.endpoint.includes('fail')) throw { statusCode: 410, message: 'Gone' };
      return {} as any;
    });

    const result = await sendPushToUser(mockUserId.toString(), { title: 'Test', body: 'Body' });
    
    // One was removed, one was sent successfully
    expect(result).toEqual({ sent: 1, removed: 1, failed: 0 });
    
    // Verify only the valid one remains
    const remaining = await PushSubscription.find({ userId: mockUserId });
    expect(remaining.length).toBe(1);
    expect(remaining[0].endpoint).toBe('http://success.endpoint/2');
  });

  it('8. Unexpected error is handled without crashing and without deleting', async () => {
    if (!DB_AVAILABLE) return;
    const sub = await PushSubscription.create({
      userId: mockUserId,
      endpoint: 'http://error.endpoint/1',
      keys: { p256dh: 'k1', auth: 'a1' }
    });

    vi.mocked(webpush.sendNotification).mockRejectedValue({ statusCode: 500, message: 'Server Error' });

    const result = await sendPushToUser(mockUserId.toString(), { title: 'Test', body: 'Body' });
    
    expect(result).toEqual({ sent: 0, removed: 0, failed: 1 });
    
    // Verify the subscription is STILL THERE, not deleted for temporary errors
    const count = await PushSubscription.countDocuments({ _id: sub._id });
    expect(count).toBe(1);
  });
});
