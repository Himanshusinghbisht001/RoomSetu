/**
 * Phase 8 — Security Integration Tests
 *
 * Architecture note:
 * - Stateless tests (TEST 1-3): Use supertest against the Express app with NO
 *   database connection. These test pure HTTP validation logic (Zod, errorHandler).
 *
 * - DB-dependent tests (TEST 4-6): Require a running MongoDB. They are skipped
 *   if MONGODB_TEST_URI is not set in the environment. To run them locally, set:
 *   $env:MONGODB_TEST_URI = "mongodb://localhost:27017/roomsetu_test"
 *   These tests clean up their own data and never touch the production database.
 *
 * No real credentials are used or printed anywhere in this file.
 */

import {
  describe,
  it,
  expect,
  beforeAll,
  afterAll,
  afterEach,
} from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import bcryptjs from 'bcryptjs';

import { createApp } from '../app.js';
import { User } from '../modules/users/user.model.js';
import { Room } from '../modules/rooms/room.model.js';
import { generateAccessToken } from '../modules/auth/auth.service.js';

// ── App instance (shared) ─────────────────────────────────────────────────────
const app = createApp();

// ── DB connection state ───────────────────────────────────────────────────────
// Use MONGODB_TEST_URI if provided; otherwise DB tests are skipped.
const TEST_DB_URI = process.env['MONGODB_TEST_URI'] ?? null;
const DB_AVAILABLE = TEST_DB_URI !== null;

if (DB_AVAILABLE) {
  beforeAll(async () => {
    await mongoose.connect(TEST_DB_URI as string);
  }, 30_000);

  afterAll(async () => {
    await mongoose.disconnect();
  });

  afterEach(async () => {
    // Only delete test records created with our sentinel prefix to avoid touching other data.
    await User.deleteMany({ email: /@phase8test\.com$/ });
    await Room.deleteMany({ title: /^\[Phase8\]/ });
  });
}

// ── Helpers (only used when DB is available) ──────────────────────────────────

async function createUserWithToken(
  role: 'seeker' | 'owner',
  email: string,
  name = 'Test User',
) {
  const passwordHash = await bcryptjs.hash('TestPass123!', 10);
  const user = await User.create({ name, email, passwordHash, role });
  const token = generateAccessToken(user);
  return { user, token };
}

// Shared valid room body (title matches /^\[Phase8\]/ for cleanup sentinel)
const testRoom = {
  title: '[Phase8] Spacious Room in Kothrud',
  description: 'A clean and spacious room available for rent near Kothrud bus stop.',
  rent: 8000,
  location: {
    country: 'India',
    state: 'Maharashtra',
    city: 'Pune',
    area: 'Kothrud',
  },
  roomType: 'PG' as const,
  contactNumber: '+919876543210',
};

// =============================================================================
// STATELESS TESTS — No database needed
// =============================================================================

