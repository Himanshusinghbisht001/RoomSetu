import { z } from 'zod';
import { Types } from 'mongoose';

// Custom validator for MongoDB ObjectId
const objectIdValidator = z.string().refine((val: string) => Types.ObjectId.isValid(val), {
  message: 'Invalid ObjectId',
});

const locationSchema = z.object({
  country: z.string().min(1, 'Country is required'),
  state: z.string().min(1, 'State is required'),
  city: z.string().min(1, 'City is required'),
  area: z.string().min(1, 'Area is required'),
});

const roomTypeSchema = z.enum(['Single', 'Double', 'PG']);
const availabilitySchema = z.enum(['Available', 'Booked']);

const facilitiesSchema = z.array(z.string()).optional();
const suitableForSchema = z.array(z.string()).optional();

export const createRoomSchema = z.object({
  body: z.object({
    title: z.string().min(5, 'Title must be at least 5 characters').max(100),
    description: z.string().min(20, 'Description must be at least 20 characters'),
    rent: z.number().positive('Rent must be greater than zero'),
    location: locationSchema,
    roomType: roomTypeSchema,
    images: z.array(z.string().url('Images must be valid URLs')).optional(),
    facilities: facilitiesSchema,
    suitableFor: suitableForSchema,
    contactNumber: z.string().regex(/^\+?[\d\s-]+$/, 'Invalid contact number format').min(10, 'Contact number is too short').max(15, 'Contact number is too long'),
  }),
});

export const updateRoomSchema = z.object({
  params: z.object({
    id: objectIdValidator,
  }),
  body: z.object({
    title: z.string().min(5).max(100).optional(),
    description: z.string().min(20).optional(),
    rent: z.number().positive().optional(),
    location: locationSchema.optional(),
    roomType: roomTypeSchema.optional(),
    images: z.array(z.string().url('Images must be valid URLs')).optional(),
    facilities: facilitiesSchema,
    suitableFor: suitableForSchema,
    contactNumber: z.string().regex(/^\+?[\d\s-]+$/, 'Invalid contact number format').min(10).max(15).optional(),
  }),
});

export const updateAvailabilitySchema = z.object({
  params: z.object({
    id: objectIdValidator,
  }),
  body: z.object({
    availability: availabilitySchema,
  }),
});

export const roomParamsSchema = z.object({
  params: z.object({
    id: objectIdValidator,
  }),
});

const sortOptions = z.enum(['newest', 'oldest', 'rent_asc', 'rent_desc']).optional();

export const roomQuerySchema = z.object({
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
    search: z.string().max(100).optional(),
    availability: z.enum(['Available', 'Booked']).optional(),
    roomType: z.enum(['Single', 'Double', 'PG']).optional(),
    city: z.string().max(100).optional(),
    area: z.string().max(100).optional(),
    sort: sortOptions,
  }),
});

export type RoomQuery = z.infer<typeof roomQuerySchema>['query'];

export type CreateRoomInput = z.infer<typeof createRoomSchema>['body'];
export type UpdateRoomInput = z.infer<typeof updateRoomSchema>['body'];
export type UpdateAvailabilityInput = z.infer<typeof updateAvailabilitySchema>['body'];

// ── Phase 4: Owner Dashboard query schema ────────────────────────────────────

export const ownerRoomQuerySchema = z.object({
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
    availability: z.enum(['Available', 'Booked']).optional(),
    roomType: z.enum(['Single', 'Double', 'PG']).optional(),
    city: z.string().max(100).optional(),
    area: z.string().max(100).optional(),
    search: z.string().max(100).optional(),
    sort: sortOptions,
    includeDeleted: z
      .string()
      .optional()
      .transform((val: string | undefined) => val === 'true'),
  }),
});

export type OwnerRoomQuery = z.infer<typeof ownerRoomQuerySchema>['query'];
