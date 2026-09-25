import React, { useState, useMemo } from 'react';
import { useAuth } from '../../../auth/AuthProvider.js';
import { useCreateInquiry, useMyInquiries, useCancelInquiry } from '../hooks/useInquiries.js';
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
  const cancelInquiry = useCancelInquiry();

  const activeInquiry = useMemo(() => {
    if (!myInquiriesData) return null;
    return myInquiriesData.data.find(
      (inq: Inquiry) => 
        (typeof inq.roomId === 'string' ? inq.roomId === roomId : inq.roomId._id === roomId) &&
        (inq.status === 'Pending' || inq.status === 'Accepted')
    );
  }, [myInquiriesData, roomId]);

  // If not authenticated, or not a seeker, don't show the button here
  if (!isAuthenticated || user?.role !== 'seeker') {
    return null;
  }

  if (isLoadingInquiries) {
    return <button className="btn btn-outline w-full text-center mt-3" disabled>Loading...</button>;
  }

  const handleCancel = async () => {
    if (activeInquiry && window.confirm('Are you sure you want to cancel this request?')) {
      try {
        await cancelInquiry.mutateAsync(activeInquiry.id);
      } catch (err) {
        alert('Failed to cancel request.');
      }
    }
  };

  if (activeInquiry) {
    if (activeInquiry.status === 'Pending') {
      return (
        <div style={{ marginTop: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', color: 'var(--success)', fontWeight: 600 }}>
            <span aria-hidden="true">✓</span> Request Sent
          </div>
          <button 
            className="btn btn-outline w-full text-center" 
            onClick={handleCancel}
            disabled={cancelInquiry.isPending}
            style={{ borderColor: 'var(--error)', color: 'var(--error)' }}
          >
            {cancelInquiry.isPending ? 'Cancelling...' : 'Cancel Request'}
          </button>
        </div>
      );
    }
    if (activeInquiry.status === 'Accepted') {
      return (
        <div style={{ marginTop: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', color: 'var(--success)', fontWeight: 600 }}>
          <span aria-hidden="true">✓</span> Interest Accepted
        </div>
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
        className="btn btn-outline w-full text-center"
        style={{ marginTop: '0.75rem' }}
        onClick={() => setShowForm(true)}
      >
        I'm Interested
      </button>
    );
  }

  return (
    <div className="interest-form-card" style={{ padding: '0.75rem', border: '1px solid var(--border)', borderRadius: '8px', marginTop: '0.75rem' }}>
      <h3 style={{ fontSize: '0.95rem', marginBottom: '0.5rem' }}>Send Interest Request</h3>
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
