import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar.js';
import Footer from '../components/Footer.js';
import { useRooms, useLocationCounts } from '../features/seeker/hooks/useRooms.js';
import { RoomCard } from '../features/seeker/components/RoomCard.js';
import { useAuth } from '../auth/AuthProvider.js';

/**
 * Build-time dynamic discovery of all images in src/assets/Random/.
 * Vite resolves import.meta.glob at build time — every file matching the
 * pattern is bundled and gets a content-hashed URL automatically.
 * To add a new image: drop it into src/assets/Random/ and redeploy.
 * No code change required.
 */
const editorialImageModules = import.meta.glob<{ default: string }>(
  '../assets/Random/*.jfif',
  { eager: true },
);
const editorialImages: string[] = Object.entries(editorialImageModules)
  .sort(([a], [b]) => a.localeCompare(b, undefined, { numeric: true }))
  .map(([, mod]) => mod.default);

/* ── Centralized location → image mapping ────────────────────
   Images are real Nainital photographs sourced from Wikimedia
   Commons under CC BY-SA 4.0 / CC BY 2.0 / Public Domain.
   See frontend/public/Location/SOURCES.md for attribution.
   ─────────────────────────────────────────────────────────── */
const locationImageMap: Record<string, string> = {
  '7 Number':          '/Location/7-number.jpg',
  'Sukhatal':          '/Location/sukhatal.jpg',
  'Bara Pathar':       '/Location/bara-pathar.jpg',
  'Harinagar':         '/Location/harinagar.jpg',
  'Balrampur':         '/Location/balrampur.jpg',
  'St. Loo':           '/Location/st-loo.jpg',
  "Land's End":        '/Location/lands-end.jpg',
  'Alma Cottage Area': '/Location/alma-cottage.jpg',
  'Naina Peak Road':   '/Location/naina-peak-road.jpg',
  'Kilbury Road':      '/Location/kilbury-road.jpg',
  'Barapathar Road':   '/Location/barapathar-road.jpg',
  'Ayarpatta Road':    '/Location/ayarpatta-road.jpg',
};

/** Fallback image if a location photo fails to load */
const FALLBACK_IMAGE = '/Location/main_image.jfif';

const FEATURED_LOCATION = '7 Number';

