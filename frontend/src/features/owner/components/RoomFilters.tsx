/**
 * Owner Room Filters – Phase 14: accessible labels, design system classes
 */

import { useId, useState, useEffect } from 'react';
import type { OwnerRoomQuery } from '../types.js';

interface Props {
  filters: OwnerRoomQuery;
  onFilterChange: (newFilters: OwnerRoomQuery) => void;
}

export default function RoomFilters({ filters, onFilterChange }: Props) {
  const uid = useId();
  const [searchTerm, setSearchTerm] = useState(filters.search || '');

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchTerm !== filters.search) {
        onFilterChange({ ...filters, search: searchTerm || undefined, page: 1 });
      }
    }, 500);
    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm]);

  const handleSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const { name, value } = e.target;
    onFilterChange({ ...filters, [name]: value || undefined, page: 1 });
  };

  const handleCheckbox = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, checked } = e.target;
    onFilterChange({ ...filters, [name]: checked || undefined, page: 1 });
  };

  return (
    <div className="card room-filters" role="search" aria-label="Filter rooms">
      {/* Search */}
      <div className="form-group filter-input">
        <label className="form-label" htmlFor={`${uid}-search`}>Search</label>
        <input
          id={`${uid}-search`}
          className="form-input"
          type="text"
          placeholder="Search rooms…"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* Availability */}
      <div className="form-group filter-select">
        <label className="form-label" htmlFor={`${uid}-avail`}>Availability</label>
        <select
          id={`${uid}-avail`}
          className="form-input"
          name="availability"
          value={filters.availability || ''}
          onChange={handleSelect}
        >
          <option value="">All Availabilities</option>
          <option value="Available">Available</option>
          <option value="Booked">Booked</option>
        </select>
      </div>

      {/* Room Type */}
      <div className="form-group filter-select">
        <label className="form-label" htmlFor={`${uid}-type`}>Room Type</label>
        <select
          id={`${uid}-type`}
          className="form-input"
          name="roomType"
          value={filters.roomType || ''}
          onChange={handleSelect}
        >
          <option value="">All Types</option>
          <option value="Single">Single</option>
          <option value="Double">Double</option>
          <option value="PG">PG</option>
        </select>
      </div>

      {/* Sort */}
      <div className="form-group filter-select">
        <label className="form-label" htmlFor={`${uid}-sort`}>Sort By</label>
        <select
          id={`${uid}-sort`}
          className="form-input"
          name="sort"
          value={filters.sort || ''}
          onChange={handleSelect}
        >
          <option value="">Sort By</option>
          <option value="newest">Newest</option>
          <option value="oldest">Oldest</option>
          <option value="rent_asc">Rent (Low → High)</option>
          <option value="rent_desc">Rent (High → Low)</option>
        </select>
      </div>

      {/* Include Deleted */}
      <label className="checkbox-label">
        <input
          type="checkbox"
          name="includeDeleted"
          checked={!!filters.includeDeleted}
          onChange={handleCheckbox}
          aria-label="Show deleted rooms"
        />
        Show Deleted
      </label>
    </div>
  );
}
