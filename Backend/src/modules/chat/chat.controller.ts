import { Request, Response, NextFunction } from 'express';
import { chatService } from './chat.service.js';
import { sendSuccess } from '../../utils/response.js';
import { AppError } from '../../utils/AppError.js';

export const chatController = {
  /**
   * Retrieves messages for an accepted inquiry.
   */
  async getMessages(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const inquiryId = req.params['inquiryId'] as string;
      const userId = req.user?.id;

      if (!userId) {
        throw AppError.unauthorized('User not authenticated');
      }

      const messages = await chatService.getMessages(inquiryId, userId);

      sendSuccess(res, messages);
    } catch (error) {
      next(error);
    }
  },

  /**
   * Sends a new message in an accepted inquiry.
   */
  async sendMessage(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const inquiryId = req.params['inquiryId'] as string;
      const userId = req.user?.id;
      const { content } = req.body;

      if (!userId) {
        throw AppError.unauthorized('User not authenticated');
      }

      const message = await chatService.sendMessage(inquiryId, userId, content);

      // Return 201 Created for a new message
      res.status(201).json({
        success: true,
        data: message,
      });
    } catch (error) {
      next(error);
    }
  },
};
