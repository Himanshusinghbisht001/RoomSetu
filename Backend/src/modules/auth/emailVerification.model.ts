import mongoose, { Document, Schema } from 'mongoose';

export interface IEmailVerification extends Document {
  userId: mongoose.Types.ObjectId;
  email: string;
  otpHash: string;
  expiresAt: Date;
  attempts: number;
  lastSentAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const emailVerificationSchema = new Schema<IEmailVerification>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    otpHash: {
      type: String,
      required: true,
      // NEVER expose otpHash in API responses — only stored as hashed value
    },
    expiresAt: {
      type: Date,
      required: true,
      // TTL index: MongoDB automatically removes the document after expiresAt
      index: { expires: 0 },
    },
    attempts: {
      type: Number,
      default: 0,
    },
    lastSentAt: {
      type: Date,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

export const EmailVerification = mongoose.model<IEmailVerification>(
  'EmailVerification',
  emailVerificationSchema
);
