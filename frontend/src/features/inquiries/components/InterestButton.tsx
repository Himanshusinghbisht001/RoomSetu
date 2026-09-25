import React, { useState, useMemo } from 'react';
import { useAuth } from '../../../auth/AuthProvider.js';
import { useCreateInquiry, useMyInquiries } from '../hooks/useInquiries.js';
import type { Inquiry } from '../types.js';
import { AxiosError } from 'axios';

interface InterestButtonProps {
  roomId: string;
}

export const InterestButton: React.FC<InterestButtonProps> = ({ roomId }) => {
  const { user, isAuthenticated } = useAuth();
  const [message, setMessage] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Fetch seeker's inquiries to determine button state
  const { data: myInquiriesData, isLoading: isLoadingInquiries } = useMyInquiries(1, 50);
  const createInquiry = useCreateInquiry();

  const activeInquiry = useMemo(() => {
    if (!myInquiriesData) return null;
    return myInquiriesData.data.find(
      (inq: Inquiry) => 
        (typeof inq.roomId === 'string' ? inq.roomId === roomId : inq.roomId._id === roomId) &&
        (inq.status === 'Pending' || inq.status === 'Accepted')
    );
  }, [myInquiriesData, roomId]);

  // If not authenticated, or not a seeker, don't show the button here (or show a prompt)
  if (!isAuthenticated || user?.role !== 'seeker') {
    return null;
  }

  if (isLoadingInquiries) {
    return <button className="btn btn-primary" disabled>Loading...</button>;
  }

  if (activeInquiry) {
    if (activeInquiry.status === 'Pending') {
      return (
        <button className="btn btn-primary" disabled style={{ opacity: 0.8 }}>
          Request Sent
        </button>
      );
    }
    if (activeInquiry.status === 'Accepted') {
      return (
        <button className="btn" disabled style={{ backgroundColor: 'var(--success)', color: 'white', opacity: 0.9 }}>
          Interest Accepted
        </button>
      );
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    try {
      await createInquiry.mutateAsync({ roomId, data: { message: message.trim() || undefined } });
      setShowForm(false);
    } catch (error) {
      if (error instanceof AxiosError) {
        if (error.response?.status === 409) {
          setErrorMsg('You have already sent an interest request for this room.');
        } else {
          setErrorMsg(error.response?.data?.error?.message || 'Failed to send request');
        }
      } else {
        setErrorMsg('An unexpected error occurred.');
      }
    }
  };

  if (!showForm) {
    return (
      <button 
        className="btn btn-primary"
        onClick={() => setShowForm(true)}
      >
        I'm Interested
      </button>
    );
  }

  return (
    <div className="interest-form-card" style={{ padding: '1rem', border: '1px solid var(--border)', borderRadius: '8px', marginTop: '1rem' }}>
      <h3 style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>Send Interest Request</h3>
      <form onSubmit={handleSubmit}>
        <textarea
          className="form-input"
          placeholder="Optional: Add a message for the owner..."
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          maxLength={500}
          rows={3}
          style={{ width: '100%', marginBottom: '0.5rem', resize: 'vertical' }}
        />
        {errorMsg && <p style={{ color: 'var(--error)', fontSize: '0.875rem', marginBottom: '0.5rem' }}>{errorMsg}</p>}
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button 
            type="submit" 
            className="btn btn-primary btn-sm"
            disabled={createInquiry.isPending}
          >
            {createInquiry.isPending ? 'Sending...' : 'Send Request'}
          </button>
          <button 
            type="button" 
            className="btn btn-outline btn-sm"
            onClick={() => setShowForm(false)}
            disabled={createInquiry.isPending}
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
};
