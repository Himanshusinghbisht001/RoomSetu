import { Socket } from 'socket.io';
import { AuthenticatedSocket } from './socket.types.js';
import { logger } from '../utils/logger.js';

/**
 * Higher-order function to create a middleware that enforces a specific role on the socket connection.
 * Note: This should be used after `socketAuth` middleware.
 */
export const requireSocketRole = (role: 'seeker' | 'owner') => {
  return (socket: Socket, next: (err?: Error) => void) => {
    const authSocket = socket as AuthenticatedSocket;
    
    if (!authSocket.user || authSocket.user.role !== role) {
      logger.warn('Socket connection rejected: Insufficient permissions', { 
        socketId: socket.id,
        requiredRole: role,
        actualRole: authSocket.user?.role
      });
      return next(new Error('Authorization error: Insufficient permissions'));
    }
    
    next();
  };
};
