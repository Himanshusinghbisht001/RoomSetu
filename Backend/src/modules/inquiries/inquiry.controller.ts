import { Request, Response, NextFunction } from 'express';
import * as inquiryService from './inquiry.service.js';
import {
  createInquirySchema,
  inquiryParamsSchema,
  inquiryQuerySchema,
} from './inquiry.schema.js';

/**
 * POST /api/v1/rooms/:roomId/inquiries
 * Create a new interest inquiry for a room.
 */
export const createInquiry = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validated = createInquirySchema.parse(req);
    const seekerId = req.user!.id;

    const inquiry = await inquiryService.createInquiry(
      validated.params.roomId,
      seekerId,
      validated.body,
    );

    res.status(201).json({
      success: true,
      data: inquiry,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/inquiries/received
 * Get inquiries received by the authenticated owner.
 */
export const getReceivedInquiries = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validated = inquiryQuerySchema.parse(req);
    const ownerId = req.user!.id;

    const result = await inquiryService.getReceivedInquiries(ownerId, validated.query);

    res.status(200).json({
      success: true,
      data: result.inquiries,
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

/**
 * GET /api/v1/inquiries/my
 * Get inquiries sent by the authenticated seeker.
 */
export const getMyInquiries = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validated = inquiryQuerySchema.parse(req);
    const seekerId = req.user!.id;

    const result = await inquiryService.getMyInquiries(seekerId, validated.query);

    res.status(200).json({
      success: true,
      data: result.inquiries,
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

/**
 * PATCH /api/v1/inquiries/:inquiryId/accept
 * Accept a pending inquiry (owner only).
 */
export const acceptInquiry = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validated = inquiryParamsSchema.parse(req);
    const ownerId = req.user!.id;

    const inquiry = await inquiryService.acceptInquiry(validated.params.inquiryId, ownerId);

    res.status(200).json({
      success: true,
      data: inquiry,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/v1/inquiries/:inquiryId/reject
 * Reject a pending inquiry (owner only).
 */
export const rejectInquiry = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validated = inquiryParamsSchema.parse(req);
    const ownerId = req.user!.id;

    const inquiry = await inquiryService.rejectInquiry(validated.params.inquiryId, ownerId);

    res.status(200).json({
      success: true,
      data: inquiry,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/v1/inquiries/:inquiryId/cancel
 * Cancel a pending inquiry (seeker only).
 */
export const cancelInquiry = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validated = inquiryParamsSchema.parse(req);
    const seekerId = req.user!.id;

    const inquiry = await inquiryService.cancelInquiry(validated.params.inquiryId, seekerId);

    res.status(200).json({
      success: true,
      data: inquiry,
    });
  } catch (error) {
    next(error);
  }
};
