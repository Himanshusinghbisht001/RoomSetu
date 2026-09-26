import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import { allowedOrigins } from '../config/env.js';
import { logger } from '../utils/logger.js';
import { socketAuth } from './socketAuth.js';
import { AuthenticatedSocket } from './socket.types.js';
import { chatService } from '../modules/chat/chat.service.js';
import { Inquiry } from '../modules/inquiries/inquiry.model.js';

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

    // ── Chat: send message ────────────────────────────────────────────────────
    // Client emits: { inquiryId: string, content: string }
    // Server persists via chatService (same auth rules as REST) then emits
    // chat:message:new to the recipient's private room only.
    socket.on('chat:message:send', async (payload: unknown) => {
      try {
        // Safely extract and validate the payload fields
        if (!payload || typeof payload !== 'object') {
          socket.emit('chat:error', { message: 'Invalid payload' });
          return;
        }

        const { inquiryId, content } = payload as Record<string, unknown>;

        if (typeof inquiryId !== 'string' || !inquiryId.trim()) {
          socket.emit('chat:error', { message: 'inquiryId is required' });
          return;
        }

        if (typeof content !== 'string' || !content.trim()) {
          socket.emit('chat:error', { message: 'content is required' });
          return;
        }

        // chatService.sendMessage enforces:
        //   - inquiry exists & is not deleted
        //   - inquiry.status === 'Accepted'
        //   - userId is roomOwnerId OR seekerId
        //   - senderId = authenticated userId (never from client)
        const message = await chatService.sendMessage(inquiryId.trim(), userId, content);

        // Determine recipient from the inquiry document (never from client)
        const inquiry = await Inquiry.findById(inquiryId.trim()).lean();
        if (!inquiry) {
          // chatService already threw if missing, but guard defensively
          socket.emit('chat:error', { message: 'Inquiry not found' });
          return;
        }

        const recipientId =
          inquiry.roomOwnerId.toString() === userId
            ? inquiry.seekerId.toString()
            : inquiry.roomOwnerId.toString();

        // Serialize before emitting so toJSON transform is applied
        const serialized = message.toJSON();

        // Deliver only to the recipient's private user room
        io.to(`user:${recipientId}`).emit('chat:message:new', serialized);

        logger.info('Chat message delivered', {
          inquiryId: inquiryId.trim(),
          senderId: userId,
          recipientId,
          messageId: serialized.id,
        });
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to send message';
        logger.warn('chat:message:send failed', {
          socketId: socket.id,
          userId,
          error: errorMessage,
        });
        socket.emit('chat:error', { message: errorMessage });
      }
    });
    // ── End chat handler ──────────────────────────────────────────────────────

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
