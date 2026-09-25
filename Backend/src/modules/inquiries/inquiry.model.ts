import mongoose, { Document, Schema, Types } from 'mongoose';

/**
 * Active inquiry statuses — a seeker can have only ONE inquiry with these
 * statuses for the same room at any given time.
 */
export const ACTIVE_STATUSES = ['Pending', 'Accepted'] as const;

export const INQUIRY_STATUSES = ['Pending', 'Accepted', 'Rejected', 'Cancelled'] as const;
export type InquiryStatus = (typeof INQUIRY_STATUSES)[number];

export const PURPOSE_OPTIONS = [
  'Student',
  'Working Professional',
  'Business',
  'Family / Relocation',
  'Other',
] as const;
export type InquiryPurpose = (typeof PURPOSE_OPTIONS)[number];

export interface IInquiry extends Document {
  roomId: Types.ObjectId;
  roomOwnerId: Types.ObjectId;
  seekerId: Types.ObjectId;
  fromLocation: string;
  purpose: InquiryPurpose;
  message?: string;
  status: InquiryStatus;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const inquirySchema = new Schema<IInquiry>(
  {
    roomId: {
      type: Schema.Types.ObjectId,
      ref: 'Room',
      required: true,
    },
    roomOwnerId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    seekerId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    fromLocation: {
      type: String,
      trim: true,
      required: true,
    },
    purpose: {
      type: String,
      enum: PURPOSE_OPTIONS,
      required: true,
    },
    message: {
      type: String,
      trim: true,
      default: undefined,
    },
    status: {
      type: String,
      enum: INQUIRY_STATUSES,
      default: 'Pending',
      required: true,
    },
    isDeleted: {
      type: Boolean,
      default: false,
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

// ── Indexes ────────────────────────────────────────────────────────────────────
// Enforces uniqueness: one active inquiry per seeker per room.
// Partial filter limits to active statuses only, so Rejected/Cancelled
// entries don't block new inquiries.
inquirySchema.index(
  { roomId: 1, seekerId: 1 },
  {
    unique: true,
    partialFilterExpression: { status: { $in: ACTIVE_STATUSES }, isDeleted: false },
  }
);

// Owner's received inquiries filtered by status
inquirySchema.index({ roomOwnerId: 1, status: 1 });

// Seeker's sent inquiries filtered by status
inquirySchema.index({ seekerId: 1, status: 1 });

// Sorting by creation date (newest first)
inquirySchema.index({ createdAt: -1 });

export const Inquiry = mongoose.model<IInquiry>('Inquiry', inquirySchema);
