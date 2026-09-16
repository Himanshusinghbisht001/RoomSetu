import { Request, Response, NextFunction } from 'express';
import * as feedbackService from './feedback.service.js';
import { createFeedbackSchema } from './feedback.schema.js';
import { sendFeedbackNotification } from '../../services/email.service.js';

export const createFeedback = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // 1. Validate request
    const validatedData = createFeedbackSchema.parse(req);
    const userId = req.user?.id; // will be undefined for guests

    // 2. Save feedback to MongoDB — this MUST succeed before email is attempted
    const feedback = await feedbackService.createFeedback(validatedData.body, userId);

    // 3. Trigger email notification — fire-and-forget
    //    The inner sendFeedbackNotification() never throws (it catches internally).
    //    The outer .catch() is a defensive safety net.
    void sendFeedbackNotification(feedback).catch(() => {
      // Already handled inside sendFeedbackNotification; this is extra safety.
    });

    // 4. Return 201 — regardless of email delivery outcome
    const responseData = feedback.toJSON();
    delete responseData.userId; // Never expose userId per requirements

    res.status(201).json({
      success: true,
      data: responseData,
    });
  } catch (error) {
    next(error);
  }
};
