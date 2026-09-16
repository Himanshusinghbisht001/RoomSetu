/**
 * Shared Navbar — Premium RoomSetu
 *
 * Features:
 *   - Official RoomSetu logo
 *   - Role-aware nav links (owner / seeker / guest)
 *   - Dark/light theme toggle
 *   - Transparent on homepage hero, transitions to solid on scroll
 *   - Responsive hamburger menu (mobile)
 *   - Keyboard navigation + ARIA attributes
 *   - Escape key closes mobile menu
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../auth/AuthProvider.js';
import { useTheme } from '../providers/ThemeProvider.js';
import logoSrc from '../assets/logo.png';

export default function Navbar() {
  const { user, logout, isAuthenticated } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const hamburgerRef = useRef<HTMLButtonElement>(null);

  const isHome = location.pathname === '/';

  const closeMenu = useCallback(() => setMenuOpen(false), []);

  // Scroll listener — only meaningful on homepage
  useEffect(() => {
    if (!isHome) {
      setScrolled(false);
      return;
    }
    const handleScroll = () => {
      setScrolled(window.scrollY > 60);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, [isHome]);

  // Close menu on Escape key
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && menuOpen) {
        closeMenu();
        hamburgerRef.current?.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [menuOpen, closeMenu]);

  // Close menu on outside click
  useEffect(() => {
    const onOutside = (e: MouseEvent) => {
      if (
        menuOpen &&
        menuRef.current &&
        !menuRef.current.contains(e.target as Node) &&
        !hamburgerRef.current?.contains(e.target as Node)
      ) {
        closeMenu();
      }
    };
    document.addEventListener('mousedown', onOutside);
    return () => document.removeEventListener('mousedown', onOutside);
  }, [menuOpen, closeMenu]);

  const handleLogout = async () => {
    closeMenu();
    await logout();
    navigate('/', { replace: true });
  };

  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    `navbar-link${isActive ? ' active' : ''}`;

  // Determine navbar visual state
  const isTransparent = isHome && !scrolled && !menuOpen;
  const navClass = [
    'navbar',
    isTransparent ? 'navbar-transparent' : '',
    isHome && scrolled ? 'navbar-scrolled' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <header className={navClass} role="banner">
      <div className="navbar-inner">
        {/* Logo */}
        <Link to="/" className="navbar-logo" aria-label="RoomSetu Home">
          <img src={logoSrc} alt="RoomSetu" />
        </Link>

        {/* Desktop nav links */}
        <nav aria-label="Main navigation">
          <ul className="navbar-links" role="list">
            <li>
              <NavLink to="/" end className={navLinkClass}>
                Home
              </NavLink>
            </li>
            <li>
              <NavLink to="/seeker" className={navLinkClass}>
                Find Rooms
              </NavLink>
            </li>
            {isAuthenticated && user?.role === 'owner' && (
              <li>
                <NavLink to="/owner" className={navLinkClass}>
                  Dashboard
                </NavLink>
              </li>
            )}
          </ul>
        </nav>

        {/* Desktop action buttons */}
        <div className="navbar-actions">
          <button
            className="theme-toggle"
            onClick={toggleTheme}
            aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
            title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
          >
            {theme === 'light' ? '🌙' : '☀️'}
          </button>

          {isAuthenticated ? (
            <button
              className="btn btn-outline btn-sm"
              onClick={handleLogout}
              aria-label="Logout"
            >
              Logout
            </button>
          ) : (
            <>
              <Link to="/login" className="btn btn-outline btn-sm">
                Login
              </Link>
              <Link to="/register" className="btn btn-primary btn-sm">
                Register
              </Link>
            </>
          )}

          {/* Mobile hamburger */}
          <button
            ref={hamburgerRef}
            className={`hamburger${menuOpen ? ' open' : ''}`}
            aria-expanded={menuOpen}
            aria-controls="mobile-menu"
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            onClick={() => setMenuOpen((o) => !o)}
          >
            <span />
            <span />
            <span />
          </button>
        </div>
      </div>

      {/* Mobile dropdown menu */}
      <div
        id="mobile-menu"
        ref={menuRef}
        className={`mobile-menu${menuOpen ? ' open' : ''}`}
        role="navigation"
        aria-label="Mobile navigation"
      >
        <NavLink to="/" end className={navLinkClass} onClick={closeMenu}>
          Home
        </NavLink>
        <NavLink to="/seeker" className={navLinkClass} onClick={closeMenu}>
          Find Rooms
        </NavLink>

        {isAuthenticated && user?.role === 'owner' && (
          <NavLink to="/owner" className={navLinkClass} onClick={closeMenu}>
            Dashboard
          </NavLink>
        )}

        <div className="mobile-menu-footer">
          <button
            className="theme-toggle"
            onClick={() => { toggleTheme(); closeMenu(); }}
            aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
          >
            {theme === 'light' ? '🌙' : '☀️'}
          </button>

          {isAuthenticated ? (
            <button className="btn btn-outline btn-sm" onClick={handleLogout}>
              Logout
            </button>
          ) : (
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <Link to="/login" className="btn btn-outline btn-sm" onClick={closeMenu}>
                Login
              </Link>
              <Link to="/register" className="btn btn-primary btn-sm" onClick={closeMenu}>
                Register
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
