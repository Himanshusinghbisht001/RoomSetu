import mongoose, { Document, Schema, Types } from 'mongoose';

export interface Location {
  country: string;
  state: string;
  city: string;
  area: string;
}

export interface IRoom extends Document {
  ownerId: Types.ObjectId;
  title: string;
  description: string;
  rent: number;
  location: Location;
  roomType: 'Single' | 'Double' | 'PG';
  images: string[];
  facilities: string[];
  suitableFor: string[];
  contactNumber: string;
  availability: 'Available' | 'Booked';
  isDeleted: boolean;
  deletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const locationSchema = new Schema<Location>(
  {
    country: { type: String, required: true, trim: true },
    state: { type: String, required: true, trim: true },
    city: { type: String, required: true, trim: true },
    area: { type: String, required: true, trim: true },
  },
  { _id: false }
);

const roomSchema = new Schema<IRoom>(
  {
    ownerId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
      minlength: 5,
      maxlength: 100,
    },
    description: {
      type: String,
      required: true,
      trim: true,
      minlength: 20,
    },
    rent: {
      type: Number,
      required: true,
      min: 1,
    },
    location: {
      type: locationSchema,
      required: true,
    },
    roomType: {
      type: String,
      enum: ['Single', 'Double', 'PG'],
      required: true,
    },
    images: {
      type: [String],
      default: [],
    },
    facilities: {
      type: [String],
      default: [],
    },
    suitableFor: {
      type: [String],
      default: [],
    },
    contactNumber: {
      type: String,
      required: true,
      trim: true,
    },
    availability: {
      type: String,
      enum: ['Available', 'Booked'],
      default: 'Available',
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
roomSchema.index({ ownerId: 1 });
roomSchema.index({ 'location.city': 1, 'location.area': 1 });
roomSchema.index({ availability: 1 });
roomSchema.index({ isDeleted: 1 });
roomSchema.index({ createdAt: -1 });
roomSchema.index(
  { title: 'text', description: 'text' },
  { weights: { title: 10, description: 1 } }
);

export const Room = mongoose.model<IRoom>('Room', roomSchema);
