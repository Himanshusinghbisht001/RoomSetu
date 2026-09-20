import { z } from 'zod';
import { Types } from 'mongoose';

// Custom validator for MongoDB ObjectId
const objectIdValidator = z.string().refine((val: string) => Types.ObjectId.isValid(val), {
  message: 'Invalid ObjectId',
});

export const createReviewSchema = z.object({
  params: z.object({
    roomId: objectIdValidator,
  }),
  body: z.object({
    rating: z.number().int().min(1, 'Rating must be at least 1').max(5, 'Rating must be at most 5'),
    comment: z.string().trim().min(1, 'Comment is required').max(500, 'Comment is too long (max 500 characters)'),
  }),
});

export const updateReviewSchema = z.object({
  params: z.object({
    reviewId: objectIdValidator,
  }),
  body: z.object({
    rating: z.number().int().min(1).max(5).optional(),
    comment: z.string().trim().min(1).max(500).optional(),
  }).refine(data => data.rating !== undefined || data.comment !== undefined, {
    message: "At least one field (rating or comment) must be provided for update",
    path: ["body"]
  }),
});

export const reviewParamsSchema = z.object({
  params: z.object({
    reviewId: objectIdValidator,
  }),
});

export const roomReviewParamsSchema = z.object({
  params: z.object({
    roomId: objectIdValidator,
  }),
});

export const reviewQuerySchema = z.object({
  query: z.object({
    page: z
      .string()
      .optional()
      .transform((val: string | undefined) => (val ? parseInt(val, 10) : 1))
      .refine((v: number) => v >= 1, { message: 'page must be >= 1' }),
    limit: z
      .string()
      .optional()
      .transform((val: string | undefined) => (val ? parseInt(val, 10) : 10))
      .refine((v: number) => v >= 1 && v <= 50, { message: 'limit must be between 1 and 50' }),
  }),
});

export type ReviewQuery = z.infer<typeof reviewQuerySchema>['query'];
export type CreateReviewInput = z.infer<typeof createReviewSchema>['body'];
export type UpdateReviewInput = z.infer<typeof updateReviewSchema>['body'];
