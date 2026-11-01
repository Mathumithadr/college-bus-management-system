// ProtectedRoute — blocks unauthenticated users and role-unauthorized users from accessing a page
import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';

// requiredRole is optional; if not passed, any authenticated user is allowed through
export default function ProtectedRoute({ children, requiredRole }) {
  const { user, loading } = useAuth();

  // Show blank while restoring session from localStorage on first load
  if (loading) {
    return (
      <div className="min-h-screen bg-[#070d18] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Redirect unauthenticated visitors to login page
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Redirect users who don't match the required role to their default page
  if (requiredRole === 'admin' && user.role !== 'admin') {
    return <Navigate to="/dashboard" replace />;
  }

  // Representative access is granted via user.permissions array from RepresentativeAssignment
  if (requiredRole === 'representative' && !user.permissions?.includes('representative')) {
    return <Navigate to="/dashboard" replace />;
  }

  // User is authenticated and authorized — render the requested page
  return children;
}
