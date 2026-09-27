import { Types } from 'mongoose';
import { Favorite } from './favorite.model.js';
import { Room } from '../rooms/room.model.js';
import { AppError } from '../../utils/AppError.js';

export const favoriteService = {
  async addFavorite(userId: string, roomId: string) {
    if (!Types.ObjectId.isValid(roomId)) {
      throw AppError.badRequest('Invalid room ID');
    }

    const room = await Room.findById(roomId);
    if (!room) {
      throw AppError.notFound('Room not found');
    }
    if (room.isDeleted) {
      throw AppError.badRequest('Cannot favorite a deleted room');
    }

    // Use updateOne with upsert to prevent duplicates
    await Favorite.updateOne(
      { user: new Types.ObjectId(userId), room: new Types.ObjectId(roomId) },
      { $setOnInsert: { user: new Types.ObjectId(userId), room: new Types.ObjectId(roomId) } },
      { upsert: true }
    );

    return { success: true };
  },

  async removeFavorite(userId: string, roomId: string) {
    if (!Types.ObjectId.isValid(roomId)) {
      throw AppError.badRequest('Invalid room ID');
    }

    await Favorite.deleteOne({
      user: new Types.ObjectId(userId),
      room: new Types.ObjectId(roomId),
    });

    return { success: true };
  },

  async getFavorites(userId: string, page: number = 1, limit: number = 10) {
    const skip = (page - 1) * limit;

    const favorites = await Favorite.find({ user: new Types.ObjectId(userId) })
      .populate({
        path: 'room',
        match: { isDeleted: false },
        select: '-__v',
      })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    // Filter out null rooms (soft-deleted rooms)
    const validFavorites = favorites.filter((fav) => fav.room != null);
    
    const total = await Favorite.countDocuments({ user: new Types.ObjectId(userId) });

    return {
      data: validFavorites.map((fav) => fav.room),
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  },

  async checkFavorite(userId: string, roomId: string) {
    if (!Types.ObjectId.isValid(roomId)) {
      throw AppError.badRequest('Invalid room ID');
    }

    const favorite = await Favorite.exists({
      user: new Types.ObjectId(userId),
      room: new Types.ObjectId(roomId),
    });

    return { isFavorite: !!favorite };
  },
};
