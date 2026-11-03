// App root — defines all client-side routes and wraps the app with Auth context and ErrorBoundary
import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext.jsx';
import { TrackingProvider } from './context/TrackingContext.jsx';
import ProtectedRoute from './components/common/ProtectedRoute.jsx';
import ErrorBoundary from './components/common/ErrorBoundary.jsx';
import AppLayout from './components/layout/AppLayout.jsx';

// Page imports — each page maps to one role's primary view
import LoginPage from './pages/LoginPage.jsx';
import StudentDashboard from './pages/StudentDashboard.jsx';
import BusTrackingPage from './pages/BusTrackingPage.jsx';
import RepresentativeConsole from './pages/RepresentativeConsole.jsx';
import AttendancePage from './pages/AttendancePage.jsx';
import ReportsPage from './pages/ReportsPage.jsx';
import AnnouncementsPage from './pages/AnnouncementsPage.jsx';
import StaffDashboard from './pages/StaffDashboard.jsx';
import AdminPage from './pages/AdminPage.jsx';
import NotFoundPage from './pages/NotFoundPage.jsx';

// Role-aware home redirector — directs users to their respective landing page
function RoleHomeRedirect() {
  const { user } = useAuth();

  if (!user) return <Navigate to="/login" replace />;

  // Admin goes to admin panel
  if (user.role === 'admin') {
    return <Navigate to="/admin" replace />;
  }

  // Staff goes to staff dashboard
  if (user.role === 'staff') {
    return <Navigate to="/staff/dashboard" replace />;
  }

  // Representative goes to the transit console
  if (user.permissions?.includes('representative')) {
    return <Navigate to="/rep/transit" replace />;
  }

  // Regular students go to the dashboard
  return <Navigate to="/dashboard" replace />;
}

export default function App() {
  return (
    // Global ErrorBoundary catches any rendering errors and prevents blank screens
    <ErrorBoundary>
      {/* AuthProvider wraps everything so any component can access the current user session */}
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            {/* Public route — no token required */}
            <Route path="/login" element={<LoginPage />} />

            {/* Protected routes — token must be valid; role checked per route */}
            <Route
              element={
                <ProtectedRoute>
                  {/* TrackingProvider starts/stops live bus location polling for students */}
                  <TrackingProvider>
                    <AppLayout />
                  </TrackingProvider>
                </ProtectedRoute>
              }
            >
              <Route index element={<RoleHomeRedirect />} />

              {/* Student routes */}
              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute requiredRole="student">
                    <StudentDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/tracking"
                element={
                  <ProtectedRoute requiredRole="student">
                    <BusTrackingPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/reports"
                element={
                  <ProtectedRoute requiredRole="student">
                    <ReportsPage />
                  </ProtectedRoute>
                }
              />

              {/* Staff routes */}
              <Route
                path="/staff/dashboard"
                element={
                  <ProtectedRoute requiredRole="staff">
                    <StaffDashboard />
                  </ProtectedRoute>
                }
              />
              <Route path="/staff" element={<Navigate to="/staff/dashboard" replace />} />

              {/* Shared routes (available to all roles) */}
              <Route path="/attendance" element={<AttendancePage />} />
              <Route path="/announcements" element={<AnnouncementsPage />} />

              {/* Rep routes */}
              <Route
                path="/rep/transit"
                element={
                  <ProtectedRoute requiredRole="representative">
                    <RepresentativeConsole />
                  </ProtectedRoute>
                }
              />

              {/* Admin routes */}
              <Route
                path="/admin"
                element={
                  <ProtectedRoute requiredRole="admin">
                    <AdminPage />
                  </ProtectedRoute>
                }
              />
            </Route>

            {/* Catch-all for unknown URLs */}
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ErrorBoundary>
  );
}
