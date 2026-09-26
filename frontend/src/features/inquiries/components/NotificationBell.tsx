import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useSocket } from '../../../lib/socket/useSocket.js';
import { useAuth } from '../../../auth/AuthProvider.js';
import { useReceivedInquiries, useAcceptInquiry, useRejectInquiry } from '../hooks/useInquiries.js';
import { useNavigate } from 'react-router-dom';

// Shape of a notification item — covers both API-fetched and socket-pushed payloads
interface NotifItem {
  id?: string;
  inquiryId?: string;
  seekerName?: string;
  seekerId?: { name?: string } | string;
  roomTitle?: string;
  roomId?: { title?: string } | string;
  fromLocation?: string;
  purpose?: string;
  message?: string;
  status?: string;
  createdAt?: string | Date;
}

// Per-item action state so buttons track independently
type ItemActionState = 'pending' | 'accepting' | 'rejecting' | 'accepted' | 'rejected';

function getKey(notif: NotifItem, idx: number): string {
  return notif.id ?? notif.inquiryId ?? String(idx);
}

function getInquiryId(notif: NotifItem): string {
  return notif.id ?? notif.inquiryId ?? '';
}

function getSeekerName(notif: NotifItem): string {
  if (notif.seekerName) return notif.seekerName;
  if (typeof notif.seekerId === 'object' && notif.seekerId?.name) return notif.seekerId.name;
  return 'Unknown';
}

function getRoomTitle(notif: NotifItem): string {
  if (notif.roomTitle) return notif.roomTitle;
  if (typeof notif.roomId === 'object' && notif.roomId?.title) return notif.roomId.title;
  return 'Unknown Room';
}

function getInitialItemStatus(notif: NotifItem): ItemActionState {
  const s = notif.status ?? 'Pending';
  if (s === 'Accepted') return 'accepted';
  if (s === 'Rejected') return 'rejected';
  return 'pending';
}

