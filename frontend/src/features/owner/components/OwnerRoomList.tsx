/**
 * Owner Room List – Phase 14: accessibility improvements, skeleton loading, empty/error states
 */

import type { Room } from '../types.js';
import OwnerRoomCard from './OwnerRoomCard.js';

interface Props {
  rooms: Room[];
  isLoading: boolean;
  error: Error | null;
  onEdit: (room: Room) => void;
  page: number;
  totalPages: number;
  onPageChange: (newPage: number) => void;
}

function SkeletonRoomCard() {
  return (
    <div className="skeleton-card" aria-hidden="true">
      <div className="skeleton" style={{ width: '100%', height: '160px', borderRadius: 'var(--radius-md)' }} />
      <div className="skeleton skeleton-line mt-2" style={{ width: '70%' }} />
      <div className="skeleton skeleton-line mt-1" style={{ width: '40%' }} />
    </div>
  );
}

export default function OwnerRoomList({
  rooms,
  isLoading,
  error,
  onEdit,
  page,
  totalPages,
  onPageChange,
}: Props) {
  if (isLoading) {
    return (
      <div className="room-grid" aria-label="Loading rooms" aria-busy="true">
        {Array.from({ length: 6 }).map((_, i) => (
          <SkeletonRoomCard key={i} />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="error-card" role="alert">
        Failed to load rooms:{' '}
        {(error as any)?.response?.data?.error?.message || error.message}
      </div>
    );
  }

  if (!rooms || rooms.length === 0) {
    return (
      <div className="empty-state" role="status">
        <span className="empty-state-icon" aria-hidden="true">🏠</span>
        <h3>No rooms listed yet</h3>
        <p>Create your first room to start receiving enquiries.</p>
      </div>
    );
  }

  return (
    <div className="owner-room-list-container">
      <div className="room-grid" role="list" aria-label="Room listings">
        {rooms.map((room) => (
          <div key={room._id} role="listitem">
            <OwnerRoomCard room={room} onEdit={onEdit} />
          </div>
        ))}
      </div>

      {totalPages > 1 && (
        <nav className="pagination" aria-label="Room list pagination">
          <button
            disabled={page <= 1}
            onClick={() => onPageChange(page - 1)}
            className="btn btn-outline btn-sm"
            aria-label="Previous page"
          >
            ← Previous
          </button>
          <span className="pagination-info" aria-live="polite" aria-atomic="true">
            Page {page} of {totalPages}
          </span>
          <button
            disabled={page >= totalPages}
            onClick={() => onPageChange(page + 1)}
            className="btn btn-outline btn-sm"
            aria-label="Next page"
          >
            Next →
          </button>
        </nav>
      )}
    </div>
  );
}
