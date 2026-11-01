// LoginPage — public page where students, staff, and admins enter credentials to receive a JWT
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bus, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();

  // Form field state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // submitting disables the button while the POST /api/auth/login request is in flight
  const [submitting, setSubmitting] = useState(false);

  // error holds the backend error message (e.g. INVALID_CREDENTIALS, ACCOUNT_LOCKED)
  const [error, setError] = useState('');

  // handleSubmit — calls the AuthContext login function which POSTs to /api/auth/login
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please enter both email and password.');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      // login() stores the JWT and sets the user in AuthContext
      const user = await login(email, password);

      // Route admin users to the admin panel, all others to the student dashboard
      if (user.role === 'admin') {
        navigate('/admin', { replace: true });
      } else {
        navigate('/dashboard', { replace: true });
      }
    } catch (err) {
      // Map backend error codes to human-friendly messages
      const code = err?.code;
      if (code === 'INVALID_CREDENTIALS') setError('Incorrect email or password.');
      else if (code === 'ACCOUNT_LOCKED') setError('Account locked — too many failed attempts. Try again in 15 minutes.');
      else setError(err?.message || 'Login failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    // Full-page dark background with centered login card
    <div className="min-h-screen bg-[#070d18] flex items-center justify-center px-4">
      <div className="w-full max-w-md">

        {/* App branding shown above the login form */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-amber-400 flex items-center justify-center text-slate-950 shadow-xl shadow-amber-400/25 mb-4">
            <Bus className="w-9 h-9" />
          </div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">College Bus Management</h1>
          <p className="text-sm text-slate-400 mt-1">Sign in to your account</p>
        </div>

        {/* Login card with subtle border and dark card background */}
        <div className="bg-[#0c162b] border border-[#16274a] rounded-2xl p-8 shadow-2xl">
          <form onSubmit={handleSubmit} className="space-y-5">

            {/* Email field — bound to POST /api/auth/login body.email */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">
                Email address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@college.edu"
                className="w-full px-4 py-2.5 bg-[#0e192f] border border-[#1b2b4c] rounded-xl text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition"
                autoComplete="email"
                disabled={submitting}
              />
            </div>

            {/* Password field — bound to POST /api/auth/login body.password */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-2.5 bg-[#0e192f] border border-[#1b2b4c] rounded-xl text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition"
                autoComplete="current-password"
                disabled={submitting}
              />
            </div>

            {/* Error alert box — shown when backend returns an error code */}
            {error && (
              <div className="flex items-start gap-2.5 bg-rose-500/10 border border-rose-500/30 rounded-xl px-4 py-3 text-sm text-rose-400">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {/* Submit button — shows spinner while request is in flight */}
            <button
              type="submit"
              disabled={submitting}
              className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold text-sm rounded-xl transition shadow-lg shadow-emerald-600/25"
            >
              {submitting ? 'Signing in...' : 'Sign in'}
            </button>
          </form>

          {/* Quick Demo Credentials Buttons for Development & Testing */}
          <div className="mt-6 pt-5 border-t border-[#1b2b4c]">
            <p className="text-xs text-slate-400 font-semibold mb-2.5">Quick Demo Logins (Click to autofill & sign in):</p>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => { setEmail('admin@college.edu'); setPassword('Admin@123'); }}
                className="px-2 py-1.5 bg-[#0e192f] hover:bg-slate-800 border border-emerald-500/30 rounded-lg text-xs text-emerald-400 font-medium transition"
              >
                👨‍💼 Admin
              </button>
              <button
                type="button"
                onClick={() => { setEmail('student@college.edu'); setPassword('Student@123'); }}
                className="px-2 py-1.5 bg-[#0e192f] hover:bg-slate-800 border border-blue-500/30 rounded-lg text-xs text-blue-400 font-medium transition"
              >
                👨‍🎓 Student
              </button>
              <button
                type="button"
                onClick={() => { setEmail('rep@college.edu'); setPassword('Student@123'); }}
                className="px-2 py-1.5 bg-[#0e192f] hover:bg-slate-800 border border-amber-500/30 rounded-lg text-xs text-amber-400 font-medium transition"
              >
                🚌 Rep
              </button>
            </div>
          </div>
        </div>

        {/* Footer note — informs users that accounts are provisioned by admin */}
        <p className="text-center text-xs text-slate-500 mt-6">
          Account access is provisioned by the college transport office.
        </p>
      </div>
    </div>
  );
}
