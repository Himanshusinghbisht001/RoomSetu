import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IReview extends Document {
  roomId: Types.ObjectId;
  userId: Types.ObjectId;
  rating: number;
  comment: string;
  isDeleted: boolean;
  deletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const reviewSchema = new Schema<IReview>(
  {
    roomId: {
      type: Schema.Types.ObjectId,
      ref: 'Room',
      required: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
    comment: {
      type: String,
      required: true,
      trim: true,
      maxlength: 500,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
    deletedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform: (_, ret: any) => {
        ret.id = ret._id;
        delete ret._id;
        delete ret.__v;
      },
    },
  }
);

// Indexes for common queries
// 1. Fetching active reviews for a room, newest first
reviewSchema.index({ roomId: 1, isDeleted: 1, createdAt: -1 });
// 2. Checking if a user has already reviewed a room (active reviews only)
reviewSchema.index({ userId: 1, roomId: 1, isDeleted: 1 });

export const Review = mongoose.model<IReview>('Review', reviewSchema);
