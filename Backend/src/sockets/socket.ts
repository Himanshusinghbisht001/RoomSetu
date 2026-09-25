import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import { allowedOrigins } from '../config/env.js';
import { logger } from '../utils/logger.js';
import { socketAuth } from './socketAuth.js';
import { AuthenticatedSocket } from './socket.types.js';

let io: Server;

export const initSocketServer = (httpServer: HttpServer): Server => {
  io = new Server(httpServer, {
    cors: {
      origin: allowedOrigins,
      methods: ['GET', 'POST'],
      credentials: true,
    },
  } as unknown as Partial<import('socket.io').ServerOptions>);

  // Apply authentication middleware
  io.use(socketAuth);

  io.sockets.on('connection', (socket: Socket) => {
    const authSocket = socket as AuthenticatedSocket;
    const { userId, role } = authSocket.user;

    // Join a user-specific room for targeted notifications
    void socket.join(`user:${userId}`);

    logger.info('Socket connected', { 
      socketId: socket.id, 
      userId, 
      role 
    });

    socket.on('disconnect', (reason: string) => {
      logger.info('Socket disconnected', { 
        socketId: socket.id, 
        userId, 
        reason 
      });
    });
    
    socket.on('error', (err: Error) => {
      logger.error('Socket error', {
        socketId: socket.id,
        userId,
        error: err.message
      });
    });
  });

  return io;
};

export const getIO = (): Server => {
  if (!io) {
    throw new Error('Socket.io has not been initialized');
  }
  return io;
};
