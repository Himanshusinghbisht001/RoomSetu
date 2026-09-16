import { useEffect } from 'react';
import MembershipCertificate from './MembershipCertificate.js';

interface Props {
  onClose: () => void;
}

export default function MembershipCertificateModal({ onClose }: Props) {
  // Prevent body scroll while modal is open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <div
      className="modal-overlay"
      role="presentation"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem 1rem',
        zIndex: 9999,
        backgroundColor: 'rgba(15, 23, 42, 0.8)',
        backdropFilter: 'blur(4px)',
      }}
    >
      <div
        className="modal-content"
        role="dialog"
        aria-modal="true"
        aria-labelledby="certificate-modal-title"
        style={{
          width: '100%',
          maxWidth: '920px',
          maxHeight: '90vh',
          overflowY: 'auto',
          backgroundColor: '#fff',
          borderRadius: '16px',
          padding: '2rem',
          position: 'relative',
        }}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="btn btn-ghost"
          aria-label="Close certificate"
          style={{
            position: 'absolute',
            top: '1rem',
            right: '1rem',
            fontSize: '1.5rem',
            width: '40px',
            height: '40px',
            padding: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10,
          }}
        >
          ✕
        </button>

        {/* Modal header */}
        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <h2
            id="certificate-modal-title"
            style={{ fontSize: '1.75rem', fontWeight: 'bold', color: '#0f172a', marginBottom: '0.4rem' }}
          >
            🎉 Your Certificate is Ready!
          </h2>
          <p style={{ color: '#64748b', fontSize: '1rem' }}>
            Thank you for being a part of RoomSetu.
          </p>
        </div>

        {/* The certificate image + download/share buttons */}
        <MembershipCertificate />

        {/* Footer */}
        <div
          style={{
            textAlign: 'center',
            marginTop: '1.5rem',
            borderTop: '1px solid #e2e8f0',
            paddingTop: '1.25rem',
          }}
        >
          <p style={{ fontSize: '0.85rem', color: '#94a3b8', marginBottom: '0.75rem' }}>
            ℹ️ You can download or share this certificate anytime from your dashboard.
          </p>
          <button onClick={onClose} className="btn btn-secondary">
            Go to Dashboard →
          </button>
        </div>
      </div>
    </div>
  );
}
