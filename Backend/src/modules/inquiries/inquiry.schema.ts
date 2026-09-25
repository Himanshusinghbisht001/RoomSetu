import { z } from 'zod';
import { Types } from 'mongoose';

// Custom validator for MongoDB ObjectId — matches existing project convention
const objectIdValidator = z.string().refine((val: string) => Types.ObjectId.isValid(val), {
  message: 'Invalid ObjectId',
});

// ── Create Inquiry ──────────────────────────────────────────────────────────────

export const createInquirySchema = z.object({
  params: z.object({
    roomId: objectIdValidator,
  }),
  body: z.object({
    fromLocation: z
      .string({ message: 'fromLocation is required' })
      .trim()
      .min(1, 'fromLocation cannot be empty')
      .max(100, 'fromLocation is too long (max 100 characters)'),
    purpose: z.enum(
      ['Student', 'Working Professional', 'Business', 'Family / Relocation', 'Other'],
      { message: 'Invalid purpose value' }
    ),
    message: z
      .string()
      .trim()
      .min(1, 'Message cannot be empty')
      .max(500, 'Message is too long (max 500 characters)')
      .optional(),
  }),
});

export type CreateInquiryInput = z.infer<typeof createInquirySchema>['body'];


// ── Inquiry ID Param ────────────────────────────────────────────────────────────

export const inquiryParamsSchema = z.object({
  params: z.object({
    inquiryId: objectIdValidator,
  }),
});

// ── Inquiry List Query (pagination) ─────────────────────────────────────────────

export const inquiryQuerySchema = z.object({
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

export type InquiryQuery = z.infer<typeof inquiryQuerySchema>['query'];
