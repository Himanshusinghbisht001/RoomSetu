import { Room } from './room.model.js';
import { AppError } from '../../utils/AppError.js';
import { CreateRoomInput, UpdateRoomInput, OwnerRoomQuery, RoomQuery } from './room.schema.js';
import { Types } from 'mongoose';

type RoomFilter = Partial<Record<string, unknown>>;

/**
 * Asserts ownership of a room.
 * Throws a 404 if the room does not exist, is deleted, or belongs to a different owner.
 * Returning 404 instead of 403 prevents leaking the existence of other users' rooms.
 */
const assertOwnership = async (roomId: string, ownerId: string) => {
  const room = await Room.findOne({ _id: roomId, isDeleted: false });
  if (!room || room.ownerId.toString() !== ownerId) {
    throw AppError.notFound('Room not found');
  }
  return room;
};

export const createRoom = async (data: CreateRoomInput, ownerId: string) => {
  const room = await Room.create({
    ...data,
    ownerId: new Types.ObjectId(ownerId),
  });
  return room;
};

export const getPublicRooms = async (query: RoomQuery) => {
  const { page = 1, limit = 10, availability, roomType, city, area, search, sort } = query;
  const skip = (page - 1) * limit;

  const filter: RoomFilter = { isDeleted: false };

  if (availability) filter.availability = availability;
  if (roomType)     filter.roomType = roomType;
  if (city)         filter['location.city'] = city;
  if (area)         filter['location.area'] = area;
  if (search) {
    // Utilize MongoDB native text index instead of regex
    filter.$text = { $search: search };
  }

  const sortMap: Record<string, Record<string, 1 | -1>> = {
    newest:   { createdAt: -1 },
    oldest:   { createdAt:  1 },
    rent_asc: { rent:       1 },
    rent_desc:{ rent:      -1 },
  };
  const sortObj = sortMap[sort ?? 'newest'] ?? sortMap['newest'];

  const [rooms, total] = await Promise.all([
    Room.find(filter)
      .sort(sortObj)
      .skip(skip)
      .limit(limit)
      .select('-__v')
      .lean(),
    Room.countDocuments(filter),
  ]);

  return {
    rooms,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
};

export const getLocationCounts = async (city?: string) => {
  const match: any = { isDeleted: false };
  if (city) {
    match['location.city'] = city;
  }

  const result = await Room.aggregate([
    { $match: match },
    {
      $group: {
        _id: '$location.area',
        count: { $sum: 1 },
      },
    },
    { $sort: { count: -1 } },
  ]);

  return result.map(item => ({
    area: item._id,
    count: item.count,
  }));
};

export const getRoomById = async (roomId: string) => {
  const room = await Room.findOne({ _id: roomId, isDeleted: false }).select('-__v');
  if (!room) {
    throw AppError.notFound('Room not found');
  }
  return room;
};

export const getOwnerRooms = async (ownerId: string, query: OwnerRoomQuery) => {
  const { page = 1, limit = 10, availability, roomType, city, area, search, sort, includeDeleted } = query;
  const skip = (page - 1) * limit;

  // Build filter — ownerId is always locked to the authenticated user
  const filter: RoomFilter = { ownerId };

  if (!includeDeleted) {
    filter.isDeleted = false;
  }
  if (availability) filter.availability = availability;
  if (roomType)     filter.roomType = roomType;
  if (city)         filter['location.city'] = city;
  if (area)         filter['location.area'] = area;
  if (search) {
    // Utilize MongoDB native text index
    filter.$text = { $search: search };
  }

  // Whitelist of allowed sort fields
  const sortMap: Record<string, Record<string, 1 | -1>> = {
    newest:   { createdAt: -1 },
    oldest:   { createdAt:  1 },
    rent_asc: { rent:       1 },
    rent_desc:{ rent:      -1 },
  };
  const sortObj = sortMap[sort ?? 'newest'] ?? sortMap['newest'];

  const [rooms, total] = await Promise.all([
    Room.find(filter)
      .sort(sortObj)
      .skip(skip)
      .limit(limit)
      .select('-__v')
      .lean(),
    Room.countDocuments(filter),
  ]);

  return {
    rooms,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
};

export const updateRoom = async (roomId: string, ownerId: string, data: UpdateRoomInput) => {
  const room = await assertOwnership(roomId, ownerId);

  // Update allowed fields
  Object.assign(room, data);
  await room.save();

  return room;
};

export const softDeleteRoom = async (roomId: string, ownerId: string) => {
  const room = await assertOwnership(roomId, ownerId);
  
  room.isDeleted = true;
  room.deletedAt = new Date();
  await room.save();
  
  return true;
};

export const updateAvailability = async (roomId: string, ownerId: string, availability: 'Available' | 'Booked') => {
  const room = await assertOwnership(roomId, ownerId);
  
  room.availability = availability;
  await room.save();
  
  return room;
};

/**
 * Dashboard summary for a specific owner.
 * Uses a single MongoDB aggregation pass — no full document hydration.
 */
export const getDashboardSummary = async (ownerId: string) => {
  const ownerObjectId = new Types.ObjectId(ownerId);

  const result = await Room.aggregate([
    { $match: { ownerId: ownerObjectId } },
    {
      $group: {
        _id: null,
        totalRooms:     { $sum: 1 },
        availableRooms: {
          $sum: {
            $cond: [
              { $and: [{ $eq: ['$isDeleted', false] }, { $eq: ['$availability', 'Available'] }] },
              1, 0,
            ],
          },
        },
        bookedRooms: {
          $sum: {
            $cond: [
              { $and: [{ $eq: ['$isDeleted', false] }, { $eq: ['$availability', 'Booked'] }] },
              1, 0,
            ],
          },
        },
        deletedRooms: {
          $sum: { $cond: [{ $eq: ['$isDeleted', true] }, 1, 0] },
        },
      },
    },
    { $project: { _id: 0, totalRooms: 1, availableRooms: 1, bookedRooms: 1, deletedRooms: 1 } },
  ]);

  // If the owner has no rooms at all, return zeros
  return result[0] ?? {
    totalRooms: 0,
    availableRooms: 0,
    bookedRooms: 0,
    deletedRooms: 0,
  };
};
