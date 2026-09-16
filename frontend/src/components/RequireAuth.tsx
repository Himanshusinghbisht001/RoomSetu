import { useAuth } from '../auth/AuthProvider.js';
import { Navigate, useLocation } from 'react-router-dom';
import FullPageSpinner from './FullPageSpinner.js';

interface Props {
  children: React.ReactNode;
}

/**
 * Wraps protected routes.
 * - While auth is bootstrapping  → shows a loading spinner
 * - Authenticated               → renders children
 * - Unauthenticated             → redirects to /login, preserving intended destination
 */
export default function RequireAuth({ children }: Props) {
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();

  if (loading) return <FullPageSpinner />;

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
}
