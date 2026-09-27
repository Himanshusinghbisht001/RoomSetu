import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { FiHeart, FiCompass } from 'react-icons/fi';
import Navbar from '../components/Navbar.js';
import Footer from '../components/Footer.js';
import { RoomCard } from '../features/seeker/components/RoomCard.js';
import { useFavorites } from '../features/seeker/hooks/useFavorites.js';

const LIMIT = 9;

export const SeekerFavorites: React.FC = () => {
  const [page, setPage] = useState(1);
  const { data, isLoading, isError, error } = useFavorites(page, LIMIT);

  return (
    <div className="seeker-page">
      <Navbar />

      <main className="page-container" id="main-content" tabIndex={-1}>
        {/* Page header */}
        <div className="page-header">
          <h1 style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <FiHeart aria-hidden="true" style={{ color: 'var(--danger)' }} />
            My Favorites
          </h1>
          <p>Rooms you've saved — find them here anytime.</p>
        </div>

        {/* Loading state */}
        {isLoading ? (
          <div
            className="full-page-spinner"
            aria-label="Loading favorites"
            aria-busy="true"
            style={{ height: '40vh', background: 'transparent' }}
          >
            <div className="spinner" />
            <span className="spinner-label">Loading your saved rooms…</span>
          </div>
        ) : isError ? (
          <div className="error-card" role="alert">
            <p className="font-bold mb-1">Error loading favorites</p>
            <p>{error instanceof Error ? error.message : 'Please try again later.'}</p>
          </div>
        ) : !data || data.data.length === 0 ? (
          /* Empty state */
          <div className="empty-state card" role="status" style={{ textAlign: 'center', padding: '4rem 2rem' }}>
            <FiHeart
              aria-hidden="true"
              style={{ fontSize: '3rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}
            />
            <h2 style={{ marginBottom: '0.75rem', color: 'var(--text)' }}>Your Favorites are Empty</h2>
            <p className="text-secondary" style={{ marginBottom: '2rem', maxWidth: '400px', margin: '0 auto 2rem' }}>
              Save rooms you like and find them here later. Browse available rooms and tap the{' '}
              <FiHeart aria-hidden="true" style={{ verticalAlign: 'middle' }} /> heart to save them.
            </p>
            <Link to="/seeker" className="btn btn-primary">
              <FiCompass aria-hidden="true" style={{ marginRight: '0.4rem' }} />
              Discover Rooms
            </Link>
          </div>
        ) : (
          <>
            {/* Results count */}
            <div
              aria-live="polite"
              style={{
                fontSize: '0.875rem',
                color: 'var(--text-muted)',
                fontWeight: 600,
                marginBottom: '1.25rem',
              }}
            >
              {data.pagination.total} saved room{data.pagination.total !== 1 && 's'}
            </div>

            {/* Grid */}
            <div className="room-grid" role="list" aria-label="Saved rooms">
              {data.data.map((room) => (
                <div key={room._id} role="listitem">
                  <RoomCard room={room} />
                </div>
              ))}
            </div>

            {/* Pagination */}
            {data.pagination.totalPages > 1 && (
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'center',
                  gap: '0.5rem',
                  marginTop: '2rem',
                  flexWrap: 'wrap',
                }}
              >
                <button
                  className="btn btn-outline btn-sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  aria-label="Previous page"
                >
                  Previous
                </button>
                <span
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    padding: '0 0.75rem',
                    fontSize: '0.875rem',
                    color: 'var(--text-muted)',
                  }}
                >
                  Page {page} of {data.pagination.totalPages}
                </span>
                <button
                  className="btn btn-outline btn-sm"
                  onClick={() => setPage((p) => Math.min(data.pagination.totalPages, p + 1))}
                  disabled={page === data.pagination.totalPages}
                  aria-label="Next page"
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </main>

      <Footer />
    </div>
  );
};
