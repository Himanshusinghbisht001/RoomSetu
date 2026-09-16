import { Request, Response, NextFunction } from 'express';
import * as userService from './user.service.js';

export const getMe = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const profile = await userService.getUserProfile(userId);
    
    res.json({
      success: true,
      data: profile,
    });
  } catch (error) {
    next(error);
  }
};

export const exportMe = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const data = await userService.exportUser(userId);
    
    res.json({
      success: true,
      data,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteMe = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const { confirmation } = req.body;
    
    await userService.softDeleteUser(userId, confirmation);
    
    res.json({
      success: true,
      data: { message: 'Account and associated data deleted successfully' },
    });
  } catch (error) {
    next(error);
  }
};

