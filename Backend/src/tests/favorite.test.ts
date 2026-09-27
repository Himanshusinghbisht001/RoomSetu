import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import { createApp } from '../app.js';
import { User } from '../modules/users/user.model.js';
import { Room } from '../modules/rooms/room.model.js';
import { Favorite } from '../modules/favorites/favorite.model.js';
import { generateAccessToken } from '../modules/auth/auth.service.js';

const MONGODB_TEST_URI = process.env['MONGODB_TEST_URI'] ?? null;
const DB_AVAILABLE = MONGODB_TEST_URI !== null;

describe('Favorites API', () => {
  const app = createApp();
  let seekerToken: string;
  let seekerBToken: string;
  let ownerToken: string;
  let roomId: string;
  let deletedRoomId: string;

  beforeAll(async () => {
    if (!DB_AVAILABLE) {
      console.warn('Skipping favorite tests: MONGODB_TEST_URI is not set');
      return;
    }

    await mongoose.connect(MONGODB_TEST_URI as string);
    await mongoose.connection.dropDatabase();

    // Create seeker A
    const seekerA = await User.create({
      name: 'Seeker A',
      email: 'seekera@test.com',
      passwordHash: '$2a$10$dummyhash1234567890123',
      role: 'seeker',
    });
    seekerToken = generateAccessToken(seekerA);

    // Create seeker B
    const seekerB = await User.create({
      name: 'Seeker B',
      email: 'seekerb@test.com',
      passwordHash: '$2a$10$dummyhash1234567890123',
      role: 'seeker',
    });
    seekerBToken = generateAccessToken(seekerB);

    // Create owner
    const owner = await User.create({
      name: 'Owner',
      email: 'owner@test.com',
      passwordHash: '$2a$10$dummyhash1234567890123',
      role: 'owner',
    });
    ownerToken = generateAccessToken(owner);

    // Create an active room
    const room = await Room.create({
      ownerId: owner._id,
      title: 'Test Room For Favorites',
      description: 'A long enough description for a test room to pass validation.',
      rent: 5000,
      location: { country: 'India', state: 'Uttarakhand', city: 'Nainital', area: 'Mallital' },
      roomType: 'Single',
      contactNumber: '9876543210',
    });
    roomId = room._id.toString();

    // Create a soft-deleted room
    const deletedRoom = await Room.create({
      ownerId: owner._id,
      title: 'Deleted Room For Test',
      description: 'A room that is soft-deleted and should not be favoriteable.',
      rent: 3000,
      location: { country: 'India', state: 'Uttarakhand', city: 'Nainital', area: 'Tallital' },
      roomType: 'Double',
      contactNumber: '9876543211',
      isDeleted: true,
      deletedAt: new Date(),
    });
    deletedRoomId = deletedRoom._id.toString();
  });

  afterAll(async () => {
    if (!DB_AVAILABLE) return;
    await mongoose.disconnect();
  });

  // ── Test 5: Unauthenticated user receives 401 ─────────────────────────────
  describe('Authorization', () => {
    it('unauthenticated user receives 401 for POST /favorites/:roomId', async () => {
      if (!DB_AVAILABLE) return;
      const res = await request(app).post(`/api/v1/favorites/${roomId}`);
      expect(res.status).toBe(401);
    });

    it('unauthenticated user receives 401 for GET /favorites', async () => {
      if (!DB_AVAILABLE) return;
      const res = await request(app).get('/api/v1/favorites');
      expect(res.status).toBe(401);
    });

    it('unauthenticated user receives 401 for DELETE /favorites/:roomId', async () => {
      if (!DB_AVAILABLE) return;
      const res = await request(app).delete(`/api/v1/favorites/${roomId}`);
      expect(res.status).toBe(401);
    });

    // ── Test 6: Owner receives 403 ────────────────────────────────────────
    it('owner receives 403 for POST /favorites/:roomId', async () => {
      if (!DB_AVAILABLE) return;
      const res = await request(app)
        .post(`/api/v1/favorites/${roomId}`)
        .set('Authorization', `Bearer ${ownerToken}`);
      expect(res.status).toBe(403);
    });

    it('owner receives 403 for GET /favorites', async () => {
      if (!DB_AVAILABLE) return;
      const res = await request(app)
        .get('/api/v1/favorites')
        .set('Authorization', `Bearer ${ownerToken}`);
      expect(res.status).toBe(403);
    });

    // ── Test 13: Owner cannot check favorites ─────────────────────────────
    it('owner receives 403 for GET /favorites/check/:roomId', async () => {
      if (!DB_AVAILABLE) return;
      const res = await request(app)
        .get(`/api/v1/favorites/check/${roomId}`)
        .set('Authorization', `Bearer ${ownerToken}`);
      expect(res.status).toBe(403);
    });
  });

  // ── Test 7: Nonexistent room cannot be favorited ──────────────────────────
  describe('Validation', () => {
    it('rejects favoriting a nonexistent room', async () => {
      if (!DB_AVAILABLE) return;
      const fakeId = new mongoose.Types.ObjectId().toString();
      const res = await request(app)
        .post(`/api/v1/favorites/${fakeId}`)
        .set('Authorization', `Bearer ${seekerToken}`);
      expect(res.status).toBe(404);
    });

    // ── Test 8: Soft-deleted room cannot be favorited ─────────────────────
    it('rejects favoriting a soft-deleted room', async () => {
      if (!DB_AVAILABLE) return;
      const res = await request(app)
        .post(`/api/v1/favorites/${deletedRoomId}`)
        .set('Authorization', `Bearer ${seekerToken}`);
      expect(res.status).toBe(400);
    });

    it('rejects invalid roomId format', async () => {
      if (!DB_AVAILABLE) return;
      const res = await request(app)
        .post('/api/v1/favorites/not-a-valid-id')
        .set('Authorization', `Bearer ${seekerToken}`);
      expect(res.status).toBe(400);
    });
  });

  // ── Core Favorites Flow ───────────────────────────────────────────────────
  describe('Core Favorites Operations', () => {
    // ── Test 11: Favorite check returns false before any favorite ─────────
    it('check returns isFavorite: false before favoriting', async () => {
      if (!DB_AVAILABLE) return;
      const res = await request(app)
        .get(`/api/v1/favorites/check/${roomId}`)
        .set('Authorization', `Bearer ${seekerToken}`);
      expect(res.status).toBe(200);
      expect(res.body.data.isFavorite).toBe(false);
    });

    // ── Test 1: Authenticated seeker can favorite a valid room ────────────
    it('authenticated seeker can favorite a valid room', async () => {
      if (!DB_AVAILABLE) return;
      const res = await request(app)
        .post(`/api/v1/favorites/${roomId}`)
        .set('Authorization', `Bearer ${seekerToken}`);
      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
    });

    // ── Test 11: Favorite check returns true after favoriting ─────────────
    it('check returns isFavorite: true after favoriting', async () => {
      if (!DB_AVAILABLE) return;
      const res = await request(app)
        .get(`/api/v1/favorites/check/${roomId}`)
        .set('Authorization', `Bearer ${seekerToken}`);
      expect(res.status).toBe(200);
      expect(res.body.data.isFavorite).toBe(true);
    });

    // ── Test 9: Duplicate favorite does not create duplicate records ───────
    it('favoriting same room twice is idempotent (no duplicates)', async () => {
      if (!DB_AVAILABLE) return;
      const res = await request(app)
        .post(`/api/v1/favorites/${roomId}`)
        .set('Authorization', `Bearer ${seekerToken}`);
      expect(res.status).toBe(201);

      const count = await Favorite.countDocuments({ room: roomId });
      expect(count).toBe(1);
    });

    // ── Test 2: Authenticated seeker can fetch favorites ──────────────────
    it('authenticated seeker can fetch their favorites', async () => {
      if (!DB_AVAILABLE) return;
      const res = await request(app)
        .get('/api/v1/favorites')
        .set('Authorization', `Bearer ${seekerToken}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeInstanceOf(Array);
      expect(res.body.data).toHaveLength(1);
    });

    // ── Test 4: Seeker A cannot see Seeker B's favorites ──────────────────
    it('seeker B sees empty favorites (isolation from seeker A)', async () => {
      if (!DB_AVAILABLE) return;
      const res = await request(app)
        .get('/api/v1/favorites')
        .set('Authorization', `Bearer ${seekerBToken}`);
      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(0);
    });

    // ── Test 14: Client cannot manipulate another user's favorites ─────────
    it('seeker B cannot remove seeker A favorite even with valid roomId', async () => {
      if (!DB_AVAILABLE) return;
      // Seeker B tries to remove the room from favorites — it simply won't exist for them
      const res = await request(app)
        .delete(`/api/v1/favorites/${roomId}`)
        .set('Authorization', `Bearer ${seekerBToken}`);
      // Removal is idempotent — 200 but nothing changes for seeker A
      expect(res.status).toBe(200);

      // Seeker A's favorite should still exist
      const fav = await Favorite.findOne({ room: roomId });
      expect(fav).not.toBeNull();
    });

    // ── Test 3: Authenticated seeker can unfavorite ────────────────────────
    it('authenticated seeker can unfavorite a room', async () => {
      if (!DB_AVAILABLE) return;
      const res = await request(app)
        .delete(`/api/v1/favorites/${roomId}`)
        .set('Authorization', `Bearer ${seekerToken}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const count = await Favorite.countDocuments({ room: roomId });
      expect(count).toBe(0);
    });

    // ── Test 12: Favorite check returns false after unfavorite ────────────
    it('check returns isFavorite: false after unfavoriting', async () => {
      if (!DB_AVAILABLE) return;
      const res = await request(app)
        .get(`/api/v1/favorites/check/${roomId}`)
        .set('Authorization', `Bearer ${seekerToken}`);
      expect(res.status).toBe(200);
      expect(res.body.data.isFavorite).toBe(false);
    });
  });

  // ── Test 10: Soft-deleted rooms don't appear in GET /favorites ─────────────
  describe('Soft Delete Handling', () => {
    it('soft-deleted favorited room does not appear in GET /favorites', async () => {
      if (!DB_AVAILABLE) return;

      // Create a fresh room, favorite it, then soft-delete it
      const owner = await User.findOne({ role: 'owner' });
      const tempRoom = await Room.create({
        ownerId: owner!._id,
        title: 'Temp Room To Be Deleted',
        description: 'A temporary room that will be soft-deleted after favoriting.',
        rent: 4000,
        location: { country: 'India', state: 'Uttarakhand', city: 'Nainital', area: 'Khurpatal' },
        roomType: 'PG',
        contactNumber: '9999999999',
      });
      const tempRoomId = tempRoom._id.toString();

      // Favorite it
      await request(app)
        .post(`/api/v1/favorites/${tempRoomId}`)
        .set('Authorization', `Bearer ${seekerToken}`);

      // Soft-delete the room directly in DB
      await Room.findByIdAndUpdate(tempRoomId, { isDeleted: true, deletedAt: new Date() });

      // Favorites list should not include the deleted room
      const res = await request(app)
        .get('/api/v1/favorites')
        .set('Authorization', `Bearer ${seekerToken}`);
      expect(res.status).toBe(200);
      const ids = res.body.data.map((r: any) => r._id || r.id);
      expect(ids).not.toContain(tempRoomId);
    });
  });
});
