import { Navigate, useLocation } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export function FullPageLoader() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <Loader2 className="size-6 animate-spin text-accent-text" />
    </div>
  );
}

export function ProtectedRoute({ children }) {
  const { user, initializing } = useAuth();
  const location = useLocation();
  if (initializing) return <FullPageLoader />;
  if (!user) return <Navigate to="/login" replace state={{ from: location }} />;
  return children;
}

/** For login/signup: signed-in users go straight to the dashboard. */
export function GuestRoute({ children }) {
  const { user, initializing } = useAuth();
  if (initializing) return <FullPageLoader />;
  if (user) return <Navigate to="/" replace />;
  return children;
}