describe('TEST 1: Pagination — limit > 50 returns 400', () => {
  it('GET /api/v1/rooms?limit=51 → 400 VALIDATION_ERROR', async () => {
    const res = await request(app).get('/api/v1/rooms?limit=51');

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('GET /api/v1/rooms?limit=0 → 400 VALIDATION_ERROR', async () => {
    const res = await request(app).get('/api/v1/rooms?limit=0');

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });
});

describe('TEST 2: Invalid sort value returns 400', () => {
  it('GET /api/v1/rooms?sort=invalid_sort → 400 VALIDATION_ERROR', async () => {
    // Valid values per room.schema.ts: newest | oldest | rent_asc | rent_desc
    const res = await request(app).get('/api/v1/rooms?sort=invalid_sort');

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('GET /api/v1/rooms?sort=price → 400 VALIDATION_ERROR', async () => {
    const res = await request(app).get('/api/v1/rooms?sort=price');

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });
});

describe('TEST 3: Malformed ObjectId returns 400 (not 500)', () => {
  it('GET /api/v1/rooms/not-a-valid-object-id → 400', async () => {
    const res = await request(app).get('/api/v1/rooms/not-a-valid-object-id');

    // Must be 400 — not 500 — confirming CastError/Zod is caught and handled
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('GET /api/v1/rooms/12345 → 400', async () => {
    const res = await request(app).get('/api/v1/rooms/12345');

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });
});

// =============================================================================
// DB-DEPENDENT TESTS — Skipped if MONGODB_TEST_URI is not set
// =============================================================================

describe.skipIf(!DB_AVAILABLE)(
  'TEST 3b: Valid but nonexistent ObjectId returns 404 [DB required]',
  () => {
    it('GET /api/v1/rooms/<valid-but-nonexistent-id> → 404', async () => {
      const nonExistentId = new mongoose.Types.ObjectId().toString();
      const res = await request(app).get(`/api/v1/rooms/${nonExistentId}`);

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('NOT_FOUND');
    });
  },
);

describe.skipIf(!DB_AVAILABLE)(
  'TEST 4: Seeker cannot create room [DB required]',
  () => {
    it('POST /api/v1/rooms as seeker → 403 FORBIDDEN', async () => {
      const { token } = await createUserWithToken('seeker', 'seeker@phase8test.com', 'Seeker User');

      const res = await request(app)
        .post('/api/v1/rooms')
        .set('Authorization', `Bearer ${token}`)
        .send(testRoom);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('POST /api/v1/rooms with no token → 401', async () => {
      const res = await request(app).post('/api/v1/rooms').send(testRoom);

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });
  },
);

describe.skipIf(!DB_AVAILABLE)(
  "TEST 5: Owner B cannot modify/delete Owner A's room [DB required]",
  () => {
    it('PATCH /api/v1/rooms/:id by non-owner → 404 (IDOR protection)', async () => {
      const ownerA = await createUserWithToken('owner', 'ownera@phase8test.com', 'Owner A');
      const ownerB = await createUserWithToken('owner', 'ownerb@phase8test.com', 'Owner B');

      const room = await Room.create({
        ownerId: ownerA.user._id,
        ...testRoom,
        availability: 'Available',
      });

      const res = await request(app)
        .patch(`/api/v1/rooms/${room._id.toString()}`)
        .set('Authorization', `Bearer ${ownerB.token}`)
        .send({ title: '[Phase8] Hacked Title Long Enough Here' });

      // assertOwnership returns 404 — does NOT reveal room exists to unauthorized caller
      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });

    it('DELETE /api/v1/rooms/:id by non-owner → 404 (IDOR protection)', async () => {
      const ownerA = await createUserWithToken('owner', 'ownera2@phase8test.com', 'Owner A2');
      const ownerB = await createUserWithToken('owner', 'ownerb2@phase8test.com', 'Owner B2');

      const room = await Room.create({
        ownerId: ownerA.user._id,
        ...testRoom,
        availability: 'Available',
      });

      const res = await request(app)
        .delete(`/api/v1/rooms/${room._id.toString()}`)
        .set('Authorization', `Bearer ${ownerB.token}`);

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });
  },
);

describe.skipIf(!DB_AVAILABLE)(
  'TEST 6: Soft-deleted room is inaccessible publicly [DB required]',
  () => {
    it('public GET of a deleted room returns 404', async () => {
      const owner = await createUserWithToken('owner', 'owner_del@phase8test.com', 'Del Owner');

      const room = await Room.create({
        ownerId: owner.user._id,
        ...testRoom,
        title: '[Phase8] Room To Delete',
        availability: 'Available',
      });

      // Soft-delete via the real API endpoint
      const deleteRes = await request(app)
        .delete(`/api/v1/rooms/${room._id.toString()}`)
        .set('Authorization', `Bearer ${owner.token}`);

      expect(deleteRes.status).toBe(200);

      // Public GET should now return 404
      const getRes = await request(app).get(`/api/v1/rooms/${room._id.toString()}`);
      expect(getRes.status).toBe(404);
      expect(getRes.body.success).toBe(false);
      expect(getRes.body.error.code).toBe('NOT_FOUND');
    });

    it('deleted room is excluded from public listing', async () => {
      const owner = await createUserWithToken('owner', 'owner_list@phase8test.com', 'List Owner');

      const room1 = await Room.create({
        ownerId: owner.user._id,
        ...testRoom,
        title: '[Phase8] Room One Will Be Deleted',
        description: 'First room description that is long enough for the validator to accept it here.',
        availability: 'Available',
      });

      await Room.create({
        ownerId: owner.user._id,
        ...testRoom,
        title: '[Phase8] Room Two Stays Active',
        description: 'Second room description that is long enough for the validator to accept it.',
        availability: 'Available',
      });

      // Soft-delete room1 via API
      await request(app)
        .delete(`/api/v1/rooms/${room1._id.toString()}`)
        .set('Authorization', `Bearer ${owner.token}`);

      // Public listing must exclude the deleted room
      const listRes = await request(app).get('/api/v1/rooms');
      expect(listRes.status).toBe(200);
      expect(listRes.body.success).toBe(true);

      const returnedIds = (listRes.body.data as Array<{ _id?: string; id?: string }>).map(
        (r) => r._id ?? r.id,
      );
      expect(returnedIds).not.toContain(room1._id.toString());
      expect(listRes.body.data).toHaveLength(1);
    });
  },
);
