/**
 * 404 Not Found page – Phase 14 polish
 */

import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar.js';

export default function NotFound() {
  return (
    <div className="error-page">
      <Navbar />
      <main className="error-page-content" aria-labelledby="err-404-title">
        <p className="error-code" aria-hidden="true">404</p>
        <h1 id="err-404-title">Page Not Found</h1>
        <p>
          The page you're looking for doesn't exist or has been moved.
          Double-check the URL or head back home.
        </p>
        <Link to="/" className="btn btn-primary">
          Back to Home
        </Link>
      </main>
    </div>
  );
}
