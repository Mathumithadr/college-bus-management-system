// AuthContext — manages JWT session, user profile, login, logout and role checking across the whole app
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import axiosClient from '../api/axiosClient.js';

// Create the context object that components import via useAuth hook
const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  // user holds the decoded profile from GET /api/auth/me (null when logged out)
  const [user, setUser] = useState(null);

  // loading prevents protected routes from flashing or redirecting before token is verified
  const [loading, setLoading] = useState(true);

  // On first mount, try to restore an existing session from localStorage
  useEffect(() => {
    const restoreSession = async () => {
      const token = localStorage.getItem('cbms_token');
      if (!token) {
        // No token stored — skip verification and finish loading
        setLoading(false);
        return;
      }
      try {
        // Verify token is still valid and load the current user profile from GET /api/auth/me
        const res = await axiosClient.get('/auth/me');
        // Extract the user object cleanly regardless of response nesting
        const userData = res.data?.user || res.user || res.data;
        setUser(userData);
      } catch (err) {
        // Token is expired, invalid, or revoked — clear it so the user can re-authenticate
        console.warn('[AuthContext] Session restore failed:', err?.message);
        localStorage.removeItem('cbms_token');
        setUser(null);
      } finally {
        // Finished verifying session
        setLoading(false);
      }
    };
    restoreSession();
  }, []);

  // login — calls POST /api/auth/login, stores JWT, and sets the user profile in state
  const login = useCallback(async (email, password) => {
    const res = await axiosClient.post('/auth/login', { email, password });
    // Extract JWT token and user profile safely
    const token = res.data?.token || res.token;
    const userData = res.data?.user || res.user || res.data;

    // Store token in localStorage for subsequent requests
    if (token) {
      localStorage.setItem('cbms_token', token);
    }
    setUser(userData);
    return userData;
  }, []);

  // logout — calls POST /api/auth/logout to revoke the JWT in TokenRevocation collection
  const logout = useCallback(async () => {
    try {
      await axiosClient.post('/auth/logout');
    } catch (err) {
      // Even if network or request fails, clear local state to prevent stale access
      console.warn('[AuthContext] Logout request failed:', err?.message);
    } finally {
      localStorage.removeItem('cbms_token');
      setUser(null);
    }
  }, []);

  // isRole — helper for components to check if user has a specific role
  const isRole = useCallback(
    (role) => user?.role === role,
    [user]
  );

  // isRep — checks representative assignment in user permissions or role
  const isRep = useCallback(
    () => user?.permissions?.includes('representative') || user?.role === 'representative' || false,
    [user]
  );

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, isRole, isRep }}>
      {children}
    </AuthContext.Provider>
  );
}

// useAuth — the single import hook that any component uses to access auth state
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('[useAuth] Must be used inside <AuthProvider>');
  return ctx;
}
