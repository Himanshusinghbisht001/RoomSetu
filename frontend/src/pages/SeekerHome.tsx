import React, { useState, useEffect } from 'react';
import { useRooms } from '../features/seeker/hooks/useRooms.js';
import { RoomFilters } from '../features/seeker/components/RoomFilters.js';
import { RoomCard } from '../features/seeker/components/RoomCard.js';
import { Pagination } from '../features/seeker/components/Pagination.js';
import { useSearchParams } from 'react-router-dom';
import type { RoomQueryParams } from '../features/seeker/types.js';
import Navbar from '../components/Navbar.js';
import Footer from '../components/Footer.js';

export const SeekerHome: React.FC = () => {
  const [searchParams] = useSearchParams();

  const [queryParams, setQueryParams] = useState<RoomQueryParams>({
    page: 1,
    limit: 9,
    area: searchParams.get('area') || undefined,
    city: searchParams.get('city') || undefined,
    roomType: (searchParams.get('roomType') as any) || undefined,
    sort: (searchParams.get('sort') as any) || undefined,
  });

  const { data, isLoading, isError, error } = useRooms(queryParams);

  // Scroll to top when page changes
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [queryParams.page]);

  const handleFilterChange = (newFilters: Partial<RoomQueryParams>) => {
    setQueryParams((prev) => ({ ...prev, ...newFilters }));
  };

  const handlePageChange = (newPage: number) => {
    setQueryParams((prev) => ({ ...prev, page: newPage }));
  };

  return (
    <div className="seeker-page">
      <Navbar />

      <main className="page-container" id="main-content" tabIndex={-1}>
        {/* Page header */}
        <div className="page-header">
          <h1>Discover Rooms</h1>
          <p>Find the perfect place to stay in Nainital.</p>
        </div>

        {/* Filters */}
        <RoomFilters filters={queryParams} onFilterChange={handleFilterChange} />

        {/* Results */}
        {isLoading ? (
          <div className="full-page-spinner" aria-label="Loading rooms" aria-busy="true"
               style={{ height: '40vh', background: 'transparent' }}>
            <div className="spinner" />
            <span className="spinner-label">Searching rooms…</span>
          </div>
        ) : isError ? (
          <div className="error-card" role="alert">
            <p className="font-bold mb-1">Error loading rooms</p>
            <p>{error instanceof Error ? error.message : 'Please try again later.'}</p>
          </div>
        ) : !data || data.data.length === 0 ? (
          <div className="empty-state card" role="status">
            <span className="empty-state-icon" aria-hidden="true">🔍</span>
            <h3>No rooms found</h3>
            <p className="text-secondary mb-4">
              Try adjusting your search or filters to see more results.
            </p>
            <button
              className="btn btn-outline"
              onClick={() => setQueryParams({ page: 1, limit: 9 })}
            >
              Clear Filters
            </button>
          </div>
        ) : (
          <>
            <div
              className="mb-4 text-muted font-bold text-sm"
              aria-live="polite"
              style={{ fontSize: '0.875rem', color: 'var(--text-muted)', fontWeight: 600, marginBottom: '1.25rem' }}
            >
              Found {data.pagination.total} room{data.pagination.total !== 1 && 's'}
            </div>

            <div className="room-grid" role="list" aria-label="Search results">
              {data.data.map((room) => (
                <div key={room._id} role="listitem">
                  <RoomCard room={room} />
                </div>
              ))}
            </div>

            <Pagination pagination={data.pagination} onPageChange={handlePageChange} />
          </>
        )}
      </main>

      <Footer />
    </div>
  );
};
