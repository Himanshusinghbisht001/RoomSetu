import { Types } from 'mongoose';
import { Inquiry } from '../inquiries/inquiry.model.js';
import { Message, IMessage } from './message.model.js';
import { AppError } from '../../utils/AppError.js';

/**
 * Validates chat authorization for a given inquiry.
 * Returns the Inquiry document if valid.
 */
async function validateChatAuthorization(inquiryId: string, userId: string) {
  if (!Types.ObjectId.isValid(inquiryId)) {
    throw AppError.badRequest('Invalid inquiry ID');
  }

  const inquiry = await Inquiry.findById(inquiryId);
  if (!inquiry || inquiry.isDeleted) {
    throw AppError.notFound('Inquiry not found');
  }

  if (inquiry.status !== 'Accepted') {
    throw AppError.forbidden('Chat is only allowed for accepted inquiries');
  }

  const isOwner = inquiry.roomOwnerId.toString() === userId;
  const isSeeker = inquiry.seekerId.toString() === userId;

  if (!isOwner && !isSeeker) {
    throw AppError.forbidden('You are not authorized to view or send messages for this inquiry');
  }

  return inquiry;
}

export const chatService = {
  /**
   * Retrieves messages for an accepted inquiry.
   */
  async getMessages(inquiryId: string, userId: string): Promise<IMessage[]> {
    await validateChatAuthorization(inquiryId, userId);

    // Fetch messages sorted oldest to newest
    const messages = await Message.find({ inquiryId })
      .sort({ createdAt: 1 })
      .exec();

    return messages;
  },

  /**
   * Sends a new message in an accepted inquiry.
   */
  async sendMessage(inquiryId: string, userId: string, content: string): Promise<IMessage> {
    await validateChatAuthorization(inquiryId, userId);

    if (!content || content.trim().length === 0) {
      throw AppError.badRequest('Message content cannot be empty');
    }

    const message = new Message({
      inquiryId,
      senderId: userId,
      content: content.trim(),
      isRead: false,
    });

    await message.save();

    return message;
  },
};
