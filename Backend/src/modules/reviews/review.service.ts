import { Types } from 'mongoose';
import { Review } from './review.model.js';
import { Room } from '../rooms/room.model.js';
import { AppError } from '../../utils/AppError.js';
import { CreateReviewInput, UpdateReviewInput, ReviewQuery } from './review.schema.js';

export const createReview = async (roomId: string, userId: string, data: CreateReviewInput) => {
  // 1. Check if room exists and is not deleted
  const room = await Room.findOne({ _id: roomId, isDeleted: false });
  if (!room) {
    throw AppError.notFound('Room not found');
  }

  // 2. Check that owner cannot review their own room
  if (room.ownerId.toString() === userId) {
    throw AppError.forbidden('Owners cannot review their own rooms');
  }

  // 3. Check for existing active review by this user for this room
  const existingReview = await Review.findOne({
    roomId,
    userId,
    isDeleted: false,
  });

  if (existingReview) {
    throw AppError.conflict('You have already reviewed this room');
  }

  // 4. Create review
  const review = await Review.create({
    roomId: new Types.ObjectId(roomId),
    userId: new Types.ObjectId(userId),
    rating: data.rating,
    comment: data.comment,
  });

  return review;
};

export const getRoomReviews = async (roomId: string, query: ReviewQuery) => {
  const { page = 1, limit = 10 } = query;
  const skip = (page - 1) * limit;

  // Validate room exists
  const room = await Room.findOne({ _id: roomId, isDeleted: false });
  if (!room) {
    throw AppError.notFound('Room not found');
  }

  const filter = { roomId: new Types.ObjectId(roomId), isDeleted: false };

  const [reviews, total] = await Promise.all([
    Review.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate({
        path: 'userId',
        select: 'name role', // Only expose safe user fields
      })
      .lean(),
    Review.countDocuments(filter),
  ]);

  // Format reviews to match response expectations (e.g. user object)
  const formattedReviews = reviews.map(review => ({
    ...review,
    id: review._id.toString(),
    _id: undefined,
    __v: undefined,
    user: review.userId,
    userId: undefined,
  }));

  return {
    reviews: formattedReviews,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
};

export const getRoomRatingSummary = async (roomId: string) => {
  const roomObjectId = new Types.ObjectId(roomId);

  const result = await Review.aggregate([
    {
      $match: {
        roomId: roomObjectId,
        isDeleted: false,
      },
    },
    {
      $group: {
        _id: null,
        averageRating: { $avg: '$rating' },
        reviewCount: { $sum: 1 },
      },
    },
    {
      $project: {
        _id: 0,
        averageRating: { $round: ['$averageRating', 1] },
        reviewCount: 1,
      },
    },
  ]);

  return result[0] || { averageRating: 0, reviewCount: 0 };
};

export const updateReview = async (reviewId: string, userId: string, data: UpdateReviewInput) => {
  const review = await Review.findOne({ _id: reviewId, isDeleted: false });
  
  if (!review) {
    throw AppError.notFound('Review not found');
  }

  if (review.userId.toString() !== userId) {
    throw AppError.forbidden('You can only edit your own reviews');
  }

  if (data.rating !== undefined) review.rating = data.rating;
  if (data.comment !== undefined) review.comment = data.comment;
  
  await review.save();

  return review;
};

export const softDeleteReview = async (reviewId: string, userId: string) => {
  const review = await Review.findOne({ _id: reviewId, isDeleted: false });
  
  if (!review) {
    throw AppError.notFound('Review not found');
  }

  if (review.userId.toString() !== userId) {
    throw AppError.forbidden('You can only delete your own reviews');
  }

  review.isDeleted = true;
  review.deletedAt = new Date();
  
  await review.save();

  return true;
};
