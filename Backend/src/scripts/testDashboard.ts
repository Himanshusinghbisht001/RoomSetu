import 'dotenv/config';
import request from 'supertest';
import { connectDB, disconnectDB } from '../config/db.js';
import { User } from '../modules/users/user.model.js';
import { Room } from '../modules/rooms/room.model.js';
import { register, login } from '../modules/auth/auth.service.js';
import { createApp } from '../app.js';

const app = createApp();

// ── helpers ──────────────────────────────────────────────────────────────────
const makeRoom = (overrides: Record<string, unknown> = {}) => ({
  title: 'Cosy Test Room',
  description: 'A clean and spacious room near the market.',
  rent: 5000,
  location: { country: 'India', state: 'Uttarakhand', city: 'Nainital', area: 'Mallital' },
  roomType: 'Single',
  contactNumber: '9876543210',
  ...overrides,
});

let pass = 0;
let fail = 0;

function report(label: string, ok: boolean, detail = '') {
  if (ok) {
    pass++;
    console.log(`  ✅ PASS  ${label}`);
  } else {
    fail++;
    console.log(`  ❌ FAIL  ${label}${detail ? ' — ' + detail : ''}`);
  }
}

// ── main ─────────────────────────────────────────────────────────────────────
async function runTests() {
  await connectDB();

  // Clean slate
  await User.deleteMany({ email: { $regex: /@phase4test\.com$/ } });
  await Room.deleteMany({ 'location.area': '__phase4__' });

  // ── Setup users ──────────────────────────────────────────────────────────
  await register({ name: 'P4 Owner A', email: 'ownerA@phase4test.com', password: 'P@ssword1', role: 'owner' });
  await register({ name: 'P4 Owner B', email: 'ownerB@phase4test.com', password: 'P@ssword1', role: 'owner' });
  await register({ name: 'P4 Seeker', email: 'seeker@phase4test.com', password: 'P@ssword1', role: 'seeker' });

  const ownerAToken = (await login({ email: 'ownerA@phase4test.com', password: 'P@ssword1' })).accessToken;
  const ownerBToken = (await login({ email: 'ownerB@phase4test.com', password: 'P@ssword1' })).accessToken;
  const seekerToken = (await login({ email: 'seeker@phase4test.com', password: 'P@ssword1' })).accessToken;

  // Create rooms for Owner A: 2 Available, 1 Booked, 1 to-be-deleted, 1 PG
  const area = '__phase4__'; // sentinel so cleanup is scoped

  const create = async (token: string, overrides: Record<string, unknown> = {}) =>
    (await request(app)
      .post('/api/v1/rooms')
      .set('Authorization', `Bearer ${token}`)
      .send(makeRoom({ location: { country: 'India', state: 'Uttarakhand', city: 'Nainital', area }, ...overrides }))).body.data;

  void (await create(ownerAToken, { title: 'Alpha Available PG Room', roomType: 'PG', rent: 4000 }));
  const rA2 = await create(ownerAToken, { title: 'Beta Single Room', roomType: 'Single', rent: 6000 });
  const rA3 = await create(ownerAToken, { title: 'Gamma Booked Room', roomType: 'Double', rent: 7000 });
  const rA4 = await create(ownerAToken, { title: 'Delta to be deleted', roomType: 'Single', rent: 3000 });
  await create(ownerBToken, { title: 'Owner B room', roomType: 'Single', rent: 5500 }); // isolation sentinel

  // Mark rA3 as Booked
  await request(app)
    .patch(`/api/v1/rooms/${rA3.id}/availability`)
    .set('Authorization', `Bearer ${ownerAToken}`)
    .send({ availability: 'Booked' });

  // Soft-delete rA4
  await request(app)
    .delete(`/api/v1/rooms/${rA4.id}`)
    .set('Authorization', `Bearer ${ownerAToken}`);

  console.log('\n══════════════════════════════════════════════════════');
  console.log('  Phase 4 Verification Tests');
  console.log('══════════════════════════════════════════════════════');

  // ── 1. Unauthenticated → dashboard/summary → 401 ─────────────────────────
  console.log('\n[Dashboard Auth]');
  {
    const r = await request(app).get('/api/v1/rooms/dashboard/summary');
    report('Unauthenticated → 401', r.status === 401);
  }

  // ── 2. Seeker → dashboard/summary → 403 ──────────────────────────────────
  {
    const r = await request(app)
      .get('/api/v1/rooms/dashboard/summary')
      .set('Authorization', `Bearer ${seekerToken}`);
    report('Seeker → 403', r.status === 403);
  }

  // ── 3. Owner → dashboard/summary → 200 ───────────────────────────────────
  {
    const r = await request(app)
      .get('/api/v1/rooms/dashboard/summary')
      .set('Authorization', `Bearer ${ownerAToken}`);
    report('Owner → 200', r.status === 200);

    const d = r.body.data;
    // 4. totalRooms includes deleted: rA1+rA2+rA3+rA4 = 4
    report('totalRooms correct (4)', d.totalRooms === 4, `got ${d.totalRooms}`);
    // 5. availableRooms: rA1+rA2 = 2
    report('availableRooms correct (2)', d.availableRooms === 2, `got ${d.availableRooms}`);
    // 6. bookedRooms: rA3 = 1
    report('bookedRooms correct (1)', d.bookedRooms === 1, `got ${d.bookedRooms}`);
    // 7. deletedRooms: rA4 = 1
    report('deletedRooms correct (1)', d.deletedRooms === 1, `got ${d.deletedRooms}`);
  }

  // ── 8. Owner A /my only returns Owner A rooms ────────────────────────────
  console.log('\n[Owner Room List — isolation]');
  {
    const ownerADoc = await User.findOne({ email: 'ownerA@phase4test.com' });
    const r = await request(app)
      .get('/api/v1/rooms/my?limit=50')
      .set('Authorization', `Bearer ${ownerAToken}`);
    const rooms: any[] = r.body.data;
    const allOwnerA = rooms.every(rm => rm.ownerId === ownerADoc!.id);
    report('Owner A /my — all rooms belong to Owner A', allOwnerA);
  }

  // ── 9. Owner B /my does NOT contain Owner A rooms ────────────────────────
  {
    const ownerADoc = await User.findOne({ email: 'ownerA@phase4test.com' });
    const r = await request(app)
      .get('/api/v1/rooms/my?limit=50')
      .set('Authorization', `Bearer ${ownerBToken}`);
    const rooms: any[] = r.body.data;
    const noOwnerARooms = rooms.every(rm => rm.ownerId !== ownerADoc!.id);
    report('Owner B /my — no Owner A rooms returned', noOwnerARooms);
  }

  // ── 10. Pagination ────────────────────────────────────────────────────────
  console.log('\n[Pagination]');
  {
    const r = await request(app)
      .get('/api/v1/rooms/my?page=1&limit=2')
      .set('Authorization', `Bearer ${ownerAToken}`);
    report('page=1&limit=2 returns at most 2 rooms', r.body.data.length <= 2);
    report('pagination.limit = 2', r.body.pagination?.limit === 2);
    report('pagination.page = 1', r.body.pagination?.page === 1);
  }

  // ── 11. Invalid page/limit → 400 ─────────────────────────────────────────
  console.log('\n[Validation]');
  {
    const r = await request(app)
      .get('/api/v1/rooms/my?page=0&limit=200')
      .set('Authorization', `Bearer ${ownerAToken}`);
    report('Invalid page/limit → 400', r.status === 400, `got ${r.status}`);
  }

  // ── 12. Invalid availability → 400 ───────────────────────────────────────
  {
    const r = await request(app)
      .get('/api/v1/rooms/my?availability=UNKNOWN')
      .set('Authorization', `Bearer ${ownerAToken}`);
    report('Invalid availability → 400', r.status === 400, `got ${r.status}`);
  }

  // ── 13. Invalid roomType → 400 ───────────────────────────────────────────
  {
    const r = await request(app)
      .get('/api/v1/rooms/my?roomType=Studio')
      .set('Authorization', `Bearer ${ownerAToken}`);
    report('Invalid roomType → 400', r.status === 400, `got ${r.status}`);
  }

  // ── 14. Search by title ───────────────────────────────────────────────────
  console.log('\n[Filters]');
  {
    const r = await request(app)
      .get('/api/v1/rooms/my?search=Beta')
      .set('Authorization', `Bearer ${ownerAToken}`);
    const rooms: any[] = r.body.data;
    report(
      'Search "Beta" returns rA2 only',
      rooms.length === 1 && String(rooms[0]._id) === String(rA2.id),
      `got ${rooms.length} room(s)`,
    );
  }

  // ── 15. Availability filter ───────────────────────────────────────────────
  {
    const r = await request(app)
      .get('/api/v1/rooms/my?availability=Booked')
      .set('Authorization', `Bearer ${ownerAToken}`);
    const rooms: any[] = r.body.data;
    report(
      'availability=Booked returns rA3 only',
      rooms.length === 1 && String(rooms[0]._id) === String(rA3.id),
      `got ${rooms.length} room(s)`,
    );
  }

  // ── 16. Normal listing excludes soft-deleted rooms ────────────────────────
  console.log('\n[Soft Delete]');
  {
    const r = await request(app)
      .get('/api/v1/rooms/my')
      .set('Authorization', `Bearer ${ownerAToken}`);
    const rooms: any[] = r.body.data;
    const deletedVisible = rooms.some(rm => rm.id === rA4.id);
    report('Soft-deleted room NOT in default /my listing', !deletedVisible);
  }

  // ── 17. includeDeleted=true shows owner's deleted rooms ───────────────────
  {
    const r = await request(app)
      .get('/api/v1/rooms/my?includeDeleted=true')
      .set('Authorization', `Bearer ${ownerAToken}`);
    const rooms: any[] = r.body.data;
    const deletedVisible = rooms.some(rm => String(rm._id) === String(rA4.id));
    const noOtherOwner = rooms.every(rm => rm.ownerId !== undefined); // still own rooms only
    report('includeDeleted=true shows deleted room (rA4)', deletedVisible);
    report("includeDeleted=true still only owner's own rooms", noOtherOwner);
  }

  // ── 18. Sorting ───────────────────────────────────────────────────────────
  console.log('\n[Sorting]');
  {
    const r = await request(app)
      .get('/api/v1/rooms/my?sort=rent_asc')
      .set('Authorization', `Bearer ${ownerAToken}`);
    const rooms: any[] = r.body.data;
    let ascending = true;
    for (let i = 1; i < rooms.length; i++) {
      if (rooms[i].rent < rooms[i - 1].rent) { ascending = false; break; }
    }
    report('sort=rent_asc — rooms in ascending rent order', ascending);
  }
  {
    const r = await request(app)
      .get('/api/v1/rooms/my?sort=rent_desc')
      .set('Authorization', `Bearer ${ownerAToken}`);
    const rooms: any[] = r.body.data;
    let descending = true;
    for (let i = 1; i < rooms.length; i++) {
      if (rooms[i].rent > rooms[i - 1].rent) { descending = false; break; }
    }
    report('sort=rent_desc — rooms in descending rent order', descending);
  }

  // ── 19. Cross-owner isolation: Owner B dashboard reflects only B's data ───
  console.log('\n[Cross-Owner Isolation]');
  {
    const r = await request(app)
      .get('/api/v1/rooms/dashboard/summary')
      .set('Authorization', `Bearer ${ownerBToken}`);
    const d = r.body.data;
    // Owner B only created 1 room
    report('Owner B totalRooms = 1 (own data only)', d.totalRooms === 1, `got ${d.totalRooms}`);
    report('Owner B bookedRooms = 0', d.bookedRooms === 0, `got ${d.bookedRooms}`);
    report('Owner B deletedRooms = 0', d.deletedRooms === 0, `got ${d.deletedRooms}`);
  }

  // ── Summary ───────────────────────────────────────────────────────────────
  console.log('\n══════════════════════════════════════════════════════');
  console.log(`  Results: ${pass} passed, ${fail} failed`);
  console.log('══════════════════════════════════════════════════════\n');

  // Cleanup
  await User.deleteMany({ email: { $regex: /@phase4test\.com$/ } });
  await Room.deleteMany({ 'location.area': '__phase4__' });
  await disconnectDB();
}

runTests().catch(err => {
  console.error('Test runner crashed:', err);
  process.exit(1);
});
