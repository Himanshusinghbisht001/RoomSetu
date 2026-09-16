import React from 'react';
import { Link } from 'react-router-dom';
import type { Room } from '../types.js';

interface RoomCardProps {
  room: Room;
}

const getSafeImageUrl = (url?: string): string | undefined => {
  if (!url) return undefined;
  // Allow root-relative paths for our own static assets
  if (url.startsWith('/')) {
    return url;
  }
  try {
    const parsed = new URL(url);
    if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
      return url;
    }
  } catch {
    // Invalid URL
  }
  return undefined;
};

const getFallbackImage = (roomId: string, roomType: string): string => {
  const hash = roomId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const typeStr = (roomType || '').toLowerCase();
  
  if (typeStr === 'pg') {
    const pgImages = ['/Rooms/pg/pg1.jfif', '/Rooms/pg/pg2.jfif', '/Rooms/pg/pg3.jfif'];
    return pgImages[hash % pgImages.length];
  } else if (typeStr === 'single') {
    const singleImages = ['/Rooms/single/single1.jfif', '/Rooms/single/single2.jfif', '/Rooms/single/single3.jfif'];
    return singleImages[hash % singleImages.length];
  } else {
    const doubleImages = ['/Rooms/double/double1.jfif', '/Rooms/double/double2.jfif', '/Rooms/double/double3.jfif'];
    return doubleImages[hash % doubleImages.length];
  }
};

export const RoomCard: React.FC<RoomCardProps> = ({ room }) => {
  const fallbackUrl = getFallbackImage(room._id, room.roomType);
  let imageUrl = room.images && room.images.length > 0
    ? getSafeImageUrl(room.images[0])
    : undefined;

  if (!imageUrl) {
    imageUrl = fallbackUrl;
  }

  return (
    <Link
      to={`/rooms/${room._id}`}
      className="premium-room-card"
      aria-label={`${room.title} — ₹${room.rent}/month — ${room.location.area}`}
    >
      {/* Image */}
      <div className="premium-room-card-img-wrap">
        <img
          src={imageUrl}
          alt={`${room.title} — ${room.location.area}`}
          className="premium-room-card-img"
          loading="lazy"
          onError={(e) => {
            (e.target as HTMLImageElement).src = fallbackUrl;
          }}
        />

        {/* Badges */}
        <div className="premium-room-card-badges" aria-hidden="true">
          <span
            className={`premium-badge ${
              room.availability === 'Available'
                ? 'premium-badge-success'
                : 'premium-badge-neutral'
            }`}
          >
            {room.availability}
          </span>
          <span className="premium-badge-type">{room.roomType}</span>
        </div>
      </div>

      {/* Body */}
      <div className="premium-room-card-body">
        <h3 className="premium-room-card-title">{room.title}</h3>

        <p className="premium-room-card-location">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="13"
            height="13"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
            <circle cx="12" cy="10" r="3" />
          </svg>
          {room.location.area}, {room.location.city}
        </p>

        {room.facilities && room.facilities.length > 0 && (
          <div className="premium-room-card-facilities" aria-label="Facilities">
            {room.facilities.slice(0, 3).map((facility, index) => (
              <span key={index} className="facility-dot">
                {facility}
              </span>
            ))}
            {room.facilities.length > 3 && (
              <span className="facility-dot">+{room.facilities.length - 3} more</span>
            )}
          </div>
        )}

        <div className="premium-room-card-footer">
          <div className="premium-room-card-price">
            <span className="amount">₹{room.rent.toLocaleString()}</span>
            <span className="period">/month</span>
          </div>
          <span className="view-details-btn" aria-hidden="true">
            View Details →
          </span>
        </div>
      </div>
    </Link>
  );
};
