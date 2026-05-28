// src/components/ProtectedRoute.tsx
// Wrapper component to protect routes that require authentication and email verification

import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, loading, session } = useAuth();
  const location = useLocation();

  const isVerified = !!user?.email_confirmed_at;
  const userEmail = user?.email || '';

  // Show loading spinner while checking auth
  if (loading) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <div className="text-center">
        <Loader2 className="h-12 w-12 animate-spin text-purple-400 mx-auto mb-4" />
        <p className="text-white/80 text-sm">Verifying your access...</p>
        <p className="text-white/60 text-xs mt-2">This should only take a moment</p>
      </div>
    </div>
  );
}

  // Redirect to signin if not authenticated
  if (!user) {
    return <Navigate to="/signin" state={{ from: location }} replace />;
  }

  // Redirect to verify-email if not verified
  if (!isVerified) {
    return <Navigate to={`/verify-email?email=${encodeURIComponent(userEmail)}`} replace />;
  }

  // User is authenticated and verified - render the protected content
  return <>{children}</>;
}