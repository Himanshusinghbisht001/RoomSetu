/**
 * cleanupRooms.ts — One-time Room collection cleanup
 *
 * PURPOSE:
 *   Delete ALL Room documents from the database.
 *   Does NOT touch: Users, RefreshSessions, Feedback, or any other collection.
 *   Does NOT modify any application code, schema, or API routes.
 *
 * CLOUDINARY:
 *   The project has no safe Cloudinary deletion service.
 *   Cloudinary image URLs found in Room documents are reported as
 *   orphaned/remaining assets — they are NOT automatically deleted.
 *
 * USAGE:
 *   npx tsx src/scripts/cleanupRooms.ts
 *
 * SAFETY:
 *   - Reads .env for MONGODB_URI (credentials are never printed).
 *   - Prints a full audit summary before deleting anything.
 *   - Verifies other collections remain untouched after deletion.
 */

import 'dotenv/config';
import mongoose from 'mongoose';

// ── Step 0: Connect ──────────────────────────────────────────────────────────

const MONGODB_URI = process.env['MONGODB_URI'];
if (!MONGODB_URI) {
  console.error('❌  MONGODB_URI is not set in .env — aborting.');
  process.exit(1);
}

async function run(): Promise<void> {
  console.log('\n══════════════════════════════════════════════════');
  console.log('  RoomSetu — Room Collection Cleanup Script');
  console.log('══════════════════════════════════════════════════\n');

  // Connect (mask credentials in output)
  const maskedUri = MONGODB_URI!.replace(
    /(mongodb(?:\+srv)?:\/\/)([^:]+):([^@]+)@/,
    '$1***:***@',
  );
  console.log(`Connecting to: ${maskedUri}`);
  await mongoose.connect(MONGODB_URI!);
  console.log('✅  Connected successfully.\n');

  const db = mongoose.connection.db!;

  // ── Step 1: AUDIT ─────────────────────────────────────────────────────────

  console.log('─── STEP 1: AUDIT ──────────────────────────────\n');

  const roomsCollection = db.collection('rooms');
  const usersCollection = db.collection('users');
  const refreshSessionsCollection = db.collection('refreshsessions');
  const feedbackCollection = db.collection('feedbacks');

  // Room counts
  const totalRooms = await roomsCollection.countDocuments();
  const activeRooms = await roomsCollection.countDocuments({ isDeleted: false });
  const softDeletedRooms = await roomsCollection.countDocuments({ isDeleted: true });

  // Cloudinary image URLs
  const roomsWithImages = await roomsCollection
    .find({ images: { $exists: true, $not: { $size: 0 } } })
    .project({ images: 1 })
    .toArray();

  const allCloudinaryUrls: string[] = [];
  for (const room of roomsWithImages) {
    const images = room.images as string[];
    for (const url of images) {
      if (url.includes('cloudinary')) {
        allCloudinaryUrls.push(url);
      }
    }
  }

  // Other collection counts (for verification before and after)
  const totalUsers = await usersCollection.countDocuments();
  const totalRefreshSessions = await refreshSessionsCollection.countDocuments();
  const totalFeedback = await feedbackCollection.countDocuments();

  console.log('  Room documents:');
  console.log(`    Total:         ${totalRooms}`);
  console.log(`    Active:        ${activeRooms}`);
  console.log(`    Soft-deleted:  ${softDeletedRooms}`);
  console.log(`    With Cloudinary images: ${roomsWithImages.length}`);
  console.log(`    Total Cloudinary URLs:  ${allCloudinaryUrls.length}`);
  console.log('');
  console.log('  Other collections (must remain untouched):');
  console.log(`    Users:            ${totalUsers}`);
  console.log(`    RefreshSessions:  ${totalRefreshSessions}`);
  console.log(`    Feedbacks:        ${totalFeedback}`);
  console.log('');

  // ── Step 7: SAFETY SUMMARY ────────────────────────────────────────────────

  console.log('─── SAFETY SUMMARY ─────────────────────────────\n');
  console.log(`  Rooms to delete:                        ${totalRooms}`);
  console.log(`  Cloudinary images potentially orphaned: ${allCloudinaryUrls.length}`);
  console.log(`  Users affected:                         0`);
  console.log(`  Feedback records affected:              0`);
  console.log(`  Authentication records affected:        0`);
  console.log('');

  if (totalRooms === 0) {
    console.log('ℹ️  No Room documents found. Nothing to delete.');
    await mongoose.connection.close();
    console.log('✅  Connection closed. Done.\n');
    return;
  }

  // ── Step 2: DELETE ONLY ROOM DOCUMENTS ────────────────────────────────────

  console.log('─── STEP 2: DELETING ROOM DOCUMENTS ────────────\n');

  const deleteResult = await roomsCollection.deleteMany({});
  console.log(`  ✅  Deleted ${deleteResult.deletedCount} Room document(s).\n`);

  // ── Step 3: CLOUDINARY IMAGES REPORT ──────────────────────────────────────

  console.log('─── STEP 3: CLOUDINARY IMAGE REPORT ────────────\n');

  if (allCloudinaryUrls.length === 0) {
    console.log('  No Cloudinary image URLs were associated with deleted rooms.\n');
  } else {
    console.log('  ⚠️  The project has NO safe Cloudinary deletion service.');
    console.log('     The following Cloudinary URLs are now ORPHANED and should');
    console.log('     be manually reviewed/deleted from the Cloudinary dashboard:\n');
    for (const url of allCloudinaryUrls) {
      console.log(`     • ${url}`);
    }
    console.log('');
    console.log(`  Total orphaned Cloudinary assets: ${allCloudinaryUrls.length}`);
    console.log('  Cloudinary assets auto-deleted:   0  (not safe to auto-delete)\n');
  }

  // ── Step 4: DATABASE VERIFICATION ─────────────────────────────────────────

  console.log('─── STEP 4: DATABASE VERIFICATION ──────────────\n');

  const remainingRooms = await roomsCollection.countDocuments();
  const postUsers = await usersCollection.countDocuments();
  const postRefreshSessions = await refreshSessionsCollection.countDocuments();
  const postFeedback = await feedbackCollection.countDocuments();

  console.log(`  Rooms remaining:       ${remainingRooms}  ${remainingRooms === 0 ? '✅' : '❌ UNEXPECTED'}`);
  console.log(`  Users still exist:     ${postUsers}  ${postUsers === totalUsers ? '✅' : '❌ MISMATCH'}`);
  console.log(`  Feedback still exists: ${postFeedback}  ${postFeedback === totalFeedback ? '✅' : '❌ MISMATCH'}`);
  console.log(`  RefreshSessions:       ${postRefreshSessions}  ${postRefreshSessions === totalRefreshSessions ? '✅' : '❌ MISMATCH'}`);
  console.log('');

  // ── FINAL REPORT ──────────────────────────────────────────────────────────

  console.log('─── FINAL CLEANUP REPORT ───────────────────────\n');
  console.log(`  1.  Rooms before cleanup:       ${totalRooms}`);
  console.log(`  2.  Rooms deleted:              ${deleteResult.deletedCount}`);
  console.log(`  3.  Rooms remaining:            ${remainingRooms}`);
  console.log(`  4.  Cloudinary assets deleted:  0  (not safe to auto-delete)`);
  console.log(`  5.  Cloudinary assets orphaned: ${allCloudinaryUrls.length}`);
  console.log(`  6.  Users affected:             0  (${postUsers} users intact)`);
  console.log(`  7.  Feedback affected:          0  (${postFeedback} feedbacks intact)`);
  console.log(`  8.  Authentication affected:    0  (${postRefreshSessions} sessions intact)`);
  console.log('');

  // ── Close connection ──────────────────────────────────────────────────────

  await mongoose.connection.close();
  console.log('✅  Connection closed. Cleanup complete.\n');
}

run().catch((err: unknown) => {
  const msg = err instanceof Error ? err.message : String(err);
  // Never print the full error which may contain connection strings
  console.error(`❌  Cleanup failed: ${msg}`);
  process.exit(1);
});
