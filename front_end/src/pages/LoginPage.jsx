import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Bus, Lock, Mail, AlertCircle, ArrowRight } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const user = await login(email, password);

      // Role-based redirect based on backend user data
      if (user.role === 'admin') {
        navigate('/admin');
      } else if (user.role === 'staff') {
        navigate('/staff/dashboard');
      } else if (user.permissions?.includes('representative')) {
        navigate('/rep/transit');
      } else {
        navigate('/dashboard');
      }
    } catch (err) {
      // Handle backend error formats (e.g., INVALID_CREDENTIALS)
      setError(err.message || 'Failed to login. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#070d18] flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-[#0c162b] border border-[#16274a] rounded-2xl p-8 shadow-2xl">

        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-amber-400 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-amber-400/20">
            <Bus className="w-8 h-8 text-slate-900" />
          </div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">College Bus Management</h1>
          <p className="text-sm text-slate-400 mt-2">Sign in to your account</p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-6 flex items-center gap-2 bg-rose-500/10 border border-rose-500/30 rounded-xl px-4 py-3 text-sm text-rose-400">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">Email address</label>
            <div className="relative">
              <Mail className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@college.edu"
                className="w-full pl-10 pr-4 py-2.5 bg-[#0e192f] border border-[#1b2b4c] rounded-xl text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">Password</label>
            <div className="relative">
              <Lock className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-10 pr-4 py-2.5 bg-[#0e192f] border border-[#1b2b4c] rounded-xl text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 text-white font-semibold text-sm rounded-xl transition shadow-lg shadow-emerald-600/20"
          >
            {loading ? 'Signing in...' : 'Sign In'}
            {!loading && <ArrowRight className="w-4 h-4" />}
          </button>
        </form>

        {/* Quick Demo Credentials (For testing, remove in prod) */}
        <div className="mt-6 pt-6 border-t border-[#1b2b4c]">
          <p className="text-xs text-slate-500 text-center mb-3">Quick Demo Logins</p>
          <div className="grid grid-cols-2 gap-2">
            <button onClick={() => { setEmail('admin@college.edu'); setPassword('Admin@123'); }} className="px-3 py-1.5 bg-[#0e192f] hover:bg-slate-800 border border-slate-700 rounded-lg text-xs text-slate-300 transition">Admin</button>
            <button onClick={() => { setEmail('student@college.edu'); setPassword('Student@123'); }} className="px-3 py-1.5 bg-[#0e192f] hover:bg-slate-800 border border-slate-700 rounded-lg text-xs text-slate-300 transition">Student</button>
            <button onClick={() => { setEmail('rep@college.edu'); setPassword('Rep@123'); }} className="px-3 py-1.5 bg-[#0e192f] hover:bg-slate-800 border border-slate-700 rounded-lg text-xs text-slate-300 transition">Rep</button>
            <button onClick={() => { setEmail('staff@college.edu'); setPassword('Staff@123'); }} className="px-3 py-1.5 bg-[#0e192f] hover:bg-slate-800 border border-slate-700 rounded-lg text-xs text-slate-300 transition">Staff</button>
          </div>
        </div>

      </div>
    </div>
  );
}
