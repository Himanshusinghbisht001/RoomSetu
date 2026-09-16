/**
 * seedDemoRooms.ts — Safe, idempotent seed script for Nainital demo locations.
 * 
 * Creates a dedicated demo owner account (if it doesn't exist) and
 * exactly 60 demo rooms (5 for each of the 12 specific Nainital locations).
 * 
 * USAGE:
 *   npx tsx src/scripts/seedDemoRooms.ts
 */

import 'dotenv/config';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { User } from '../modules/users/user.model.js';
import { Room } from '../modules/rooms/room.model.js';

const MONGODB_URI = process.env['MONGODB_URI'];
if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI is not set in .env — aborting.');
  process.exit(1);
}

const DEMO_EMAIL = 'demo_owner@roomsetu.in';

const LOCATIONS = [
  '7 Number',
  'Sukhatal',
  'Bara Pathar',
  'Harinagar',
  'Balrampur',
  'St. Loo',
  "Land's End",
  'Alma Cottage Area',
  'Naina Peak Road',
  'Kilbury Road',
  'Barapathar Road',
  'Ayarpatta Road'
];

const ROOM_TEMPLATES = [
  { prefix: 'Cozy Student Room', type: 'Single' as const, rent: 5000, facilities: ['Wi-Fi', 'Water', 'Electricity'], suitableFor: ['Student'] },
  { prefix: 'Mountain View Stay', type: 'Double' as const, rent: 8500, facilities: ['Wi-Fi', 'Water', 'Electricity', 'Attached Bathroom', 'Balcony'], suitableFor: ['Student', 'Working Professional'] },
  { prefix: 'Furnished Room Near', type: 'PG' as const, rent: 6000, facilities: ['Wi-Fi', 'Water', 'Electricity', 'Furnished', 'Kitchen'], suitableFor: ['Student', 'Working Professional'] },
  { prefix: 'Budget Single Room', type: 'Single' as const, rent: 4500, facilities: ['Water', 'Electricity'], suitableFor: ['Student'] },
  { prefix: 'Premium PG Room', type: 'PG' as const, rent: 11000, facilities: ['Wi-Fi', 'Water', 'Electricity', 'Attached Bathroom', 'Furnished', 'Parking'], suitableFor: ['Working Professional', 'Family'] }
];

async function run() {
  console.log('\n══════════════════════════════════════════════════');
  console.log('  RoomSetu — Nainital Demo Room Seed Script');
  console.log('══════════════════════════════════════════════════\n');

  const maskedUri = MONGODB_URI!.replace(/(mongodb(?:\+srv)?:\/\/)([^:]+):([^@]+)@/, '$1***:***@');
  console.log(`Connecting to: ${maskedUri}`);
  
  await mongoose.connect(MONGODB_URI!);
  console.log('✅ Connected successfully.\n');

  // 1. Find or create demo owner
  let demoOwner = await User.findOne({ email: DEMO_EMAIL });
  if (!demoOwner) {
    console.log(`Creating demo owner account (${DEMO_EMAIL})...`);
    const passwordHash = await bcrypt.hash('DemoPassword123!', 10);
    demoOwner = await User.create({
      name: 'Demo Owner',
      email: DEMO_EMAIL,
      passwordHash,
      role: 'owner'
    });
  } else {
    console.log(`Found existing demo owner account (${DEMO_EMAIL}).`);
  }

  const ownerId = demoOwner._id;

  // 2. Upsert rooms
  console.log('\nSeeding rooms...');
  let roomsCreatedOrUpdated = 0;

  // Track counters for unique primary images
  let pgCounter = 0;
  let singleCounter = 0;
  let doubleCounter = 0;

  const getImages = (type: string) => {
    const typeStr = type.toLowerCase();
    let pool: string[] = [];
    let counter = 0;

    if (typeStr === 'pg') {
      pool = Array.from({ length: 10 }, (_, i) => `/Rooms/pg/pg${i + 1}.jfif`);
      counter = pgCounter++;
    } else if (typeStr === 'single') {
      pool = Array.from({ length: 11 }, (_, i) => `/Rooms/single/single${i + 1}.jfif`);
      counter = singleCounter++;
    } else {
      pool = Array.from({ length: 13 }, (_, i) => `/Rooms/double/double${i + 1}.jfif`);
      counter = doubleCounter++;
    }

    // Select exactly 4 images
    return [
      pool[(counter + 0) % pool.length],
      pool[(counter + 1) % pool.length],
      pool[(counter + 2) % pool.length],
      pool[(counter + 3) % pool.length]
    ];
  };

  for (const location of LOCATIONS) {
    for (let i = 0; i < ROOM_TEMPLATES.length; i++) {
      const template = ROOM_TEMPLATES[i];
      const title = `${template.prefix} – ${location}`;
      
      // Deterministic search based on ownerId and title
      const existingRoom = await Room.findOne({ ownerId, title });

      const roomData = {
        ownerId,
        title,
        description: `This is a demo listing for a ${template.type.toLowerCase()} room located in ${location}, Nainital. It offers great amenities and a peaceful environment.`,
        rent: template.rent,
        location: {
          country: 'India',
          state: 'Uttarakhand',
          city: 'Nainital',
          area: location
        },
        roomType: template.type,
        images: getImages(template.type), // Exactly 4 images
        facilities: template.facilities,
        suitableFor: template.suitableFor,
        contactNumber: '+919876543210',
        availability: 'Available' as const
      };

      if (existingRoom) {
        await Room.updateOne({ _id: existingRoom._id }, { $set: roomData });
      } else {
        await Room.create(roomData);
      }
      roomsCreatedOrUpdated++;
    }
  }

  console.log(`✅ Seeded/Updated ${roomsCreatedOrUpdated} demo rooms.\n`);

  // 3. Verify counts
  const totalDemoRooms = await Room.countDocuments({ ownerId });
  console.log('─── VERIFICATION ──────────────────────────────');
  console.log(`Total demo rooms for ${DEMO_EMAIL}: ${totalDemoRooms}`);

  if (totalDemoRooms === 60) {
    console.log('✅ Exactly 60 demo rooms exist.');
  } else {
    console.log(`⚠️ Expected 60 demo rooms, but found ${totalDemoRooms}.`);
  }

  // Count per location for demo owner
  for (const location of LOCATIONS) {
    const count = await Room.countDocuments({ ownerId, 'location.area': location });
    console.log(`  - ${location}: ${count} rooms`);
  }

  const allRooms = await Room.find({ ownerId }).sort({ _id: 1 });
  const roomsWith4Images = allRooms.filter(r => r.images && r.images.length === 4).length;
  console.log(`Rooms with exactly 4 images: ${roomsWith4Images}`);
  
  const first20Rooms = allRooms.slice(0, 20);
  const primaryImages = first20Rooms.map(r => r.images[0]);
  const uniquePrimaryImages = new Set(primaryImages).size;
  
  console.log(`First 20 rooms with unique primary images: ${uniquePrimaryImages}`);
  console.log(`Duplicate primary images among first 20: ${20 - uniquePrimaryImages}`);

  if (roomsWith4Images === 60) {
    console.log('\n✅ All image constraints verified successfully.');
  } else {
    console.log('\n❌ Image constraint verification failed.');
  }

  console.log('\n✅ Disconnecting...');
  await mongoose.disconnect();
  console.log('✅ Done.\n');
}

run().catch((err) => {
  const msg = err instanceof Error ? err.message : String(err);
  console.error(`❌ Seed failed: ${msg}`);
  process.exit(1);
});
