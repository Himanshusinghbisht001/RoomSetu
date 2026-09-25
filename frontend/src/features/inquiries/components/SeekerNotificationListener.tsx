import React, { useEffect, useState } from 'react';
import { useSocket } from '../../../lib/socket/useSocket.js';
import { useAuth } from '../../../auth/AuthProvider.js';
import { useQueryClient } from '@tanstack/react-query';
import { inquiryKeys } from '../hooks/useInquiries.js';

export const SeekerNotificationListener: React.FC = () => {
  const { user, isAuthenticated } = useAuth();
  const socket = useSocket();
  const queryClient = useQueryClient();
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const isSeeker = isAuthenticated && user?.role === 'seeker';

  useEffect(() => {
    if (!isSeeker) return;

    const handleAccepted = (payload: any) => {
      queryClient.invalidateQueries({ queryKey: inquiryKeys.my() });
      setToast({ message: `Your interest request for "${payload.roomTitle}" was accepted!`, type: 'success' });
      setTimeout(() => setToast(null), 5000);
    };

    const handleRejected = (payload: any) => {
      queryClient.invalidateQueries({ queryKey: inquiryKeys.my() });
      setToast({ message: `Your interest request for "${payload.roomTitle}" was rejected.`, type: 'error' });
      setTimeout(() => setToast(null), 5000);
    };

    socket.on('room:interest:accepted', handleAccepted);
    socket.on('room:interest:rejected', handleRejected);

    return () => {
      socket.off('room:interest:accepted', handleAccepted);
      socket.off('room:interest:rejected', handleRejected);
    };
  }, [socket, isSeeker, queryClient]);

  if (!toast) return null;

  return (
    <div 
      style={{
        position: 'fixed',
        bottom: '20px',
        right: '20px',
        padding: '1rem',
        borderRadius: '8px',
        backgroundColor: toast.type === 'success' ? 'var(--success)' : 'var(--error)',
        color: 'white',
        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
        zIndex: 9999,
        fontWeight: 500,
        animation: 'slideIn 0.3s ease-out'
      }}
      role="alert"
    >
      {toast.message}
    </div>
  );
};
