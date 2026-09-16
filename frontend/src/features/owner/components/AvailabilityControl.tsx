/**
 * Availability Control – Phase 14 polish + accessibility
 */

import { useRef } from 'react';
import { useUpdateAvailability } from '../hooks/useOwnerRooms.js';
import type { Availability, Room } from '../types.js';

interface Props {
  room: Room;
}

export default function AvailabilityControl({ room }: Props) {
  const { mutateAsync, isPending } = useUpdateAvailability();
  const selectRef = useRef<HTMLSelectElement>(null);

  const handleChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newAvailability = e.target.value as Availability;
    try {
      await mutateAsync({ id: room._id, availability: newAvailability });
    } catch (err: any) {
      // Revert visually on error
      if (selectRef.current) {
        selectRef.current.value = room.availability;
      }
    }
  };

  return (
    <div className="availability-control">
      <label htmlFor={`avail-${room._id}`} className="sr-only">
        Availability for {room.title}
      </label>
      <select
        id={`avail-${room._id}`}
        ref={selectRef}
        value={room.availability}
        onChange={handleChange}
        disabled={isPending || room.isDeleted}
        className={`availability-select ${room.availability.toLowerCase()}`}
        aria-label={`Set availability for ${room.title}`}
      >
        <option value="Available">Available</option>
        <option value="Booked">Booked</option>
      </select>
    </div>
  );
}
