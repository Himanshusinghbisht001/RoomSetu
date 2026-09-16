/**
 * 403 Forbidden page – Phase 14 polish
 */

import { Link, useLocation } from 'react-router-dom';
import Navbar from '../components/Navbar.js';

export default function Forbidden() {
  const location = useLocation();
  const from = (location.state as any)?.from || '/';

  return (
    <div className="error-page">
      <Navbar />
      <main className="error-page-content" aria-labelledby="err-403-title">
        <p className="error-code" aria-hidden="true">403</p>
        <h1 id="err-403-title">Access Denied</h1>
        <p>
          You don't have permission to view this page.
          Please sign in with the correct account or go back home.
        </p>
        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link to="/" className="btn btn-primary">
            Go Home
          </Link>
          <Link to={`/login?returnTo=${encodeURIComponent(from)}`} className="btn btn-outline">
            Sign In
          </Link>
        </div>
      </main>
    </div>
  );
}
