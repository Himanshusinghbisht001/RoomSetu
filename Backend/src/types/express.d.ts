import { Request } from 'express';

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        role: 'seeker' | 'owner';
      };
    }
  }
}

// Ensure this file is treated as a module
export {};
