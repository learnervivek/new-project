import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import Skeleton from '../ui/Skeleton';
import { Compass } from 'lucide-react';

export function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-6 text-center space-y-4">
        <div className="w-12 h-12 rounded-2xl bg-forest-50 border border-forest-100 flex items-center justify-center text-forest-600 animate-pulse">
          <Compass className="w-6 h-6 animate-spin" style={{ animationDuration: '4s' }} />
        </div>
        <div className="space-y-2 max-w-sm w-full">
          <Skeleton className="h-4 w-32 mx-auto" />
          <Skeleton className="h-3 w-48 mx-auto" />
        </div>
      </div>
    );
  }

  if (!user) {
    // Redirect to login page preserving the intended destination
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
}

export default ProtectedRoute;
