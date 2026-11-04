// App root — defines all client-side routes and wraps the app with Auth context and ErrorBoundary
import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext.jsx';
import { TrackingProvider } from './context/TrackingContext.jsx';
import ProtectedRoute from './components/common/ProtectedRoute.jsx';
import ErrorBoundary from './components/common/ErrorBoundary.jsx';
import AppLayout from './components/layout/AppLayout.jsx';

// Page imports
import LoginPage from './pages/LoginPage.jsx';
import StudentDashboard from './pages/StudentDashboard.jsx';
import BusTrackingPage from './pages/BusTrackingPage.jsx';
import RepresentativeConsole from './pages/RepresentativeConsole.jsx';
import AttendancePage from './pages/AttendancePage.jsx';
import ReportsPage from './pages/ReportsPage.jsx';
import AnnouncementsPage from './pages/AnnouncementsPage.jsx';
import StaffDashboard from './pages/StaffDashboard.jsx';
import AdminPage from './pages/AdminPage.jsx';
import AdminLateBusesPage from './pages/admin/AdminLateBusesPage.jsx';
import AdminAnnouncementsPage from './pages/admin/AdminAnnouncementsPage.jsx';
import NotFoundPage from './pages/NotFoundPage.jsx';

// Role-aware home redirector
function RoleHomeRedirect() {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (user.role === 'admin') return <Navigate to="/admin" replace />;
  if (user.role === 'staff') return <Navigate to="/staff/dashboard" replace />;
  if (user.permissions?.includes('representative')) return <Navigate to="/rep/transit" replace />;
  return <Navigate to="/dashboard" replace />;
}

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            {/* Public route */}
            <Route path="/login" element={<LoginPage />} />

            {/* Protected routes */}
            <Route
              element={
                <ProtectedRoute>
                  <TrackingProvider>
                    <AppLayout />
                  </TrackingProvider>
                </ProtectedRoute>
              }
            >
              <Route index element={<RoleHomeRedirect />} />

              {/* Student routes */}
              <Route path="/dashboard" element={<ProtectedRoute requiredRole="student"><StudentDashboard /></ProtectedRoute>} />
              <Route path="/tracking" element={<ProtectedRoute requiredRole="student"><BusTrackingPage /></ProtectedRoute>} />
              <Route path="/reports" element={<ProtectedRoute requiredRole="student"><ReportsPage /></ProtectedRoute>} />

              {/* Staff routes */}
              <Route path="/staff/dashboard" element={<ProtectedRoute requiredRole="staff"><StaffDashboard /></ProtectedRoute>} />
              <Route path="/staff" element={<Navigate to="/staff/dashboard" replace />} />

              {/* Shared routes */}
              <Route path="/attendance" element={<AttendancePage />} />
              <Route path="/announcements" element={<AnnouncementsPage />} />

              {/* Rep routes */}
              <Route path="/rep/transit" element={<ProtectedRoute requiredRole="representative"><RepresentativeConsole /></ProtectedRoute>} />

              {/* ======================================================== */}
              {/* ADMIN ROUTES                                             */}
              {/* ======================================================== */}

              {/* Main Admin Panel (all tabs inside) */}
              <Route path="/admin" element={<ProtectedRoute requiredRole="admin"><AdminPage /></ProtectedRoute>} />
              <Route path="/admin/representatives" element={<ProtectedRoute requiredRole="admin"><AdminPage defaultTab="Representatives" /></ProtectedRoute>} />

              {/* Separate Admin pages */}
              <Route path="/admin/late-buses" element={<ProtectedRoute requiredRole="admin"><AdminLateBusesPage /></ProtectedRoute>} />
              <Route path="/admin/announcements" element={<ProtectedRoute requiredRole="admin"><AdminAnnouncementsPage /></ProtectedRoute>} />

              {/* Legacy redirects — old URLs still work, now point to /admin */}
              <Route path="/admin/fleet" element={<Navigate to="/admin" replace />} />
              <Route path="/admin/assignments" element={<Navigate to="/admin" replace />} />
              <Route path="/admin/stops" element={<Navigate to="/admin" replace />} />
              <Route path="/admin/schedule" element={<Navigate to="/admin" replace />} />
              <Route path="/admin/reports" element={<Navigate to="/admin" replace />} />
            </Route>

            {/* Catch-all */}
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ErrorBoundary>
  );
}