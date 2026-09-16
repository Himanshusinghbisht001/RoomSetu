import { Socket } from 'socket.io';

export interface SocketUser {
  userId: string;
  role: 'seeker' | 'owner';
}

/**
 * Custom Socket interface extending the default Socket.io one.
 * Includes the strongly typed authenticated user context.
 */
export interface AuthenticatedSocket extends Socket {
  user: SocketUser;
}

export interface SocketAuthPayload {
  token?: string;
}
