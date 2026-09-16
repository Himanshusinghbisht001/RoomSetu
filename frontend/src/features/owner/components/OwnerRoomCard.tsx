/**
 * Owner Room Card – Phase 14: image thumbnail, improved accessibility
 */

import { useState } from 'react';
import type { Room } from '../types.js';
import AvailabilityControl from './AvailabilityControl.js';
import DeleteRoomDialog from './DeleteRoomDialog.js';
import { useDeleteRoom } from '../hooks/useOwnerRooms.js';

interface Props {
  room: Room;
  onEdit: (room: Room) => void;
}

function getSafeImageUrl(url?: string): string | undefined {
  if (!url) return undefined;
  // Allow root-relative paths for our own static assets
  if (url.startsWith('/')) {
    return url;
  }
  try {
    const parsed = new URL(url);
    if (parsed.protocol === 'http:' || parsed.protocol === 'https:') return url;
  } catch {
    // invalid URL
  }
  return undefined;
}

export default function OwnerRoomCard({ room, onEdit }: Props) {
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const { mutateAsync: deleteRoom, isPending: isDeleting } = useDeleteRoom();
  const [error, setError] = useState<string | null>(null);

  const imageUrl = room.images && room.images.length > 0
    ? getSafeImageUrl(room.images[0])
    : undefined;

  const handleDelete = async () => {
    setError(null);
    try {
      await deleteRoom(room._id);
      setIsDeleteDialogOpen(false);
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to delete room');
    }
  };

  return (
    <article
      className={`room-card${room.isDeleted ? ' deleted' : ''}`}
      aria-label={`${room.title}${room.isDeleted ? ' (deleted)' : ''}`}
    >
      {/* Thumbnail */}
      <div className="room-card-thumb" aria-hidden="true">
        {imageUrl ? (
          <img src={imageUrl} alt="" loading="lazy" />
        ) : (
          <div className="room-card-thumb-placeholder">🏠</div>
        )}
      </div>

      <div className="room-card-body">
        <div className="room-card-header">
          <h4>{room.title}</h4>
          <span className="room-rent" aria-label={`Rent: ₹${room.rent} per month`}>
            ₹{room.rent}/mo
          </span>
        </div>

        <p className="room-card-meta">
          {room.roomType} • {room.location.area}, {room.location.city}
        </p>

        {room.isDeleted && (
          <span className="badge badge-danger" role="status">Deleted</span>
        )}

        {error && (
          <p className="error-text" role="alert">{error}</p>
        )}
      </div>

      <div className="room-card-actions">
        <AvailabilityControl room={room} />
        {!room.isDeleted && (
          <div className="action-buttons">
            <button
              onClick={() => onEdit(room)}
              className="btn btn-secondary btn-sm"
              aria-label={`Edit ${room.title}`}
            >
              Edit
            </button>
            <button
              onClick={() => setIsDeleteDialogOpen(true)}
              className="btn btn-danger btn-sm"
              aria-label={`Delete ${room.title}`}
            >
              Delete
            </button>
          </div>
        )}
      </div>

      <DeleteRoomDialog
        isOpen={isDeleteDialogOpen}
        onClose={() => setIsDeleteDialogOpen(false)}
        onConfirm={handleDelete}
        isDeleting={isDeleting}
        roomTitle={room.title}
      />
    </article>
  );
}
