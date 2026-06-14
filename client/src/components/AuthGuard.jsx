import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext.jsx';

/**
 * Route protection wrapper.
 * Redirects unauthenticated users to /login and saves their requested path.
 */
export const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#F6F6F6]">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-t-transparent border-[#1CC29F]"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    // Save intended destination
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
};

/**
 * Public routes wrapper (Login/Register).
 * Redirects already authenticated users to the dashboard.
 */
export const PublicRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#F6F6F6]">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-t-transparent border-[#1CC29F]"></div>
      </div>
    );
  }

  if (isAuthenticated) {
    const from = location.state?.from?.pathname || '/dashboard';
    return <Navigate to={from} replace />;
  }

  return children;
};
