import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import { createApp } from '../app.js';
import { User } from '../modules/users/user.model.js';
import { PushSubscription } from '../modules/notifications/push-subscription.model.js';
import bcryptjs from 'bcryptjs';

const MONGODB_TEST_URI = process.env['MONGODB_TEST_URI'] ?? null;
const DB_AVAILABLE = MONGODB_TEST_URI !== null;

describe('Web Push Notifications Feature', () => {
  const app = createApp();
  let server: ReturnType<typeof app.listen>;
  
  let user1Token: string;
  let user2Token: string;
  
  let user1Id: string;
  let user2Id: string;

  const sampleEndpoint = 'https://fcm.googleapis.com/fcm/send/fake-endpoint-123';
  const sampleEndpoint2 = 'https://fcm.googleapis.com/fcm/send/fake-endpoint-456';
  
  const sampleKeys = {
    p256dh: 'fake-p256dh-key',
    auth: 'fake-auth-key'
  };

  beforeAll(async () => {
    if (!DB_AVAILABLE) {
      console.warn('Skipping notification tests: MONGODB_TEST_URI is not set');
      return;
    }

    await mongoose.connect(MONGODB_TEST_URI as string);
    await mongoose.connection.dropDatabase();
    server = app.listen(0);

    const salt = await bcryptjs.genSalt(10);
    const passwordHash = await bcryptjs.hash('password123', salt);

    const user1 = await User.create({ name: 'User 1', email: 'user1@test.com', passwordHash, role: 'seeker' });
    const user2 = await User.create({ name: 'User 2', email: 'user2@test.com', passwordHash, role: 'seeker' });

    user1Id = user1._id.toString();
    user2Id = user2._id.toString();

    const login = async (email: string) => {
      const res = await request(server).post('/api/v1/auth/login').send({ email, password: 'password123' });
      return res.body.data.accessToken;
    };

    user1Token = await login('user1@test.com');
    user2Token = await login('user2@test.com');
  });

  afterAll(async () => {
    if (server) server.close();
    if (DB_AVAILABLE) await mongoose.disconnect();
  });

  beforeEach(async () => {
    if (!DB_AVAILABLE) return;
    await PushSubscription.deleteMany({});
  });

  // 1. Authenticated user can subscribe.
  it('1. Authenticated user can subscribe', async () => {
    if (!DB_AVAILABLE) return;
    const res = await request(server)
      .post('/api/v1/notifications/subscribe')
      .set('Authorization', `Bearer ${user1Token}`)
      .send({ endpoint: sampleEndpoint, keys: sampleKeys });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.endpoint).toBe(sampleEndpoint);
    
    // Ensure JWT or internal ids aren't exposed unnecessarily (user ID shouldn't be exposed directly to client from create, just id/endpoint)
    expect(res.body.data.passwordHash).toBeUndefined();
  });

  // 2. Unauthenticated user cannot subscribe.
  it('2. Unauthenticated user cannot subscribe', async () => {
    if (!DB_AVAILABLE) return;
    const res = await request(server)
      .post('/api/v1/notifications/subscribe')
      .send({ endpoint: sampleEndpoint, keys: sampleKeys });

    expect(res.status).toBe(401);
  });

  // 3. Authenticated user can update an existing endpoint without creating a duplicate.
  // 10. Same endpoint remains unique.
  it('3. Authenticated user can update an existing endpoint without creating a duplicate', async () => {
    if (!DB_AVAILABLE) return;
    // Create first time
    await request(server)
      .post('/api/v1/notifications/subscribe')
      .set('Authorization', `Bearer ${user1Token}`)
      .send({ endpoint: sampleEndpoint, keys: sampleKeys });
      
    // Update (same endpoint, maybe new device/keys)
    const res = await request(server)
      .post('/api/v1/notifications/subscribe')
      .set('Authorization', `Bearer ${user1Token}`)
      .send({ endpoint: sampleEndpoint, keys: { ...sampleKeys, auth: 'new-auth' }, device: 'mobile' });

    expect(res.status).toBe(200);
    
    // Check DB count
    const count = await PushSubscription.countDocuments({ endpoint: sampleEndpoint });
    expect(count).toBe(1);
  });

  // 4. Authenticated user can unsubscribe their own endpoint.
  it('4. Authenticated user can unsubscribe their own endpoint', async () => {
    if (!DB_AVAILABLE) return;
    await request(server)
      .post('/api/v1/notifications/subscribe')
      .set('Authorization', `Bearer ${user1Token}`)
      .send({ endpoint: sampleEndpoint, keys: sampleKeys });
      
    const res = await request(server)
      .delete('/api/v1/notifications/unsubscribe')
      .set('Authorization', `Bearer ${user1Token}`)
      .send({ endpoint: sampleEndpoint });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    
    const count = await PushSubscription.countDocuments({ endpoint: sampleEndpoint });
    expect(count).toBe(0);
  });

  // 5. User cannot unsubscribe another user's endpoint.
  it('5. User cannot unsubscribe another users endpoint', async () => {
    if (!DB_AVAILABLE) return;
    await request(server)
      .post('/api/v1/notifications/subscribe')
      .set('Authorization', `Bearer ${user1Token}`)
      .send({ endpoint: sampleEndpoint, keys: sampleKeys });
      
    const res = await request(server)
      .delete('/api/v1/notifications/unsubscribe')
      .set('Authorization', `Bearer ${user2Token}`)
      .send({ endpoint: sampleEndpoint });

    expect(res.status).toBe(403);
    
    const count = await PushSubscription.countDocuments({ endpoint: sampleEndpoint });
    expect(count).toBe(1);
  });

  // 6. Invalid/missing endpoint rejected.
  it('6. Invalid/missing endpoint rejected', async () => {
    if (!DB_AVAILABLE) return;
    const res = await request(server)
      .post('/api/v1/notifications/subscribe')
      .set('Authorization', `Bearer ${user1Token}`)
      .send({ keys: sampleKeys });

    expect(res.status).toBe(400);
  });

  // 7. Missing p256dh rejected.
  it('7. Missing p256dh rejected', async () => {
    if (!DB_AVAILABLE) return;
    const res = await request(server)
      .post('/api/v1/notifications/subscribe')
      .set('Authorization', `Bearer ${user1Token}`)
      .send({ endpoint: sampleEndpoint, keys: { auth: 'fake' } });

    expect(res.status).toBe(400);
  });

  // 8. Missing auth rejected.
  it('8. Missing auth rejected', async () => {
    if (!DB_AVAILABLE) return;
    const res = await request(server)
      .post('/api/v1/notifications/subscribe')
      .set('Authorization', `Bearer ${user1Token}`)
      .send({ endpoint: sampleEndpoint, keys: { p256dh: 'fake' } });

    expect(res.status).toBe(400);
  });

  // 9. Different users can have different endpoints.
  it('9. Different users can have different endpoints', async () => {
    if (!DB_AVAILABLE) return;
    await request(server)
      .post('/api/v1/notifications/subscribe')
      .set('Authorization', `Bearer ${user1Token}`)
      .send({ endpoint: sampleEndpoint, keys: sampleKeys });
      
    await request(server)
      .post('/api/v1/notifications/subscribe')
      .set('Authorization', `Bearer ${user2Token}`)
      .send({ endpoint: sampleEndpoint2, keys: sampleKeys });

    const count = await PushSubscription.countDocuments();
    expect(count).toBe(2);
  });
});
