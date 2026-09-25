import React from 'react';
import { useReceivedInquiries, useAcceptInquiry, useRejectInquiry } from '../hooks/useInquiries.js';

export const OwnerRequestsList: React.FC = () => {
  const { data, isLoading, isError, refetch } = useReceivedInquiries(1, 10);
  const acceptMutation = useAcceptInquiry();
  const rejectMutation = useRejectInquiry();

  if (isLoading) {
    return <div style={{ padding: '2rem', textAlign: 'center' }}>Loading requests...</div>;
  }

  if (isError) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--error)' }}>
        Failed to load room requests.
        <br />
        <button className="btn btn-outline btn-sm mt-2" onClick={() => refetch()}>Retry</button>
      </div>
    );
  }

  const inquiries = data?.data || [];

  if (inquiries.length === 0) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
        No room requests received yet.
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {inquiries.map((inquiry) => {
        const roomTitle = typeof inquiry.roomId === 'object' ? inquiry.roomId.title : 'Room';
        const seekerName = typeof inquiry.seekerId === 'object' ? inquiry.seekerId.name : 'Seeker';

        return (
          <div 
            key={inquiry.id}
            style={{ 
              border: '1px solid var(--border)', 
              borderRadius: '8px', 
              padding: '1.25rem',
              backgroundColor: 'var(--bg-card)'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
              <div>
                <h3 style={{ fontSize: '1.1rem', marginBottom: '0.25rem' }}>{seekerName}</h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '0.5rem' }}>
                  Interested in: <strong>{roomTitle}</strong>
                </p>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                  Requested on: {new Date(inquiry.createdAt).toLocaleString()}
                </div>
                
                {(inquiry.fromLocation || inquiry.purpose) && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', marginTop: '0.5rem', marginBottom: '0.5rem', fontSize: '0.9rem', color: 'var(--text)' }}>
                    {inquiry.purpose && (
                      <div>
                        <span style={{ color: 'var(--text-muted)' }}>Purpose:</span> <strong>{inquiry.purpose}</strong>
                      </div>
                    )}
                    {inquiry.fromLocation && (
                      <div>
                        <span style={{ color: 'var(--text-muted)' }}>From:</span> <strong>{inquiry.fromLocation}</strong>
                      </div>
                    )}
                  </div>
                )}

                {inquiry.message && (
                  <div style={{ marginTop: '0.75rem', padding: '0.75rem', backgroundColor: 'var(--bg-hover)', borderRadius: '6px', fontSize: '0.95rem' }}>
                    "{inquiry.message}"
                  </div>
                )}
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.5rem' }}>
                <span className={`badge ${inquiry.status === 'Pending' ? 'badge-warning' : inquiry.status === 'Accepted' ? 'badge-success' : 'badge-error'}`}>
                  {inquiry.status}
                </span>

                {inquiry.status === 'Pending' && (
                  <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                    <button 
                      className="btn btn-outline btn-sm"
                      style={{ borderColor: 'var(--error)', color: 'var(--error)' }}
                      disabled={rejectMutation.isPending || acceptMutation.isPending}
                      onClick={() => rejectMutation.mutate(inquiry.id)}
                    >
                      {rejectMutation.isPending && rejectMutation.variables === inquiry.id ? '...' : 'Reject'}
                    </button>
                    <button 
                      className="btn btn-primary btn-sm"
                      style={{ backgroundColor: 'var(--success)', borderColor: 'var(--success)' }}
                      disabled={rejectMutation.isPending || acceptMutation.isPending}
                      onClick={() => acceptMutation.mutate(inquiry.id)}
                    >
                      {acceptMutation.isPending && acceptMutation.variables === inquiry.id ? '...' : 'Accept'}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};
