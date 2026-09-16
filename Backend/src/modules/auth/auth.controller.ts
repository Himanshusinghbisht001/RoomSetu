import { Request, Response, NextFunction } from 'express';
import { rateLimit } from 'express-rate-limit';
import * as authService from './auth.service.js';
import { registerSchema, loginSchema } from './auth.schema.js';
import { isProd } from '../../config/env.js';

// Rate limiting for auth endpoints
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // Limit each IP to 20 auth requests per windowMs
  message: {
    success: false,
    error: {
      code: 'TOO_MANY_REQUESTS',
      message: 'Too many authentication attempts. Please try again later.'
    }
  }
});

const COOKIE_NAME = 'roomsetu_refresh';

const setRefreshCookie = (res: Response, token: string) => {
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    secure: isProd,
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in ms
  });
};

const clearRefreshCookie = (res: Response) => {
  res.cookie(COOKIE_NAME, '', {
    httpOnly: true,
    secure: isProd,
    sameSite: 'strict',
    expires: new Date(0),
  });
};

export const register = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const input = registerSchema.parse(req).body;
    const user = await authService.register(input);

    res.status(201).json({
      success: true,
      data: user,
    });
  } catch (error) {
    next(error);
  }
};

export const login = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const input = loginSchema.parse(req).body;
    const { user, accessToken, refreshToken } = await authService.login(input);

    setRefreshCookie(res, refreshToken);

    res.json({
      success: true,
      data: {
        user,
        accessToken,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const refresh = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const refreshToken = req.cookies[COOKIE_NAME];
    
    if (!refreshToken) {
      res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'No refresh token provided',
        },
      });
      return;
    }

    const { accessToken, refreshToken: newRefreshToken } = await authService.refresh(refreshToken);

    setRefreshCookie(res, newRefreshToken);

    res.json({
      success: true,
      data: {
        accessToken,
      },
    });
  } catch (error) {
    clearRefreshCookie(res);
    next(error);
  }
};

export const logout = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const refreshToken = req.cookies[COOKIE_NAME];
    await authService.logout(refreshToken);
    
    clearRefreshCookie(res);

    res.json({
      success: true,
      data: {
        message: 'Logged out successfully',
      },
    });
  } catch (error) {
    next(error);
  }
};
