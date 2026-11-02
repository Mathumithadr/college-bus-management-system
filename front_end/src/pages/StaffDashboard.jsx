// StaffDashboard — Overview page for faculty members.
// Shows:
// 1. Quick stats (pending requests count)
// 2. Recent activity
// 3. Quick links to the review queue

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axiosClient from '../api/axiosClient';
import { useAuth } from '../context/AuthContext';
import { 
  CalendarCheck, 
  Clock, 
  CheckCircle, 
  ArrowRight, 
  AlertCircle 
} from 'lucide-react';

export default function StaffDashboard() {
  const { user } = useAuth();
  
  // Stats state
  const [stats, setStats] = useState({
    pending: 0,
    approved: 0,
    rejected: 0,
  });
  const [recentRequests, setRecentRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // ─── Fetch Stats ────────────────────────────────────────────
  // GET /api/staff/attendance?status=pending → for pending
  // We also call once without status to get total counts.
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch all attendance requests (staff sees all that they can review)
        const res = await axiosClient.get('/staff/attendance');
        const allRequests = res.data || [];

        // Calculate stats
        setStats({
          pending: allRequests.filter(r => r.status === 'pending').length,
          approved: allRequests.filter(r => r.status === 'approved').length,
          rejected: allRequests.filter(r => r.status === 'rejected').length,
        });

        // Show 3 most recent pending requests
        const pending = allRequests
          .filter(r => r.status === 'pending')
          .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
          .slice(0, 3);
        setRecentRequests(pending);
        
        setError('');
      } catch (err) {
        setError(err?.message || 'Failed to load dashboard data.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, []);

  // Greeting based on time of day
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good Morning' : hour < 17 ? 'Good Afternoon' : 'Good Evening';
  const firstName = user?.name?.split(' ')[0] || 'Staff';

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      
      {/* ===== HEADER ===== */}
      <div>
        <h1 className="text-2xl font-bold text-white">
          {greeting}, {firstName} 👋
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          Here's what needs your attention today.
        </p>
      </div>

      {/* ===== ERROR ALERT ===== */}
      {error && (
        <div className="flex items-center gap-2 bg-rose-500/10 border border-rose-500/30 rounded-xl px-4 py-3 text-sm text-rose-400">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* ===== STATS CARDS ===== */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        
        {/* Pending Card */}
        <Link 
          to="/attendance" 
          className="bg-[#0c162b] border border-[#16274a] hover:border-amber-500/50 rounded-2xl p-5 transition group"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center group-hover:scale-110 transition">
              <Clock className="w-5 h-5" />
            </div>
            <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-amber-400 transition" />
          </div>
          <div className="text-3xl font-bold text-white">{loading ? '—' : stats.pending}</div>
          <div className="text-xs text-slate-400 mt-1">Pending Requests</div>
          <div className="text-[10px] text-amber-400 mt-2 font-medium">Needs your review</div>
        </Link>

        {/* Approved Card */}
        <div className="bg-[#0c162b] border border-[#16274a] rounded-2xl p-5">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center mb-3">
            <CheckCircle className="w-5 h-5" />
          </div>
          <div className="text-3xl font-bold text-white">{loading ? '—' : stats.approved}</div>
          <div className="text-xs text-slate-400 mt-1">Approved</div>
          <div className="text-[10px] text-slate-500 mt-2">Total approved</div>
        </div>

        {/* Rejected Card */}
        <div className="bg-[#0c162b] border border-[#16274a] rounded-2xl p-5">
          <div className="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-400 flex items-center justify-center mb-3">
            <CalendarCheck className="w-5 h-5" />
          </div>
          <div className="text-3xl font-bold text-white">{loading ? '—' : stats.rejected}</div>
          <div className="text-xs text-slate-400 mt-1">Rejected</div>
          <div className="text-[10px] text-slate-500 mt-2">Total rejected</div>
        </div>

      </div>

      {/* ===== RECENT PENDING REQUESTS ===== */}
      <div className="bg-[#0c162b] border border-[#16274a] rounded-2xl p-6 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-white">Recent Pending Requests</h2>
          <Link 
            to="/attendance" 
            className="text-xs text-emerald-400 hover:text-emerald-300 flex items-center gap-1 transition"
          >
            View all <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
        
        {loading ? (
          <div className="flex justify-center py-8">
            <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : recentRequests.length === 0 ? (
          <div className="text-center py-8">
            <CheckCircle className="w-10 h-10 text-emerald-500/50 mx-auto mb-2" />
            <p className="text-sm text-slate-400">All caught up! No pending requests.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {recentRequests.map((req) => (
              <div 
                key={req._id} 
                className="bg-[#0e192f] border border-[#1b2b4c] rounded-xl px-4 py-3 flex items-center justify-between"
              >
                <div>
                  <div className="text-sm font-semibold text-white">
                    {req.course} - Hour {req.classHour}
                  </div>
                  <div className="text-xs text-slate-400 mt-0.5">
                    {req.studentId?.name || 'Student'} · {new Date(req.date).toLocaleDateString()}
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5 truncate max-w-md">
                    {req.reason}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {req.delayVerified && (
                    <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                      Delay Verified
                    </span>
                  )}
                  <Link
                    to="/attendance"
                    className="text-xs text-emerald-400 hover:text-emerald-300 font-medium"
                  >
                    Review →
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}
