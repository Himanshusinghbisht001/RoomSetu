import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import { createApp } from '../app.js';
import { User } from '../modules/users/user.model.js';
import { Room } from '../modules/rooms/room.model.js';
import { RefreshSession } from '../modules/auth/refreshSession.model.js';
import { env } from '../config/env.js';
import bcryptjs from 'bcryptjs';

// ---------------------------------------------------------------------------
// MONGODB_TEST_URI is intentionally NOT part of the production Zod env schema.
// Read it directly from process.env so env.ts validation is not affected.
// ---------------------------------------------------------------------------
const MONGODB_TEST_URI = process.env['MONGODB_TEST_URI'] ?? null;
const DB_AVAILABLE = MONGODB_TEST_URI !== null;

describe('Phase 11: Advanced Production Security', () => {
  const app = createApp();
  let server: ReturnType<typeof app.listen>;
  let testUser: InstanceType<typeof User>;
  let accessToken: string;
  let sessionId: string;

  beforeAll(async () => {
    if (!DB_AVAILABLE) {
      console.warn('Skipping Phase 11 tests: MONGODB_TEST_URI is not set');
      return;
    }

    await mongoose.connect(MONGODB_TEST_URI as string);
    await mongoose.connection.dropDatabase();

    server = app.listen(0);

    const salt = await bcryptjs.genSalt(10);
    const passwordHash = await bcryptjs.hash('password123', salt);

    testUser = await User.create({
      name: 'Phase 11 User',
      email: 'phase11@test.com',
      passwordHash,
      role: 'owner',
    });
  });

  afterAll(async () => {
    if (server) {
      server.close();
    }
    if (DB_AVAILABLE) {
      await mongoose.disconnect();
    }
  });

  // -- 1. Account Lockout -------------------------------------------------------

  describe('1. Account Lockout', () => {
    beforeEach(async () => {
      if (!DB_AVAILABLE) return;
      // Reset lockout state so each test starts clean
      await User.updateOne(
        { email: 'phase11@test.com' },
        { failedLoginAttempts: 0, lockedUntil: null },
      );
    });

    it('should lock account after max failed attempts', async () => {
      if (!DB_AVAILABLE) return;

      for (let i = 0; i < env.AUTH_MAX_FAILED_ATTEMPTS; i++) {
        await request(server)
          .post('/api/v1/auth/login')
          .send({ email: 'phase11@test.com', password: 'wrong' });
      }

      // Correct password, but account should now be locked
      const res = await request(server)
        .post('/api/v1/auth/login')
        .send({ email: 'phase11@test.com', password: 'password123' });

      expect(res.status).toBe(401);

      const user = await User.findOne({ email: 'phase11@test.com' });
      expect(user!.failedLoginAttempts).toBeGreaterThanOrEqual(env.AUTH_MAX_FAILED_ATTEMPTS);
      expect(user!.lockedUntil).not.toBeNull();
      expect(user!.lockedUntil!.getTime()).toBeGreaterThan(Date.now());
    });

    it('should reset failed attempts on successful login', async () => {
      if (!DB_AVAILABLE) return;

      // One bad attempt followed by a correct one
      await request(server)
        .post('/api/v1/auth/login')
        .send({ email: 'phase11@test.com', password: 'wrong' });

      const res = await request(server)
        .post('/api/v1/auth/login')
        .send({ email: 'phase11@test.com', password: 'password123' });

      expect(res.status).toBe(200);
      // Login response shape: { success: true, data: { user, accessToken } }
      accessToken = res.body.data.accessToken;
      expect(accessToken).toBeDefined();

      const user = await User.findOne({ email: 'phase11@test.com' });
      expect(user!.failedLoginAttempts).toBe(0);
      expect(user!.lockedUntil).toBeNull();
    });
  });

  // -- 2. Session Management ---------------------------------------------------

  describe('2. Session Management', () => {
    it('should return active sessions without exposing sensitive hashes', async () => {
      if (!DB_AVAILABLE) return;

      const res = await request(server)
        .get('/api/v1/sessions')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThan(0);
      // refreshTokenHash must never appear in session API responses
      expect(res.body.data[0].refreshTokenHash).toBeUndefined();

      sessionId = res.body.data[0].id;
    });

    it('should safely revoke a specific session belonging to the authenticated user', async () => {
      if (!DB_AVAILABLE) return;

      const res = await request(server)
        .delete(`/api/v1/sessions/${sessionId}`)
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(200);

      const session = await RefreshSession.findById(sessionId);
      expect(session!.revokedAt).not.toBeNull();
    });

    it("should prevent User A from revoking User B's session (IDOR protection)", async () => {
      if (!DB_AVAILABLE) return;

      // Create User B with their own session directly in the DB
      const salt = await bcryptjs.genSalt(10);
      const passwordHash = await bcryptjs.hash('passwordB123', salt);
      const userB = await User.create({
        name: 'Phase 11 User B',
        email: 'phase11b@test.com',
        passwordHash,
        role: 'seeker',
      });

      const sessionB = await RefreshSession.create({
        userId: userB._id,
        // Realistic-looking hash value; never a real token
        refreshTokenHash: 'aabbccddeeff00112233445566778899aabbccddeeff00112233445566778899',
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      });

      // Log in as testUser (User A) to obtain a fresh access token
      const loginRes = await request(server)
        .post('/api/v1/auth/login')
        .send({ email: 'phase11@test.com', password: 'password123' });

      const tokenA = loginRes.body.data.accessToken;
      expect(tokenA).toBeDefined();

      // User A attempts to revoke User B's session
      const res = await request(server)
        .delete(`/api/v1/sessions/${sessionB._id.toString()}`)
        .set('Authorization', `Bearer ${tokenA}`);

      // IDOR-safe: returns 404 rather than 403 so the caller cannot infer
      // whether the session exists at all.
      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);

      // Verify Session B was not touched
      const untouched = await RefreshSession.findById(sessionB._id);
      expect(untouched).not.toBeNull();
      expect(untouched!.revokedAt).toBeNull();

      // Cleanup ancillary data created inside this test only
      await User.deleteOne({ _id: userB._id });
      await RefreshSession.deleteOne({ _id: sessionB._id });
    });
  });

  // -- 3. Full-Text Search -----------------------------------------------------

  describe('3. Full-Text Search', () => {
    it('should perform a $text search and return matching rooms', async () => {
      if (!DB_AVAILABLE) return;

      await Room.create({
        ownerId: testUser._id,
        title: 'Beautiful Sunny Apartment',
        description: 'A great place with lots of natural light and open space.',
        rent: 1500,
        location: { country: 'IN', state: 'DL', city: 'Delhi', area: 'South' },
        roomType: 'Single',
        contactNumber: '1234567890',
      });

      // Public GET -- no auth required.
      // Response shape: { success, data: Room[], pagination: { total, ... } }
      const res = await request(server).get('/api/v1/rooms?search=Sunny');
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThan(0);
      const titles = (res.body.data as Array<{ title: string }>).map((r) => r.title);
      expect(titles.some((t) => t.includes('Sunny'))).toBe(true);
    });

    it('should return empty results when no rooms match the search term', async () => {
      if (!DB_AVAILABLE) return;

      const res = await request(server).get(
        '/api/v1/rooms?search=xyzuniquenonsenseterm999abc',
      );
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBe(0);
      expect(res.body.pagination.total).toBe(0);
    });

    it('should apply $text search combined with a roomType filter', async () => {
      if (!DB_AVAILABLE) return;

      // Create a PG room with a unique keyword in its title
      await Room.create({
        ownerId: testUser._id,
        title: 'Lagoon View PG Accommodation',
        description: 'Comfortable PG room near the university campus for students.',
        rent: 2000,
        location: { country: 'IN', state: 'MH', city: 'Pune', area: 'Kothrud' },
        roomType: 'PG',
        contactNumber: '9876543210',
      });

      // Search + matching roomType -- must return the PG room
      const matchRes = await request(server).get(
        '/api/v1/rooms?search=Lagoon&roomType=PG',
      );
      expect(matchRes.status).toBe(200);
      expect(matchRes.body.data.length).toBeGreaterThan(0);
      const matchTitles = (matchRes.body.data as Array<{ title: string }>).map(
        (r) => r.title,
      );
      expect(matchTitles.some((t) => t.includes('Lagoon'))).toBe(true);

      // Same keyword but wrong roomType -- filter should exclude the PG room
      const noMatchRes = await request(server).get(
        '/api/v1/rooms?search=Lagoon&roomType=Single',
      );
      expect(noMatchRes.status).toBe(200);
      expect(noMatchRes.body.data.length).toBe(0);
    });
  });

  // -- 4. GDPR Export ----------------------------------------------------------

  describe('4. GDPR Export', () => {
    it('should export all user data excluding sensitive and internal fields', async () => {
      if (!DB_AVAILABLE) return;

      // Obtain a fresh token -- the accessToken from section 1 is still a valid
      // JWT, but log in again here to keep this section self-contained.
      const loginRes = await request(server)
        .post('/api/v1/auth/login')
        .send({ email: 'phase11@test.com', password: 'password123' });
      const freshToken = loginRes.body.data.accessToken;
      expect(freshToken).toBeDefined();

      const res = await request(server)
        .get('/api/v1/users/me/export')
        .set('Authorization', `Bearer ${freshToken}`);

      expect(res.status).toBe(200);

      // Security-sensitive fields must not appear in the exported profile
      expect(res.body.data.profile.passwordHash).toBeUndefined();
      expect(res.body.data.profile.failedLoginAttempts).toBeUndefined();
      expect(res.body.data.profile.lockedUntil).toBeUndefined();
      // Mongoose internal version key must also be excluded (Fix #6)
      expect(res.body.data.profile.__v).toBeUndefined();

      // Non-sensitive profile fields must be present
      expect(res.body.data.profile.email).toBe('phase11@test.com');

      // Export must include room and session collections
      expect(Array.isArray(res.body.data.rooms)).toBe(true);
      expect(Array.isArray(res.body.data.sessions)).toBe(true);

      // refreshTokenHash must be absent from every exported session
      (res.body.data.sessions as Array<Record<string, unknown>>).forEach((s) => {
        expect(s['refreshTokenHash']).toBeUndefined();
      });
    });
  });

  // -- 5. Soft Account Deletion ------------------------------------------------

  describe('5. Soft Account Deletion', () => {
    it('should reject deletion without the correct confirmation string', async () => {
      if (!DB_AVAILABLE) return;

      const loginRes = await request(server)
        .post('/api/v1/auth/login')
        .send({ email: 'phase11@test.com', password: 'password123' });
      const freshToken = loginRes.body.data.accessToken;

      const res = await request(server)
        .delete('/api/v1/users/me')
        .set('Authorization', `Bearer ${freshToken}`)
        .send({ confirmation: 'wrong' });

      expect(res.status).toBe(400);
    });

    it('should soft-delete the account, revoke all sessions, and soft-delete owned rooms', async () => {
      if (!DB_AVAILABLE) return;

      const loginRes = await request(server)
        .post('/api/v1/auth/login')
        .send({ email: 'phase11@test.com', password: 'password123' });
      const freshToken = loginRes.body.data.accessToken;

      const res = await request(server)
        .delete('/api/v1/users/me')
        .set('Authorization', `Bearer ${freshToken}`)
        .send({ confirmation: 'DELETE' });

      expect(res.status).toBe(200);

      // User must be soft-deleted, NOT hard-deleted
      const user = await User.findById(testUser._id);
      expect(user).not.toBeNull();          // record still exists in DB
      expect(user!.isDeleted).toBe(true);
      expect(user!.deletedAt).not.toBeNull();

      // All rooms owned by this user must be soft-deleted
      const rooms = await Room.find({ ownerId: testUser._id });
      rooms.forEach((r) => {
        expect(r.isDeleted).toBe(true);
        expect(r.deletedAt).not.toBeNull();
      });

      // No active (non-revoked) sessions must remain
      const activeSessions = await RefreshSession.find({
        userId: testUser._id,
        revokedAt: null,
      });
      expect(activeSessions.length).toBe(0);
    });

    it('should prevent a soft-deleted user from authenticating', async () => {
      if (!DB_AVAILABLE) return;

      const res = await request(server)
        .post('/api/v1/auth/login')
        .send({ email: 'phase11@test.com', password: 'password123' });

      expect(res.status).toBe(401);
    });
  });
});
