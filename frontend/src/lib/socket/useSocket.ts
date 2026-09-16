import { useContext } from 'react';
import { SocketContext } from './SocketProvider.js';
import { Socket } from 'socket.io-client';

export function useSocket(): Socket {
  const context = useContext(SocketContext);
  
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  
  return context;
}