export const NotificationBell: React.FC = () => {
  const { user, isAuthenticated } = useAuth();
  const socket = useSocket();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotifItem[]>([]);
  // Tracks per-item action state (accepting / rejecting / accepted / rejected)
  const [itemStates, setItemStates] = useState<Record<string, ItemActionState>>({});
  const dropdownRef = useRef<HTMLDivElement>(null);

  const isOwner = isAuthenticated && user?.role === 'owner';

  const { data } = useReceivedInquiries(1, 20);
  const acceptMutation = useAcceptInquiry();
  const rejectMutation = useRejectInquiry();

  // Seed initial notifications from server on mount / refetch
  useEffect(() => {
    if (isOwner && data?.data) {
      setItemStates((prevStates) => {
        const nextStates = { ...prevStates };
        
        (data.data as NotifItem[]).forEach((inq, idx) => {
          const key = getKey(inq, idx);
          // Preserve local terminal states during refetches
          if (nextStates[key] !== 'accepted' && nextStates[key] !== 'rejected') {
            nextStates[key] = getInitialItemStatus(inq);
          }
        });

        setNotifications((prevNotifs) => {
          const serverKeys = new Set((data.data as NotifItem[]).map((inq, idx) => getKey(inq, idx)));
          
          // Keep socket notifications that aren't yet in the server response
          const localOnly = prevNotifs.filter((n, idx) => !serverKeys.has(getKey(n, idx)));
          
          // Keep server items that are Pending OR have a resolved local terminal state
          const serverNotifs = (data.data as NotifItem[]).filter((inq, idx) => {
            const key = getKey(inq, idx);
            const state = nextStates[key];
            return inq.status === 'Pending' || state === 'accepted' || state === 'rejected';
          });
          
          return [...localOnly, ...serverNotifs];
        });

        return nextStates;
      });
    }
  }, [data, isOwner]);

  // Real-time: prepend new incoming socket notifications
  useEffect(() => {
    if (!isOwner) return;

    const handleNewInterest = (payload: NotifItem) => {
      setNotifications((prev) => [payload, ...prev]);
      const key = getKey(payload, 0);
      setItemStates((prev) => ({ ...prev, [key]: 'pending' }));
    };

    socket.on('room:interest:new', handleNewInterest);
    return () => { socket.off('room:interest:new', handleNewInterest); };
  }, [socket, isOwner]);

  // Close on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [isOpen]);

  const handleAccept = useCallback(async (notif: NotifItem, key: string) => {
    const inquiryId = getInquiryId(notif);
    if (!inquiryId) return;
    setItemStates((prev) => ({ ...prev, [key]: 'accepting' }));
    try {
      await acceptMutation.mutateAsync(inquiryId);
      setItemStates((prev) => ({ ...prev, [key]: 'accepted' }));
    } catch {
      setItemStates((prev) => ({ ...prev, [key]: 'pending' }));
    }
  }, [acceptMutation]);

  const handleReject = useCallback(async (notif: NotifItem, key: string) => {
    const inquiryId = getInquiryId(notif);
    if (!inquiryId) return;
    setItemStates((prev) => ({ ...prev, [key]: 'rejecting' }));
    try {
      await rejectMutation.mutateAsync(inquiryId);
      setItemStates((prev) => ({ ...prev, [key]: 'rejected' }));
    } catch {
      setItemStates((prev) => ({ ...prev, [key]: 'pending' }));
    }
  }, [rejectMutation]);

  if (!isOwner) return null;

  const unreadCount = notifications.filter((_, idx) => {
    const key = getKey(notifications[idx], idx);
    const state = itemStates[key];
    return !state || state === 'pending';
  }).length;

  return (
    <div
      ref={dropdownRef}
      style={{ position: 'relative', display: 'inline-block' }}
    >
      {/* Bell button */}
      <button
        style={{
          position: 'relative',
          padding: '0.4rem 0.5rem',
          fontSize: '1.2rem',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          borderRadius: 'var(--radius-md)',
          color: 'var(--text)',
          lineHeight: 1,
        }}
        onClick={() => setIsOpen((o) => !o)}
        aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
        aria-expanded={isOpen}
        aria-haspopup="menu"
      >
        🔔
        {unreadCount > 0 && (
          <span
            aria-hidden="true"
            style={{
              position: 'absolute',
              top: '0',
              right: '0',
              transform: 'translate(30%, -30%)',
              minWidth: '1.1rem',
              height: '1.1rem',
              borderRadius: 'var(--radius-full)',
              backgroundColor: 'var(--danger)',
              color: '#fff',
              fontSize: '0.65rem',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '0 0.2rem',
              lineHeight: 1,
            }}
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div
          role="menu"
          aria-label="Notifications"
          style={{
            position: 'absolute',
            top: 'calc(100% + 8px)',
            right: 0,
            width: 'min(360px, calc(100vw - 1rem))',
            /* ── Opaque surface — the key fix ── */
            backgroundColor: 'var(--surface-elevated)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-lg)',
            boxShadow: 'var(--shadow-lg)',
            zIndex: 9000,
            overflow: 'hidden',
            /* prevent any inherited opacity leaking */
            opacity: 1,
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: '0.75rem 1rem',
              borderBottom: '1px solid var(--border)',
              fontWeight: 700,
              fontSize: '0.9rem',
              color: 'var(--text)',
              backgroundColor: 'var(--surface-elevated)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <span>Notifications</span>
            {unreadCount > 0 && (
              <span
                style={{
                  fontSize: '0.7rem',
                  backgroundColor: 'var(--danger)',
                  color: '#fff',
                  borderRadius: 'var(--radius-full)',
                  padding: '0.1rem 0.45rem',
                  fontWeight: 600,
                }}
              >
                {unreadCount} new
              </span>
            )}
          </div>

          {/* List */}
          <div style={{ maxHeight: '420px', overflowY: 'auto' }}>
            {notifications.length === 0 ? (
              <div
                style={{
                  padding: '2rem 1rem',
                  textAlign: 'center',
                  color: 'var(--text-muted)',
                  fontSize: '0.875rem',
                  backgroundColor: 'var(--surface-elevated)',
                }}
              >
                No notifications yet
              </div>
            ) : (
              notifications.map((notif, idx) => {
                const key = getKey(notif, idx);
                const state: ItemActionState = itemStates[key] ?? 'pending';
                const seekerName = getSeekerName(notif);
                const roomTitle = getRoomTitle(notif);
                const isActing = state === 'accepting' || state === 'rejecting';

                return (
                  <div
                    key={key}
                    role="menuitem"
                    tabIndex={0}
                    style={{
                      padding: '0.875rem 1rem',
                      borderBottom: '1px solid var(--border)',
                      backgroundColor: 'var(--surface-elevated)',
                      transition: 'background-color var(--transition)',
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLDivElement).style.backgroundColor = 'var(--surface-hover)';
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLDivElement).style.backgroundColor = 'var(--surface-elevated)';
                    }}
                  >
                    {/* Title row */}
                    <div
                      style={{
                        fontWeight: 600,
                        fontSize: '0.85rem',
                        color: 'var(--text)',
                        marginBottom: '0.3rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.35rem',
                      }}
                    >
                      <span style={{ color: 'var(--accent)' }}>●</span>
                      New Interest Request
                    </div>

                    {/* Body */}
                    <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
                      <strong style={{ color: 'var(--text)' }}>{seekerName}</strong> is interested in{' '}
                      <span style={{ color: 'var(--accent)', fontStyle: 'italic' }}>"{roomTitle}"</span>
                    </div>

                    {/* Seeker Details */}
                    {(notif.fromLocation || notif.purpose) && (
                      <div style={{ fontSize: '0.8rem', color: 'var(--text)', marginBottom: '0.25rem' }}>
                        {notif.purpose && <span><strong>Purpose:</strong> {notif.purpose}</span>}
                        {notif.purpose && notif.fromLocation && <span style={{ margin: '0 4px', color: 'var(--text-muted)' }}>•</span>}
                        {notif.fromLocation && <span><strong>From:</strong> {notif.fromLocation}</span>}
                      </div>
                    )}

                    {notif.message && (
                      <div
                        style={{
                          fontSize: '0.78rem',
                          color: 'var(--text-muted)',
                          marginBottom: '0.4rem',
                          fontStyle: 'italic',
                          backgroundColor: 'var(--bg-hover)',
                          padding: '0.35rem 0.5rem',
                          borderRadius: '4px',
                        }}
                      >
                        "{notif.message}"
                      </div>
                    )}

                    {/* Timestamp */}
                    {notif.createdAt && (
                      <div style={{ fontSize: '0.73rem', color: 'var(--text-muted)', marginBottom: '0.65rem' }}>
                        {new Date(notif.createdAt).toLocaleString()}
                      </div>
                    )}

                    {/* Action area */}
                    {state === 'accepted' ? (
                      <div
                        style={{
                          fontSize: '0.82rem',
                          fontWeight: 600,
                          color: 'var(--success)',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.35rem',
                          padding: '0.35rem 0',
                        }}
                      >
                        ✓ Interest Accepted
                      </div>
                    ) : state === 'rejected' ? (
                      <div
                        style={{
                          fontSize: '0.82rem',
                          fontWeight: 600,
                          color: 'var(--danger)',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.35rem',
                          padding: '0.35rem 0',
                        }}
                      >
                        ✕ Request Rejected
                      </div>
                    ) : (
                      /* Pending — show Accept / Reject + View Request */
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginTop: '0.1rem' }}>
                        {/* Accept */}
                        <button
                          disabled={isActing}
                          onClick={(e) => { e.stopPropagation(); void handleAccept(notif, key); }}
                          style={{
                            flex: '1 1 auto',
                            minWidth: '90px',
                            padding: '0.35rem 0.7rem',
                            fontSize: '0.8rem',
                            fontWeight: 600,
                            borderRadius: 'var(--radius-md)',
                            border: '1.5px solid var(--success)',
                            backgroundColor: state === 'accepting' ? 'var(--success)' : 'transparent',
                            color: state === 'accepting' ? '#fff' : 'var(--success)',
                            cursor: isActing ? 'not-allowed' : 'pointer',
                            opacity: isActing ? 0.7 : 1,
                            transition: 'all var(--transition)',
                          }}
                        >
                          {state === 'accepting' ? '...' : '✓ Accept'}
                        </button>

                        {/* Reject */}
                        <button
                          disabled={isActing}
                          onClick={(e) => { e.stopPropagation(); void handleReject(notif, key); }}
                          style={{
                            flex: '1 1 auto',
                            minWidth: '90px',
                            padding: '0.35rem 0.7rem',
                            fontSize: '0.8rem',
                            fontWeight: 600,
                            borderRadius: 'var(--radius-md)',
                            border: '1.5px solid var(--danger)',
                            backgroundColor: state === 'rejecting' ? 'var(--danger)' : 'transparent',
                            color: state === 'rejecting' ? '#fff' : 'var(--danger)',
                            cursor: isActing ? 'not-allowed' : 'pointer',
                            opacity: isActing ? 0.7 : 1,
                            transition: 'all var(--transition)',
                          }}
                        >
                          {state === 'rejecting' ? '...' : '✕ Reject'}
                        </button>

                        {/* View Request */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setIsOpen(false);
                            navigate('/owner');
                          }}
                          style={{
                            width: '100%',
                            padding: '0.3rem 0.7rem',
                            fontSize: '0.78rem',
                            fontWeight: 500,
                            borderRadius: 'var(--radius-md)',
                            border: '1px solid var(--border)',
                            backgroundColor: 'transparent',
                            color: 'var(--text-muted)',
                            cursor: 'pointer',
                            transition: 'all var(--transition)',
                            textAlign: 'center',
                          }}
                        >
                          View Request →
                        </button>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};
