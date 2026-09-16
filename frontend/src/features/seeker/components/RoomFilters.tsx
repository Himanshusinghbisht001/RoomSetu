import React, { useState, useEffect, useId } from 'react';
import type { RoomQueryParams } from '../types.js';

interface RoomFiltersProps {
  filters: RoomQueryParams;
  onFilterChange: (filters: Partial<RoomQueryParams>) => void;
}

export const RoomFilters: React.FC<RoomFiltersProps> = ({ filters, onFilterChange }) => {
  const uid = useId();
  const [searchTerm, setSearchTerm] = useState(filters.search || '');
  const [cityTerm, setCityTerm] = useState(filters.city || '');
  const [areaTerm, setAreaTerm] = useState(filters.area || '');

  // Debounce search
  useEffect(() => {
    const handler = setTimeout(() => {
      if (searchTerm !== filters.search) {
        onFilterChange({ search: searchTerm || undefined, page: 1 });
      }
    }, 500);
    return () => clearTimeout(handler);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm]);

  // Debounce city
  useEffect(() => {
    const handler = setTimeout(() => {
      if (cityTerm !== filters.city) {
        onFilterChange({ city: cityTerm || undefined, page: 1 });
      }
    }, 500);
    return () => clearTimeout(handler);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cityTerm]);

  // Debounce area
  useEffect(() => {
    const handler = setTimeout(() => {
      if (areaTerm !== filters.area) {
        onFilterChange({ area: areaTerm || undefined, page: 1 });
      }
    }, 500);
    return () => clearTimeout(handler);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [areaTerm]);

  const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const { name, value } = e.target;
    onFilterChange({ [name]: value || undefined, page: 1 });
  };

  const handleReset = () => {
    setSearchTerm('');
    setCityTerm('');
    setAreaTerm('');
    onFilterChange({
      search: undefined,
      city: undefined,
      area: undefined,
      roomType: undefined,
      availability: undefined,
      sort: undefined,
      page: 1,
    });
  };

  const getActiveFilterCount = () => {
    let count = 0;
    if (filters.search) count++;
    if (filters.city) count++;
    if (filters.area) count++;
    if (filters.roomType) count++;
    if (filters.availability) count++;
    if (filters.sort) count++;
    return count;
  };

  const activeCount = getActiveFilterCount();

  return (
    <section className="seeker-filters" aria-label="Room search filters">
      <div className="seeker-filters-grid">
        {/* Search */}
        <div className="form-group">
          <label htmlFor={`${uid}-search`} className="form-label">Search</label>
          <input
            id={`${uid}-search`}
            type="text"
            className="form-input"
            placeholder="Search by title..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* Room Type */}
        <div className="form-group">
          <label htmlFor={`${uid}-type`} className="form-label">Room Type</label>
          <select
            id={`${uid}-type`}
            name="roomType"
            className="form-input"
            value={filters.roomType || ''}
            onChange={handleSelectChange}
          >
            <option value="">All Types</option>
            <option value="Single">Single</option>
            <option value="Double">Double</option>
            <option value="PG">PG</option>
          </select>
        </div>

        {/* Availability */}
        <div className="form-group">
          <label htmlFor={`${uid}-avail`} className="form-label">Availability</label>
          <select
            id={`${uid}-avail`}
            name="availability"
            className="form-input"
            value={filters.availability || ''}
            onChange={handleSelectChange}
          >
            <option value="">Any</option>
            <option value="Available">Available</option>
            <option value="Booked">Booked</option>
          </select>
        </div>

        {/* Sort */}
        <div className="form-group">
          <label htmlFor={`${uid}-sort`} className="form-label">Sort By</label>
          <select
            id={`${uid}-sort`}
            name="sort"
            className="form-input"
            value={filters.sort || ''}
            onChange={handleSelectChange}
          >
            <option value="">Default</option>
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
            <option value="rent_asc">Rent (Low to High)</option>
            <option value="rent_desc">Rent (High to Low)</option>
          </select>
        </div>

        {/* City */}
        <div className="form-group">
          <label htmlFor={`${uid}-city`} className="form-label">City</label>
          <input
            id={`${uid}-city`}
            type="text"
            name="city"
            className="form-input"
            placeholder="City..."
            value={cityTerm}
            onChange={(e) => setCityTerm(e.target.value)}
          />
        </div>

        {/* Area */}
        <div className="form-group">
          <label htmlFor={`${uid}-area`} className="form-label">Area</label>
          <input
            id={`${uid}-area`}
            type="text"
            name="area"
            className="form-input"
            placeholder="Area..."
            value={areaTerm}
            onChange={(e) => setAreaTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Filter actions / info */}
      <div className="seeker-filters-footer">
        <div>
          {activeCount > 0 && (
            <span className="active-filters-badge" aria-live="polite">
              {activeCount} active filter{activeCount > 1 ? 's' : ''}
            </span>
          )}
        </div>
        <button
          type="button"
          className="btn btn-outline btn-sm"
          onClick={handleReset}
          disabled={activeCount === 0}
          aria-label="Reset all filters"
        >
          Reset Filters
        </button>
      </div>
    </section>
  );
};
