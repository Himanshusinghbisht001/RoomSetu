import { Feedback } from './feedback.model.js';
import { CreateFeedbackInput } from './feedback.schema.js';
import { Types } from 'mongoose';

export const createFeedback = async (data: CreateFeedbackInput, userId?: string) => {
  const feedbackData: any = {
    ...data,
    status: 'Pending',
  };

  if (userId) {
    feedbackData.userId = new Types.ObjectId(userId);
  }

  const feedback = await Feedback.create(feedbackData);
  return feedback;
};
