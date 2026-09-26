import { io, Socket } from 'socket.io-client';
import { env } from '../env.js';

// Derive the socket URL from the validated VITE_API_BASE_URL
// using .origin to safely strip any trailing paths like /api/v1
const SOCKET_URL = new URL(env.VITE_API_BASE_URL).origin;

export const socket: Socket = io(SOCKET_URL, {
  autoConnect: false, // Don't connect until authenticated
  withCredentials: true,
});
