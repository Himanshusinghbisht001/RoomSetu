import jwt from 'jsonwebtoken';
import { Socket } from 'socket.io';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';
import { AuthenticatedSocket, SocketAuthPayload } from './socket.types.js';

interface TokenPayload {
  sub: string;
  role: 'seeker' | 'owner';
}

/**
 * Socket.io middleware to authenticate connections using the existing JWT architecture.
 */
export const socketAuth = (socket: Socket, next: (err?: Error) => void) => {
  try {
    const auth = socket.handshake.auth as SocketAuthPayload;
    const token = auth?.token;

    if (!token) {
      logger.warn('Socket connection rejected: Missing token', { socketId: socket.id });
      return next(new Error('Authentication error: Missing token'));
    }

    // Verify token using the same secret as the REST API
    const payload = jwt.verify(token, env.JWT_ACCESS_SECRET) as TokenPayload;

    // Attach user to the socket context safely (no sensitive data)
    (socket as AuthenticatedSocket).user = {
      userId: payload.sub,
      role: payload.role,
    };

    next();
  } catch {
    logger.warn('Socket connection rejected: Invalid or expired token', { socketId: socket.id });
    // Safe client-facing error
    next(new Error('Authentication error: Invalid or expired token'));
  }
};
