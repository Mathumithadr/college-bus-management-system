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
import RepresentativeConsole from './pages/RepresentativeConsole.jsx';
import AttendancePage from './pages/AttendancePage.jsx';
import ReportsPage from './pages/ReportsPage.jsx';
import AnnouncementsPage from './pages/AnnouncementsPage.jsx';
import AdminPage from './pages/AdminPage.jsx';
import NotFoundPage from './pages/NotFoundPage.jsx';

// Role-aware home redirector — directs admins to /admin and students to /dashboard
function RoleHomeRedirect() {
  const { user } = useAuth();
  if (user?.role === 'admin') {
    return <Navigate to="/admin" replace />;
  }
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
              {/* Default root routes user to their appropriate role home */}
              <Route index element={<RoleHomeRedirect />} />
              <Route path="/dashboard" element={<StudentDashboard />} />

              {/* Rep console — only accessible if user has an active RepresentativeAssignment */}
              <Route
                path="/rep/transit"
                element={
                  <ProtectedRoute requiredRole="representative">
                    <RepresentativeConsole />
                  </ProtectedRoute>
                }
              />

              {/* Shared pages — available to authenticated users */}
              <Route path="/attendance" element={<AttendancePage />} />
              <Route path="/reports" element={<ReportsPage />} />
              <Route path="/announcements" element={<AnnouncementsPage />} />

              {/* Admin-only fleet management portal */}
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
