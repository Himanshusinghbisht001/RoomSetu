import { createContext, useEffect, type ReactNode } from 'react';
import { socket } from './socket.js';
import { useAuth } from '../../auth/AuthProvider.js';
import { tokenStore } from '../../auth/tokenStore.js';
import { Socket } from 'socket.io-client';

export const SocketContext = createContext<Socket | null>(null);

export function SocketProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated, loading } = useAuth();

  useEffect(() => {
    if (loading) return;

    if (isAuthenticated) {
      const token = tokenStore.get();
      if (token) {
        socket.auth = { token };
        socket.connect();
      }
    } else {
      socket.disconnect();
    }

    return () => {
      socket.disconnect();
    };
  }, [isAuthenticated, loading]);

  return (
    <SocketContext.Provider value={socket}>
      {children}
    </SocketContext.Provider>
  );
}
