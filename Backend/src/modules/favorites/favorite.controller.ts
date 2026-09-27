import { Request, Response, NextFunction } from 'express';
import { favoriteService } from './favorite.service.js';
import { sendSuccess } from '../../utils/response.js';

export const addFavorite = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const roomId = String(req.params['roomId']);
    const result = await favoriteService.addFavorite(userId, roomId);
    sendSuccess(res, result, 201);
  } catch (err) {
    next(err);
  }
};

export const removeFavorite = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const roomId = String(req.params['roomId']);
    const result = await favoriteService.removeFavorite(userId, roomId);
    sendSuccess(res, result);
  } catch (err) {
    next(err);
  }
};

export const getFavorites = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const page = parseInt(req.query['page'] as string, 10) || 1;
    const limit = parseInt(req.query['limit'] as string, 10) || 10;
    
    const result = await favoriteService.getFavorites(userId, page, limit);
    sendSuccess(res, result);
  } catch (err) {
    next(err);
  }
};

export const checkFavorite = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const roomId = String(req.params['roomId']);
    const result = await favoriteService.checkFavorite(userId, roomId);
    sendSuccess(res, result);
  } catch (err) {
    next(err);
  }
};
