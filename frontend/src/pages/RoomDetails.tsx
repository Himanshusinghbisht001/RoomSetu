import React, { useState, useEffect, type KeyboardEvent } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useRoom } from '../features/seeker/hooks/useRooms.js';
import Navbar from '../components/Navbar.js';
import Footer from '../components/Footer.js';
import { RoomReviewSection } from '../features/reviews/components/RoomReviewSection.js';

export const RoomDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data, isLoading, isError, error } = useRoom(id || '');

  const [activeImageIndex, setActiveImageIndex] = useState(0);

  // Reset active image when data loads
  useEffect(() => {
    setActiveImageIndex(0);
  }, [data]);

  if (isLoading) {
    return (
      <div className="room-details-page">
        <Navbar />
        <main className="full-page-spinner" aria-label="Loading room details" aria-busy="true">
          <div className="spinner" />
          <span className="spinner-label">Loading details…</span>
        </main>
      </div>
    );
  }

  if (isError || !data || !data.data) {
    return (
      <div className="room-details-page">
        <Navbar />
        <main className="page-container">
          <div className="error-card text-center py-12" role="alert">
            <h2 className="text-xl font-bold mb-2">Room Not Found</h2>
            <p className="mb-6">
              {error instanceof Error
                ? error.message
                : 'The room you are looking for does not exist or has been removed.'}
            </p>
            <button onClick={() => navigate('/seeker')} className="btn btn-primary">
              Back to Discover
            </button>
          </div>
        </main>
      </div>
    );
  }

  const room = data.data;

  const getSafeImageUrl = (url?: string) => {
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

  const safeImages = (room.images || []).map(getSafeImageUrl).filter(Boolean) as string[];

  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (safeImages.length <= 1) return;
    if (e.key === 'ArrowRight') {
      setActiveImageIndex((prev) => (prev + 1) % safeImages.length);
    } else if (e.key === 'ArrowLeft') {
      setActiveImageIndex((prev) => (prev - 1 + safeImages.length) % safeImages.length);
    }
  };

  return (
    <div className="room-details-page">
      <Navbar />

      <main className="page-container" id="main-content" tabIndex={-1}>
        {/* Breadcrumb back */}
        <div style={{ marginBottom: '1.5rem' }}>
          <Link to="/seeker" className="btn btn-ghost btn-sm" style={{ paddingLeft: 0 }}>
            ← Back to Discover
          </Link>
        </div>

        {/* Gallery */}
        <div
          className="room-details-gallery"
          role="region"
          aria-label="Image gallery — use arrow keys to navigate"
          onKeyDown={handleKeyDown}
          tabIndex={0}
        >
          <div className="gallery-main" style={{ position: 'relative' }}>
            {safeImages.length > 0 ? (
              <>
                <img
                  src={safeImages[activeImageIndex]}
                  alt={`View ${activeImageIndex + 1} of ${safeImages.length} — ${room.title}`}
                  loading="eager"
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
                
                {/* Counter overlay */}
                <div 
                  className="gallery-counter"
                  style={{
                    position: 'absolute',
                    top: '1rem',
                    right: '1rem',
                    background: 'rgba(0,0,0,0.65)',
                    color: '#fff',
                    padding: '0.25rem 0.75rem',
                    borderRadius: '1rem',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    zIndex: 10
                  }}
                >
                  {activeImageIndex + 1} / {safeImages.length}
                </div>

                {/* Navigation Buttons */}
                {safeImages.length > 1 && (
                  <>
                    <button
                      className="carousel-btn prev"
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveImageIndex((prev) => (prev - 1 + safeImages.length) % safeImages.length);
                      }}
                      aria-label="Previous image"
                      style={{ zIndex: 10 }}
                    >
                      &larr;
                    </button>
                    <button
                      className="carousel-btn next"
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveImageIndex((prev) => (prev + 1) % safeImages.length);
                      }}
                      aria-label="Next image"
                      style={{ zIndex: 10 }}
                    >
                      &rarr;
                    </button>
                  </>
                )}
              </>
            ) : (
              <div className="gallery-main-placeholder" aria-hidden="true">
                <span>🏠</span>
                <span style={{ fontSize: '1rem' }}>No images available</span>
              </div>
            )}

            <div className="gallery-badges">
              <span
                className={`badge ${
                  room.availability === 'Available' ? 'badge-success' : 'badge-neutral'
                }`}
              >
                {room.availability}
              </span>
              <span className="badge badge-primary" style={{ marginLeft: '0.35rem' }}>
                {room.roomType}
              </span>
            </div>
          </div>

          {safeImages.length > 1 && (
            <div className="gallery-thumbnails" role="tablist" aria-label="Image thumbnails">
              {safeImages.map((img, idx) => (
                <button
                  key={idx}
                  role="tab"
                  aria-selected={activeImageIndex === idx}
                  aria-label={`View image ${idx + 1}`}
                  className={`gallery-thumb ${activeImageIndex === idx ? 'active' : ''}`}
                  onClick={() => setActiveImageIndex(idx)}
                >
                  <img src={img} alt={`Thumbnail ${idx + 1}`} loading="lazy" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Room content */}
        <div className="room-details-content">
          <div className="room-details-inner">
            {/* Title + price row */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                flexWrap: 'wrap',
                gap: '1rem',
                paddingBottom: '1.5rem',
                borderBottom: '1px solid var(--border)',
              }}
            >
              <div>
                <h1 style={{ fontSize: 'clamp(1.5rem, 3vw, 2rem)', fontWeight: 800, color: 'var(--text)', marginBottom: '0.5rem' }}>
                  {room.title}
                </h1>
                <p style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.925rem' }}>
                  <span aria-hidden="true">📍</span>
                  {room.location.area}, {room.location.city}, {room.location.state}
                </p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 'clamp(1.75rem, 3vw, 2.5rem)', fontWeight: 900, color: 'var(--color-primary)', lineHeight: 1 }}>
                  ₹{room.rent.toLocaleString()}
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, marginTop: '0.25rem' }}>
                  per month
                </div>
              </div>
            </div>

            <div className="room-details-grid">
              {/* Main content */}
              <div className="room-detail-section">
                <section>
                  <h2 className="room-section-title">Description</h2>
                  <p style={{ color: 'var(--text)', whiteSpace: 'pre-wrap', lineHeight: 1.75, fontSize: '0.95rem' }}>
                    {room.description}
                  </p>
                </section>

                {room.facilities && room.facilities.length > 0 && (
                  <section>
                    <h2 className="room-section-title">Facilities</h2>
                    <ul className="chip-list" aria-label="Room facilities">
                      {room.facilities.map((facility, idx) => (
                        <li key={idx} className="chip">
                          {facility}
                        </li>
                      ))}
                    </ul>
                  </section>
                )}

                {room.suitableFor && room.suitableFor.length > 0 && (
                  <section>
                    <h2 className="room-section-title">Suitable For</h2>
                    <ul className="chip-list" aria-label="Suitable for">
                      {room.suitableFor.map((item, idx) => (
                        <li key={idx} className="chip chip-accent">
                          {item}
                        </li>
                      ))}
                    </ul>
                  </section>
                )}
              </div>

              {/* Sidebar */}
              <aside className="room-detail-sidebar">
                <div className="sidebar-card">
                  <h3>Location Details</h3>
                  <ul className="location-list">
                    <li>
                      <span>Area:</span> {room.location.area}
                    </li>
                    <li>
                      <span>City:</span> {room.location.city}
                    </li>
                    <li>
                      <span>State:</span> {room.location.state}
                    </li>
                    <li>
                      <span>Country:</span> {room.location.country}
                    </li>
                  </ul>
                </div>

                {room.contactNumber && (
                  <div
                    className="sidebar-card"
                    style={{
                      backgroundColor: 'rgba(22,184,166,0.05)',
                      borderColor: 'rgba(22,184,166,0.2)',
                    }}
                  >
                    <h3 style={{ color: 'var(--accent)' }}>Contact Owner</h3>
                    <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
                      Get in touch to book or ask questions.
                    </p>
                    <a
                      href={`tel:${room.contactNumber}`}
                      className="btn btn-primary w-full text-center"
                      aria-label={`Call owner at ${room.contactNumber}`}
                    >
                      📞 {room.contactNumber}
                    </a>
                  </div>
                )}
              </aside>
            </div>
          </div>
        </div>

        <RoomReviewSection roomId={room._id || id || ''} />
      </main>

      <Footer />
    </div>
  );
};