export default function Home() {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const isOwner = isAuthenticated && user?.role === 'owner';
  const [searchArea, setSearchArea] = useState('');
  const [searchType, setSearchType] = useState('');
  const [searchRent, setSearchRent] = useState('');

  const { data: locationCountsData, isLoading: locLoading } = useLocationCounts('Nainital');
  const locationCounts = locationCountsData?.data || [];

  const { data: roomsData, isLoading: roomsLoading } = useRooms({ limit: 4, sort: 'newest' });
  const featuredRooms = roomsData?.data || [];

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (searchArea) params.set('area', searchArea);
    if (searchType) params.set('roomType', searchType);
    if (searchRent) params.set('sort', searchRent);
    navigate(`/seeker?${params.toString()}`);
  };

  const handleLocationClick = (area: string) => {
    navigate(`/seeker?area=${encodeURIComponent(area)}`);
  };

  // Sort so Mallital is first (featured)
  const sortedLocations = [...locationCounts].sort((a, b) => {
    if (a.area === FEATURED_LOCATION) return -1;
    if (b.area === FEATURED_LOCATION) return 1;
    return 0;
  });

  const carouselRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const checkScroll = useCallback(() => {
    if (carouselRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = carouselRef.current;
      setCanScrollLeft(scrollLeft > 0);
      setCanScrollRight(Math.ceil(scrollLeft + clientWidth) < scrollWidth);
    }
  }, []);

  useEffect(() => {
    checkScroll();
    const el = carouselRef.current;
    if (el) {
      el.addEventListener('scroll', checkScroll);
      window.addEventListener('resize', checkScroll);
      return () => {
        el.removeEventListener('scroll', checkScroll);
        window.removeEventListener('resize', checkScroll);
      };
    }
  }, [checkScroll, sortedLocations]);

  const scrollBy = (direction: 'left' | 'right') => {
    if (carouselRef.current) {
      // scroll by approx one card width + gap
      const scrollAmount = 300; 
      carouselRef.current.scrollBy({ left: direction === 'left' ? -scrollAmount : scrollAmount, behavior: 'smooth' });
    }
  };

  // editorialImages is derived at module-load time via import.meta.glob above.
  // No array needed here.

  const [currentEditorialIndex, setCurrentEditorialIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentEditorialIndex((prev) => (prev + 1) % editorialImages.length);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="home-page">
      <Navbar />

      {/* ── HERO ─────────────────────────────────────────────── */}
      <section className="premium-hero" aria-label="Hero — Find your room in Nainital">
        <div className="premium-hero-bg" aria-hidden="true">
          <img
            src="/Location/main_image.jfif"
            alt=""
            className="premium-hero-img"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
          <div className="premium-hero-placeholder" style={{ display: 'none' }} />
          <div className="premium-hero-overlay" />
        </div>

        <div className="premium-hero-content">
          <span className="premium-hero-label" aria-hidden="true">Find Your Space</span>
          <h1 className="premium-hero-title">
            Find the Perfect Room<br />
            in <span>Nainital</span>
          </h1>
          <p className="premium-hero-subtitle">
            Discover comfortable rooms, PGs and stays that fit your needs.
          </p>

          {/* Hero CTA — role-based: owner sees Add Room prompt, seeker/guest sees search */}
          {isOwner ? (
            /* ── OWNER: Add Your Room CTA ── */
            <div className="premium-hero-search-wrapper owner-hero-cta" aria-label="List your room">
              <div className="owner-cta-inner">
                <div className="owner-cta-text">
                  <span className="owner-cta-eyebrow">Owner Dashboard</span>
                  <p className="owner-cta-headline">List your room on RoomSetu</p>
                  <p className="owner-cta-sub">Reach thousands of seekers in Nainital. Add or manage your listings instantly.</p>
                </div>
                <Link
                  to="/owner"
                  className="btn btn-primary owner-cta-btn"
                  id="hero-owner-add-room-btn"
                  aria-label="Go to owner dashboard to add your room"
                >
                  + Add Your Room
                </Link>
              </div>
            </div>
          ) : (
            /* ── SEEKER / GUEST: existing search bar — unchanged ── */
            <div className="premium-hero-search-wrapper" role="search">
              <form className="premium-hero-search" onSubmit={handleSearch} aria-label="Room search">
                <div className="search-field">
                  <label htmlFor="hero-area">Location / Area</label>
                  <input
                    id="hero-area"
                    type="text"
                    placeholder="e.g. Mallital, Tallital"
                    value={searchArea}
                    onChange={(e) => setSearchArea(e.target.value)}
                    autoComplete="off"
                  />
                </div>

                <div className="search-divider" aria-hidden="true" />

                <div className="search-field">
                  <label htmlFor="hero-type">Room Type</label>
                  <select
                    id="hero-type"
                    value={searchType}
                    onChange={(e) => setSearchType(e.target.value)}
                  >
                    <option value="">Any Type</option>
                    <option value="Single">Single Room</option>
                    <option value="Double">Double Room</option>
                    <option value="PG">PG</option>
                  </select>
                </div>

                <div className="search-divider" aria-hidden="true" />

                <div className="search-field">
                  <label htmlFor="hero-budget">Rent / Budget</label>
                  <select
                    id="hero-budget"
                    value={searchRent}
                    onChange={(e) => setSearchRent(e.target.value)}
                  >
                    <option value="">Any Budget</option>
                    <option value="rent_asc">Low to High</option>
                    <option value="rent_desc">High to Low</option>
                  </select>
                </div>

                <div className="search-btn-wrap">
                  <button type="submit" className="btn btn-accent search-btn" id="hero-search-btn">
                    Search Rooms
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>

        {/* Decorative scroll steps */}
        <div className="hero-scroll-indicator" aria-hidden="true">
          <div className="hero-step">
            <span className="hero-step-num">01</span>
            <div className="hero-step-line" />
          </div>
          <div className="hero-step">
            <span className="hero-step-num">02</span>
            <div className="hero-step-line" />
          </div>
          <div className="hero-step">
            <span className="hero-step-num">03</span>
          </div>
        </div>
      </section>

      {/* ── POPULAR LOCATIONS ────────────────────────────────── */}
      <section className="popular-locations-section" aria-labelledby="locations-heading">
        <div className="home-section-header">
          <span className="home-section-eyebrow" aria-hidden="true">Destinations</span>
          <h2 id="locations-heading">Explore Popular Locations</h2>
          <p>Find rooms in the areas you want to call home.</p>
        </div>

        {locLoading ? (
          <div className="loading-state" aria-live="polite">Loading locations…</div>
        ) : (
          <div className="location-carousel-wrapper">
            <button 
              className="carousel-btn prev" 
              onClick={() => scrollBy('left')} 
              disabled={!canScrollLeft}
              aria-label="Previous locations"
            >
              &larr;
            </button>
            <div className="location-grid" ref={carouselRef} role="list" aria-label="Popular locations in Nainital">
              {sortedLocations.map((loc) => {
                const isFeatured = loc.area === FEATURED_LOCATION;
                return (
                  <div
                    key={loc.area}
                    role="listitem"
                    className={`location-card${isFeatured ? ' location-card-featured' : ''}`}
                    onClick={() => handleLocationClick(loc.area)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        handleLocationClick(loc.area);
                      }
                    }}
                    tabIndex={0}
                    aria-label={`${loc.area} — ${loc.count} rooms available`}
                  >
                    <div className="location-card-bg" aria-hidden="true">
                      {locationImageMap[loc.area] ? (
                        <img
                          src={locationImageMap[loc.area]}
                          alt=""
                          className="location-img"
                          loading="lazy"
                          onError={(e) => {
                            // Safe fallback if image fails to load
                            (e.target as HTMLImageElement).src = FALLBACK_IMAGE;
                          }}
                        />
                      ) : (
                        <img src={FALLBACK_IMAGE} alt="" className="location-img" />
                      )}
                    </div>
                    <div className="location-card-content">
                      <h3 className="location-name">{loc.area}</h3>
                      <span className="location-count">{loc.count} Rooms</span>
                    </div>
                  </div>
                );
              })}
              {sortedLocations.length === 0 && (
                <div className="empty-state" style={{ flex: '1 1 100%' }}>No locations found.</div>
              )}
            </div>
            <button 
              className="carousel-btn next" 
              onClick={() => scrollBy('right')} 
              disabled={!canScrollRight}
              aria-label="Next locations"
            >
              &rarr;
            </button>
          </div>
        )}
      </section>

      {/* ── FEATURED ROOMS ───────────────────────────────────── */}
      <section className="featured-rooms-section" aria-labelledby="featured-heading">
        <div className="home-section-header">
          <span className="home-section-eyebrow" aria-hidden="true">Handpicked</span>
          <h2 id="featured-heading">Featured Rooms</h2>
          <p>A selection of verified rooms ready for your next chapter.</p>
        </div>

        {roomsLoading ? (
          <div className="loading-state" aria-live="polite">Loading rooms…</div>
        ) : (
          <div className="featured-grid" role="list" aria-label="Featured rooms">
            {featuredRooms.map((room) => (
              <div key={room._id} role="listitem">
                <RoomCard room={room} />
              </div>
            ))}
          </div>
        )}

        <div className="view-all-wrapper">
          <Link to="/seeker" className="btn btn-outline btn-lg" id="view-all-rooms-btn">
            View All Rooms →
          </Link>
        </div>
      </section>

      {/* ── EDITORIAL STORY ──────────────────────────────────── */}
      <section className="editorial-section" aria-label="About RoomSetu in Nainital">
        <div className="editorial-inner">
          <div className="editorial-text">
            <span className="home-section-eyebrow" aria-hidden="true">Our Story</span>
            <h2>
              Stay Somewhere<br />
              You'll <em>Love</em>
            </h2>
            <p>
              Find a space that feels right for your next chapter in Nainital.
              Whether you're a student, a professional, or someone looking for a
              peaceful retreat — RoomSetu connects you to the right room, in the
              right neighbourhood.
            </p>
            <div style={{ marginTop: '0.5rem' }}>
              <Link to="/seeker" className="btn btn-primary btn-lg" id="editorial-cta-btn">
                Start Exploring
              </Link>
            </div>
          </div>

          <div className="editorial-image-wrap" aria-hidden="true" style={{ position: 'relative' }}>
            {editorialImages.map((src, index) => (
              <img
                key={src}
                src={src}
                alt="A beautiful room in Mallital, Nainital"
                loading={index === 0 ? "eager" : "lazy"}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  opacity: currentEditorialIndex === index ? 1 : 0,
                  transition: 'opacity 0.5s ease-in-out',
                }}
              />
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ─────────────────────────────────────── */}
      <section className="process-section" aria-labelledby="process-heading">
        <div className="home-section-header">
          <span className="home-section-eyebrow" aria-hidden="true">How It Works</span>
          <h2 id="process-heading">Three Simple Steps</h2>
          <p>Finding your ideal room in Nainital has never been easier.</p>
        </div>

        <div className="process-grid" role="list" aria-label="How RoomSetu works">
          <div className="process-step" role="listitem">
            <div className="process-step-num" aria-hidden="true">01</div>
            <div>
              <div className="process-step-title">Search Your Space</div>
              <p className="process-step-desc">
                Use our powerful search to filter rooms by area, type and budget.
                Nainital's best neighbourhoods at your fingertips.
              </p>
            </div>
          </div>

          <div className="process-step" role="listitem">
            <div className="process-step-num" aria-hidden="true">02</div>
            <div>
              <div className="process-step-title">Explore Rooms</div>
              <p className="process-step-desc">
                Browse real photos, facilities, availability and location details.
                Every listing is verified for your peace of mind.
              </p>
            </div>
          </div>

          <div className="process-step" role="listitem">
            <div className="process-step-num" aria-hidden="true">03</div>
            <div>
              <div className="process-step-title">Connect With Owner</div>
              <p className="process-step-desc">
                Reach the owner directly. No middlemen, no extra fees —
                just you and your next home in Nainital.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── FINAL CTA ────────────────────────────────────────── */}
      <section className="cta-section" aria-labelledby="cta-heading">
        <div className="cta-section-inner">
          <h2 id="cta-heading">
            Your Next Space Is<br />Closer Than You Think
          </h2>
          <p>Explore rooms and stays across Nainital's most beautiful neighbourhoods.</p>
          <div className="cta-section-btns">
            <Link to="/seeker" className="cta-btn-primary" id="cta-explore-btn">
              Explore Rooms
            </Link>
            <Link to="/register" className="cta-btn-secondary" id="cta-list-btn">
              List Your Room
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
