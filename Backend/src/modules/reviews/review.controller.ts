import { Request, Response, NextFunction } from 'express';
import * as reviewService from './review.service.js';
import {
  createReviewSchema,
  updateReviewSchema,
  reviewQuerySchema,
  roomReviewParamsSchema,
  reviewParamsSchema,
} from './review.schema.js';

export const createReview = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validatedParams = createReviewSchema.parse(req);
    const userId = req.user!.id; // from requireAuth middleware
    
    const review = await reviewService.createReview(
      validatedParams.params.roomId,
      userId,
      validatedParams.body
    );
    
    res.status(201).json({
      success: true,
      data: review,
    });
  } catch (error) {
    next(error);
  }
};

export const getRoomReviews = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validatedParams = roomReviewParamsSchema.parse(req);
    const validatedQuery = reviewQuerySchema.parse(req);

    const result = await reviewService.getRoomReviews(
      validatedParams.params.roomId,
      validatedQuery.query
    );

    res.status(200).json({
      success: true,
      data: result.reviews,
      pagination: {
        total: result.total,
        page: result.page,
        limit: result.limit,
        totalPages: result.totalPages,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getRoomRatingSummary = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validatedParams = roomReviewParamsSchema.parse(req);
    const summary = await reviewService.getRoomRatingSummary(validatedParams.params.roomId);

    res.status(200).json({
      success: true,
      data: summary,
    });
  } catch (error) {
    next(error);
  }
};

export const updateReview = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validatedData = updateReviewSchema.parse(req);
    const userId = req.user!.id; // from requireAuth middleware

    const review = await reviewService.updateReview(
      validatedData.params.reviewId,
      userId,
      validatedData.body
    );

    res.status(200).json({
      success: true,
      data: review,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteReview = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validatedParams = reviewParamsSchema.parse(req);
    const userId = req.user!.id; // from requireAuth middleware

    await reviewService.softDeleteReview(
      validatedParams.params.reviewId,
      userId
    );

    res.status(200).json({
      success: true,
      data: { message: 'Review deleted successfully' },
    });
  } catch (error) {
    next(error);
  }
};
