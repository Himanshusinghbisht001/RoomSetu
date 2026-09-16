import mongoose, { Document, Schema, Types } from 'mongoose';

export type FeedbackType = 'Suggestion' | 'Website Experience' | 'Room Listing' | 'Bug / Error' | 'Feature Request' | 'Other';
export type FeedbackStatus = 'Pending' | 'Reviewed' | 'Resolved';

export interface IFeedback extends Document {
  userId?: Types.ObjectId;
  name: string;
  email: string;
  type: FeedbackType;
  message: string;
  status: FeedbackStatus;
  createdAt: Date;
  updatedAt: Date;
}

const feedbackSchema = new Schema<IFeedback>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: false,
    },
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 100,
    },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      maxlength: 200,
    },
    type: {
      type: String,
      enum: ['Suggestion', 'Website Experience', 'Room Listing', 'Bug / Error', 'Feature Request', 'Other'],
      required: true,
    },
    message: {
      type: String,
      required: true,
      minlength: 10,
      maxlength: 2000,
    },
    status: {
      type: String,
      enum: ['Pending', 'Reviewed', 'Resolved'],
      default: 'Pending',
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

// Indexes
feedbackSchema.index({ userId: 1 });
feedbackSchema.index({ status: 1 });
feedbackSchema.index({ createdAt: -1 });

export const Feedback = mongoose.model<IFeedback>('Feedback', feedbackSchema);
