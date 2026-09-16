import { Request, Response, NextFunction } from 'express';
import * as roomService from './room.service.js';
import {
  createRoomSchema,
  updateRoomSchema,
  updateAvailabilitySchema,
  roomParamsSchema,
  roomQuerySchema,
  ownerRoomQuerySchema,
} from './room.schema.js';

export const createRoom = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validatedData = createRoomSchema.parse(req);
    const ownerId = req.user!.id;
    
    const room = await roomService.createRoom(validatedData.body, ownerId);
    
    res.status(201).json({
      success: true,
      data: room,
    });
  } catch (error) {
    next(error);
  }
};

export const getPublicRooms = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validatedQuery = roomQuerySchema.parse(req);

    const result = await roomService.getPublicRooms(validatedQuery.query);

    res.status(200).json({
      success: true,
      data: result.rooms,
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

export const getLocationCounts = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const city = req.query.city as string | undefined;
    const counts = await roomService.getLocationCounts(city);
    res.status(200).json({
      success: true,
      data: counts,
    });
  } catch (error) {
    next(error);
  }
};

export const getRoomById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validatedParams = roomParamsSchema.parse(req);
    const room = await roomService.getRoomById(validatedParams.params.id);

    res.status(200).json({
      success: true,
      data: room,
    });
  } catch (error) {
    next(error);
  }
};

export const getOwnerRooms = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validated = ownerRoomQuerySchema.parse(req);
    const ownerId = req.user!.id;

    const result = await roomService.getOwnerRooms(ownerId, validated.query);

    res.status(200).json({
      success: true,
      data: result.rooms,
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

export const getDashboardSummary = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const ownerId = req.user!.id;
    const summary = await roomService.getDashboardSummary(ownerId);
    res.status(200).json({ success: true, data: summary });
  } catch (error) {
    next(error);
  }
};

export const updateRoom = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validatedParams = updateRoomSchema.parse(req);
    const ownerId = req.user!.id;

    const room = await roomService.updateRoom(validatedParams.params.id, ownerId, validatedParams.body);

    res.status(200).json({
      success: true,
      data: room,
    });
  } catch (error) {
    next(error);
  }
};

export const softDeleteRoom = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validatedParams = roomParamsSchema.parse(req);
    const ownerId = req.user!.id;

    await roomService.softDeleteRoom(validatedParams.params.id, ownerId);

    res.status(200).json({
      success: true,
      data: { message: 'Room deleted successfully' },
    });
  } catch (error) {
    next(error);
  }
};

export const updateAvailability = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validatedParams = roomParamsSchema.parse(req);
    const validatedBody = updateAvailabilitySchema.parse(req);
    const ownerId = req.user!.id;

    const room = await roomService.updateAvailability(
      validatedParams.params.id,
      ownerId,
      validatedBody.body.availability
    );

    res.status(200).json({
      success: true,
      data: room,
    });
  } catch (error) {
    next(error);
  }
};
