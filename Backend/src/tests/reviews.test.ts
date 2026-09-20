import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import { createApp } from '../app.js';
import { User } from '../modules/users/user.model.js';
import { Room } from '../modules/rooms/room.model.js';
import { Review } from '../modules/reviews/review.model.js';
import bcryptjs from 'bcryptjs';

const MONGODB_TEST_URI = process.env['MONGODB_TEST_URI'] ?? null;
const DB_AVAILABLE = MONGODB_TEST_URI !== null;

describe('Reviews & Comments Feature', () => {
  const app = createApp();
  let server: ReturnType<typeof app.listen>;
  
  let ownerToken: string;
  let seeker1Token: string;
  let seeker2Token: string;
  
  let ownerId: string;
  let seeker1Id: string;
  let seeker2Id: string;
  
  let roomId: string;
  let reviewId: string;

  beforeAll(async () => {
    if (!DB_AVAILABLE) {
      console.warn('Skipping review tests: MONGODB_TEST_URI is not set');
      return;
    }

    await mongoose.connect(MONGODB_TEST_URI as string);
    await mongoose.connection.dropDatabase();
    server = app.listen(0);

    const salt = await bcryptjs.genSalt(10);
    const passwordHash = await bcryptjs.hash('password123', salt);

    // Create users
    const owner = await User.create({ name: 'Owner', email: 'owner@test.com', passwordHash, role: 'owner' });
    const seeker1 = await User.create({ name: 'Seeker 1', email: 'seeker1@test.com', passwordHash, role: 'seeker' });
    const seeker2 = await User.create({ name: 'Seeker 2', email: 'seeker2@test.com', passwordHash, role: 'seeker' });

    ownerId = owner._id.toString();
    seeker1Id = seeker1._id.toString();
    seeker2Id = seeker2._id.toString();

    // Login users to get tokens
    const login = async (email: string) => {
      const res = await request(server).post('/api/v1/auth/login').send({ email, password: 'password123' });
      return res.body.data.accessToken;
    };

    ownerToken = await login('owner@test.com');
    seeker1Token = await login('seeker1@test.com');
    seeker2Token = await login('seeker2@test.com');

    // Create a room
    const room = await Room.create({
      ownerId: owner._id,
      title: 'Test Room for Reviews',
      description: 'A nice room to test the reviews feature',
      rent: 5000,
      location: { country: 'IN', state: 'DL', city: 'Delhi', area: 'Central' },
      roomType: 'Single',
      contactNumber: '1234567890',
    });
    roomId = room._id.toString();
  });

  afterAll(async () => {
    if (server) server.close();
    if (DB_AVAILABLE) await mongoose.disconnect();
  });

  beforeEach(async () => {
    if (!DB_AVAILABLE) return;
    await Review.deleteMany({});
  });

  // 1. Create review successfully
  it('should allow a seeker to create a review successfully', async () => {
    if (!DB_AVAILABLE) return;
    const res = await request(server)
      .post(`/api/v1/rooms/${roomId}/reviews`)
      .set('Authorization', `Bearer ${seeker1Token}`)
      .send({ rating: 5, comment: 'Great room!' });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.rating).toBe(5);
    expect(res.body.data.comment).toBe('Great room!');
    expect(res.body.data.roomId).toBe(roomId);
    expect(res.body.data.userId).toBe(seeker1Id);
    
    reviewId = res.body.data.id;
  });

  // 2. Guest cannot create review
  it('should prevent guests from creating a review', async () => {
    if (!DB_AVAILABLE) return;
    const res = await request(server)
      .post(`/api/v1/rooms/${roomId}/reviews`)
      .send({ rating: 4, comment: 'Nice' });

    expect(res.status).toBe(401);
  });

  // 3. Seeker can create review (covered by 1)

  // 4. Rating below 1 rejected
  it('should reject ratings below 1', async () => {
    if (!DB_AVAILABLE) return;
    const res = await request(server)
      .post(`/api/v1/rooms/${roomId}/reviews`)
      .set('Authorization', `Bearer ${seeker1Token}`)
      .send({ rating: 0, comment: 'Bad' });

    expect(res.status).toBe(400);
  });

  // 5. Rating above 5 rejected
  it('should reject ratings above 5', async () => {
    if (!DB_AVAILABLE) return;
    const res = await request(server)
      .post(`/api/v1/rooms/${roomId}/reviews`)
      .set('Authorization', `Bearer ${seeker1Token}`)
      .send({ rating: 6, comment: 'Awesome' });

    expect(res.status).toBe(400);
  });

  // 6. Empty comment rejected
  it('should reject empty comments', async () => {
    if (!DB_AVAILABLE) return;
    const res = await request(server)
      .post(`/api/v1/rooms/${roomId}/reviews`)
      .set('Authorization', `Bearer ${seeker1Token}`)
      .send({ rating: 4, comment: '   ' });

    expect(res.status).toBe(400);
  });

  // 7. Duplicate review rejected
  it('should reject duplicate reviews from the same seeker for the same room', async () => {
    if (!DB_AVAILABLE) return;
    await request(server)
      .post(`/api/v1/rooms/${roomId}/reviews`)
      .set('Authorization', `Bearer ${seeker1Token}`)
      .send({ rating: 4, comment: 'First review' });

    const res = await request(server)
      .post(`/api/v1/rooms/${roomId}/reviews`)
      .set('Authorization', `Bearer ${seeker1Token}`)
      .send({ rating: 5, comment: 'Second review attempt' });

    expect(res.status).toBe(409);
  });

  // 8. Owner cannot review own room
  it('should prevent an owner from reviewing their own room', async () => {
    if (!DB_AVAILABLE) return;
    const res = await request(server)
      .post(`/api/v1/rooms/${roomId}/reviews`)
      .set('Authorization', `Bearer ${ownerToken}`) // Wait, owner role is rejected by middleware entirely
      .send({ rating: 5, comment: 'My room is the best' });

    expect(res.status).toBe(403); // requireRole('seeker') triggers 403
  });

  // 9. User can edit own review
  it('should allow a user to edit their own review', async () => {
    if (!DB_AVAILABLE) return;
    const createRes = await request(server)
      .post(`/api/v1/rooms/${roomId}/reviews`)
      .set('Authorization', `Bearer ${seeker1Token}`)
      .send({ rating: 4, comment: 'Good' });
      
    const rId = createRes.body.data.id;

    const res = await request(server)
      .patch(`/api/v1/reviews/${rId}`)
      .set('Authorization', `Bearer ${seeker1Token}`)
      .send({ rating: 5, comment: 'Very good' });

    expect(res.status).toBe(200);
    expect(res.body.data.rating).toBe(5);
    expect(res.body.data.comment).toBe('Very good');
  });

  // 10. User cannot edit another user's review
  it('should prevent a user from editing another users review', async () => {
    if (!DB_AVAILABLE) return;
    const createRes = await request(server)
      .post(`/api/v1/rooms/${roomId}/reviews`)
      .set('Authorization', `Bearer ${seeker1Token}`)
      .send({ rating: 4, comment: 'Good' });
      
    const rId = createRes.body.data.id;

    const res = await request(server)
      .patch(`/api/v1/reviews/${rId}`)
      .set('Authorization', `Bearer ${seeker2Token}`) // seeker 2 trying to edit seeker 1's review
      .send({ rating: 1, comment: 'Hacked' });

    expect(res.status).toBe(403);
  });

  // 11. User can delete own review
  it('should allow a user to delete their own review', async () => {
    if (!DB_AVAILABLE) return;
    const createRes = await request(server)
      .post(`/api/v1/rooms/${roomId}/reviews`)
      .set('Authorization', `Bearer ${seeker1Token}`)
      .send({ rating: 4, comment: 'Good' });
      
    const rId = createRes.body.data.id;

    const res = await request(server)
      .delete(`/api/v1/reviews/${rId}`)
      .set('Authorization', `Bearer ${seeker1Token}`);

    expect(res.status).toBe(200);
    
    // verify it's soft deleted
    const dbReview = await Review.findById(rId);
    expect(dbReview!.isDeleted).toBe(true);
  });

  // 12. User cannot delete another user's review
  it('should prevent a user from deleting another users review', async () => {
    if (!DB_AVAILABLE) return;
    const createRes = await request(server)
      .post(`/api/v1/rooms/${roomId}/reviews`)
      .set('Authorization', `Bearer ${seeker1Token}`)
      .send({ rating: 4, comment: 'Good' });
      
    const rId = createRes.body.data.id;

    const res = await request(server)
      .delete(`/api/v1/reviews/${rId}`)
      .set('Authorization', `Bearer ${seeker2Token}`);

    expect(res.status).toBe(403);
  });

  // 13. Deleted review does not appear
  it('should not return deleted reviews in the feed', async () => {
    if (!DB_AVAILABLE) return;
    // seeker1 creates and deletes
    const createRes = await request(server)
      .post(`/api/v1/rooms/${roomId}/reviews`)
      .set('Authorization', `Bearer ${seeker1Token}`)
      .send({ rating: 4, comment: 'Good' });
      
    await request(server)
      .delete(`/api/v1/reviews/${createRes.body.data.id}`)
      .set('Authorization', `Bearer ${seeker1Token}`);

    // seeker2 creates
    await request(server)
      .post(`/api/v1/rooms/${roomId}/reviews`)
      .set('Authorization', `Bearer ${seeker2Token}`)
      .send({ rating: 5, comment: 'Excellent' });

    const feedRes = await request(server).get(`/api/v1/rooms/${roomId}/reviews`);
    expect(feedRes.status).toBe(200);
    expect(feedRes.body.data.length).toBe(1);
    expect(feedRes.body.data[0].comment).toBe('Excellent');
  });

  // 14. Deleted review excluded from rating
  // 16. Rating average correct
  // 17. Review count correct
  it('should calculate accurate summary excluding deleted reviews', async () => {
    if (!DB_AVAILABLE) return;
    // seeker1 creates (rating 4)
    await request(server)
      .post(`/api/v1/rooms/${roomId}/reviews`)
      .set('Authorization', `Bearer ${seeker1Token}`)
      .send({ rating: 4, comment: 'Good' });
      
    // seeker2 creates and deletes (rating 2)
    const createRes = await request(server)
      .post(`/api/v1/rooms/${roomId}/reviews`)
      .set('Authorization', `Bearer ${seeker2Token}`)
      .send({ rating: 2, comment: 'Bad' });
    await request(server)
      .delete(`/api/v1/reviews/${createRes.body.data.id}`)
      .set('Authorization', `Bearer ${seeker2Token}`);

    const summaryRes = await request(server).get(`/api/v1/rooms/${roomId}/reviews/summary`);
    expect(summaryRes.status).toBe(200);
    expect(summaryRes.body.data.averageRating).toBe(4);
    expect(summaryRes.body.data.reviewCount).toBe(1);
  });

  // 15. Pagination works
  it('should paginate reviews correctly', async () => {
    if (!DB_AVAILABLE) return;
    
    // create a bunch of reviews directly to bypass the 1-per-user restriction for testing pagination
    const reviews = [];
    for (let i = 0; i < 15; i++) {
      reviews.push({
        roomId,
        userId: seeker1Id, // not realistic for 1 user, but fine for db seed
        rating: 5,
        comment: `Comment ${i}`,
        createdAt: new Date(Date.now() + i * 1000) // ensure predictable sorting
      });
    }
    await Review.insertMany(reviews);

    // page 1
    const p1Res = await request(server).get(`/api/v1/rooms/${roomId}/reviews?page=1&limit=10`);
    expect(p1Res.body.data.length).toBe(10);
    expect(p1Res.body.pagination.total).toBe(15);
    expect(p1Res.body.pagination.totalPages).toBe(2);

    // page 2
    const p2Res = await request(server).get(`/api/v1/rooms/${roomId}/reviews?page=2&limit=10`);
    expect(p2Res.body.data.length).toBe(5);
  });

  // 18. Invalid roomId handled
  it('should reject invalid room IDs with 400', async () => {
    if (!DB_AVAILABLE) return;
    const res = await request(server).get(`/api/v1/rooms/invalid-id-123/reviews`);
    expect(res.status).toBe(400); // Zod validation fails
  });

  // 19. Non-existent room handled
  it('should return 404 for non-existent room IDs', async () => {
    if (!DB_AVAILABLE) return;
    const fakeId = new mongoose.Types.ObjectId().toString();
    const res = await request(server).get(`/api/v1/rooms/${fakeId}/reviews`);
    expect(res.status).toBe(404);
  });
});
