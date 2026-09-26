import React, { useEffect, useState } from 'react';
import { useSocket } from '../../../lib/socket/useSocket.js';
import { useAuth } from '../../../auth/AuthProvider.js';
import { useQueryClient } from '@tanstack/react-query';
import { inquiryKeys } from '../hooks/useInquiries.js';
import { Link } from 'react-router-dom';

interface ToastData {
  message: string;
  type: 'success' | 'error';
  inquiryId?: string;
}

export const SeekerNotificationListener: React.FC = () => {
  const { user, isAuthenticated } = useAuth();
  const socket = useSocket();
  const queryClient = useQueryClient();
  const [toast, setToast] = useState<ToastData | null>(null);

  const isSeeker = isAuthenticated && user?.role === 'seeker';

  useEffect(() => {
    if (!isSeeker) return;

    const handleAccepted = (payload: any) => {
      queryClient.invalidateQueries({ queryKey: inquiryKeys.my() });
      setToast({ 
        message: `Your interest request for "${payload.roomTitle}" was accepted!`, 
        type: 'success',
        inquiryId: payload.inquiryId
      });
      setTimeout(() => setToast(null), 8000); // Give user a bit more time to click
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
        animation: 'slideIn 0.3s ease-out',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.75rem'
      }}
      role="alert"
    >
      <div>{toast.message}</div>
      {toast.type === 'success' && toast.inquiryId && (
        <Link
          to={`/chat/${toast.inquiryId}`}
          onClick={() => setToast(null)}
          style={{
            backgroundColor: 'white',
            color: 'var(--success)',
            padding: '0.4rem 0.8rem',
            borderRadius: '4px',
            textDecoration: 'none',
            fontSize: '0.85rem',
            fontWeight: 600,
            textAlign: 'center',
            display: 'inline-block'
          }}
        >
          Go to Chat
        </Link>
      )}
    </div>
  );
};
