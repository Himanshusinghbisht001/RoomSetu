import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../auth/AuthProvider.js';
import type { Role } from '../types/auth.js';
import FullPageSpinner from './FullPageSpinner.js';

interface Props {
  role: Role;
  children: React.ReactNode;
}

/**
 * Wraps role-specific routes.
 * - While auth is bootstrapping    → shows spinner
 * - Unauthenticated                → redirects to /login
 * - Authenticated, wrong role      → redirects to /403
 * - Authenticated, correct role    → renders children
 *
 * Note: frontend role enforcement is convenience only.
 * All real authorization is enforced by the backend API.
 */
export default function RequireRole({ role, children }: Props) {
  const { user, isAuthenticated, loading } = useAuth();
  const location = useLocation();

  if (loading) return <FullPageSpinner />;

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (user?.role !== role) {
    return <Navigate to="/403" state={{ from: location.pathname }} replace />;
  }

  return <>{children}</>;
}
