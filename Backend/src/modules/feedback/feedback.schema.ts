import { z } from 'zod';

export const feedbackTypeSchema = z.enum([
  'Suggestion',
  'Website Experience',
  'Room Listing',
  'Bug / Error',
  'Feature Request',
  'Other',
]);

export const createFeedbackSchema = z.object({
  body: z.object({
    name: z.string().min(2, 'Name must be at least 2 characters').max(100, 'Name must be less than 100 characters'),
    email: z.string().email('Invalid email address').max(200, 'Email must be less than 200 characters'),
    type: feedbackTypeSchema,
    message: z.string().min(10, 'Message must be at least 10 characters').max(2000, 'Message must be less than 2000 characters'),
  }),
});

export type CreateFeedbackInput = z.infer<typeof createFeedbackSchema>['body'];
