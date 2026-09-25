import React, { useEffect, useState, useRef } from 'react';
import { useSocket } from '../../../lib/socket/useSocket.js';
import { useAuth } from '../../../auth/AuthProvider.js';
import { useReceivedInquiries } from '../hooks/useInquiries.js';
import { useNavigate } from 'react-router-dom';

export const NotificationBell: React.FC = () => {
  const { user, isAuthenticated } = useAuth();
  const socket = useSocket();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const isOwner = isAuthenticated && user?.role === 'owner';

  // Fetch initial notifications (Pending inquiries) for owners
  const { data } = useReceivedInquiries(1, 20);

  useEffect(() => {
    if (isOwner && data?.data) {
      const pending = data.data.filter((inq) => inq.status === 'Pending');
      setNotifications(pending);
    }
  }, [data, isOwner]);

  useEffect(() => {
    if (!isOwner) return;

    const handleNewInterest = (payload: any) => {
      // payload: inquiryId, roomId, roomTitle, seekerId, seekerName, status, createdAt
      setNotifications((prev) => [payload, ...prev]);
    };

    socket.on('room:interest:new', handleNewInterest);

    return () => {
      socket.off('room:interest:new', handleNewInterest);
    };
  }, [socket, isOwner]);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [isOpen]);

  if (!isOwner) return null;

  const unreadCount = notifications.length;

  return (
    <div className="notification-bell-container" ref={dropdownRef} style={{ position: 'relative' }}>
      <button 
        className="btn btn-ghost"
        style={{ position: 'relative', padding: '0.5rem', fontSize: '1.25rem' }}
        onClick={() => setIsOpen(!isOpen)}
        aria-label={`Notifications ${unreadCount > 0 ? `(${unreadCount} unread)` : ''}`}
      >
        🔔
        {unreadCount > 0 && (
          <span 
            className="badge badge-error badge-sm"
            style={{ 
              position: 'absolute', 
              top: '0', 
              right: '0', 
              transform: 'translate(25%, -25%)',
              fontSize: '0.7rem',
              padding: '0.1rem 0.3rem',
              borderRadius: '99px'
            }}
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div 
          className="notification-dropdown"
          style={{
            position: 'absolute',
            top: '100%',
            right: 0,
            width: '320px',
            backgroundColor: 'var(--bg-card)',
            border: '1px solid var(--border)',
            borderRadius: '8px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            zIndex: 50,
            marginTop: '0.5rem',
            overflow: 'hidden'
          }}
          role="menu"
        >
          <div style={{ padding: '1rem', borderBottom: '1px solid var(--border)', fontWeight: 600 }}>
            Notifications
          </div>
          <div style={{ maxHeight: '350px', overflowY: 'auto' }}>
            {notifications.length === 0 ? (
              <div style={{ padding: '2rem 1rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                No new notifications
              </div>
            ) : (
              notifications.map((notif, idx) => (
                <div 
                  key={notif.id || notif.inquiryId || idx}
                  style={{
                    padding: '1rem',
                    borderBottom: '1px solid var(--border)',
                    cursor: 'pointer',
                    transition: 'background 0.2s',
                  }}
                  onClick={() => {
                    setIsOpen(false);
                    navigate('/owner');
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--bg-hover)')}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                  role="menuitem"
                >
                  <div style={{ fontWeight: 600, fontSize: '0.9rem', marginBottom: '0.25rem' }}>
                    New Interest Request
                  </div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                    {notif.seekerName || (notif.seekerId && notif.seekerId.name)} is interested in "{notif.roomTitle || (notif.roomId && notif.roomId.title)}"
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
                    {new Date(notif.createdAt).toLocaleString()}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
