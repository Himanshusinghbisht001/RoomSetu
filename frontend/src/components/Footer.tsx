/**
 * Shared Footer – Phase 14
 *
 * Features:
 *   - Official RoomSetu logo (aspect-ratio preserved)
 *   - Tagline and description
 *   - Quick Links nav (existing routes only)
 *   - Support links (mailto / prepared for future modal)
 *   - Contact email (mailto)
 *   - "Report an Issue" CTA (prepared for future modal integration)
 *   - Copyright + developer credit
 *   - Dark / Light mode via CSS tokens
 *   - Fully responsive (desktop → tablet → mobile stack)
 *   - Semantic HTML, ARIA, keyboard accessible
 */

import { useState } from 'react';
import { Link } from 'react-router-dom';
import logoSrc from '../assets/logo.jpg';
import FeedbackModal from '../features/feedback/FeedbackModal.js';
import type { FeedbackType } from '../features/feedback/types.js';

const CONTACT_EMAIL = 'himanshusinghbisht0011@gmail.com';

interface FooterProps {
  /** Optional: called when "Report an Issue" is clicked. Prepared for future modal. */
  onReportIssue?: () => void;
}

export default function Footer({ onReportIssue }: FooterProps) {
  const [isFeedbackModalOpen, setIsFeedbackModalOpen] = useState(false);
  const [feedbackModalType, setFeedbackModalType] = useState<FeedbackType>('Suggestion');

  const openFeedbackModal = (type: FeedbackType) => {
    setFeedbackModalType(type);
    setIsFeedbackModalOpen(true);
  };

  const handleReportIssue = () => {
    openFeedbackModal('Bug / Error');
    if (onReportIssue) {
      onReportIssue();
    }
  };

  return (
    <>
      <footer className="site-footer" role="contentinfo" aria-label="Site footer">
        <div className="footer-inner">

          {/* ── Brand column ── */}
          <div className="footer-brand">
            <Link to="/" className="footer-logo-link" aria-label="RoomSetu – go to home page">
              <img
                src={logoSrc}
                alt="RoomSetu official logo"
                className="footer-logo-img"
              />
            </Link>

            <p className="footer-tagline">Find Your Space.</p>
            <p className="footer-description">
              Find the right room at the right place.
            </p>
          </div>

          {/* ── Quick Links ── */}
          <nav className="footer-nav" aria-label="Quick links">
            <h2 className="footer-nav-heading">Quick Links</h2>
            <ul className="footer-nav-list" role="list">
              <li>
                <Link to="/" className="footer-nav-link">
                  Home
                </Link>
              </li>
              <li>
                <Link to="/seeker" className="footer-nav-link">
                  Find Rooms
                </Link>
              </li>
              <li>
                {/* "How It Works" – section on Home page; anchor scroll */}
                <Link to="/" className="footer-nav-link">
                  How It Works
                </Link>
              </li>
            </ul>
          </nav>

          {/* ── Support ── */}
          <nav className="footer-nav" aria-label="Support links">
            <h2 className="footer-nav-heading">Support</h2>
            <ul className="footer-nav-list" role="list">
              <li>
                <button
                  type="button"
                  className="footer-nav-link footer-nav-btn"
                  onClick={handleReportIssue}
                  aria-label="Report an issue"
                >
                  Report an Issue
                </button>
              </li>
              <li>
                <button
                  type="button"
                  className="footer-nav-link footer-nav-btn"
                  onClick={() => openFeedbackModal('Suggestion')}
                  aria-label="Give feedback"
                >
                  Give Feedback
                </button>
              </li>
              <li>
                <a
                  href={`mailto:${CONTACT_EMAIL}?subject=Contact%20from%20RoomSetu`}
                  className="footer-nav-link"
                  aria-label="Contact us via email"
                >
                  Contact Us
                </a>
              </li>
            </ul>
          </nav>

          {/* ── Contact & CTA ── */}
          <div className="footer-contact">
            <h2 className="footer-nav-heading">Email</h2>
            <a
              href={`mailto:${CONTACT_EMAIL}`}
              className="footer-email-link"
              aria-label={`Send email to ${CONTACT_EMAIL}`}
            >
              {CONTACT_EMAIL}
            </a>

            <button
              type="button"
              className="btn btn-primary footer-cta-btn"
              onClick={handleReportIssue}
              aria-label="Report an issue – open issue form"
            >
              Report an Issue
            </button>
          </div>

        </div>

        {/* ── Bottom bar ── */}
        <div className="footer-bottom">
          <p className="footer-copy">
            © {new Date().getFullYear()} RoomSetu
          </p>
          <p className="footer-credit">
            Created by Himanshu Singh Bisht
          </p>
        </div>
      </footer>

      <FeedbackModal
        isOpen={isFeedbackModalOpen}
        onClose={() => setIsFeedbackModalOpen(false)}
        defaultType={feedbackModalType}
      />
    </>
  );
}
