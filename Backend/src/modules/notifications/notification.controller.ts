import { Request, Response, NextFunction } from 'express';
import * as notificationService from './notification.service.js';
import { subscribeSchema, unsubscribeSchema } from './notification.schema.js';

export const subscribe = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const input = subscribeSchema.parse(req).body;
    const result = await notificationService.subscribe(req.user!.id, input);

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const unsubscribe = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const input = unsubscribeSchema.parse(req).body;
    await notificationService.unsubscribe(req.user!.id, input);

    res.status(200).json({
      success: true,
      data: {
        message: 'Unsubscribed successfully',
      },
    });
  } catch (error) {
    next(error);
  }
};
