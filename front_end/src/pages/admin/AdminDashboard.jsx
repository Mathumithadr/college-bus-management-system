// AdminDashboard — High-level overview for administrators.
// Shows quick stats about the fleet, users, and pending reports.

import React, { useState, useEffect } from 'react';
import axiosClient from '../../api/axiosClient';
import { Bus, Users, FileWarning, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    buses: 0,
    routes: 0,
    reports: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        // Fetch all three data types in parallel
        const [busesRes, routesRes, reportsRes] = await Promise.all([
          axiosClient.get('/admin/buses').catch(() => ({ data: [] })),
          axiosClient.get('/admin/routes').catch(() => ({ data: [] })),
          axiosClient.get('/admin/reports').catch(() => ({ data: [] })),
        ]);

        setStats({
          buses: (busesRes.data || []).length,
          routes: (routesRes.data || []).length,
          reports: (reportsRes.data || []).filter(r => r.status === 'submitted' || r.status === 'under_review').length,
        });
      } catch (err) {
        console.error('Failed to load stats', err);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Admin Dashboard</h1>
        <p className="text-sm text-slate-400 mt-1">System overview and quick actions.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Buses Card */}
        <Link to="/admin/fleet" className="bg-[#0c162b] border border-[#16274a] hover:border-emerald-500/50 rounded-2xl p-5 transition group">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center group-hover:scale-110 transition">
              <Bus className="w-5 h-5" />
            </div>
            <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-emerald-400 transition" />
          </div>
          <div className="text-3xl font-bold text-white">{loading ? '—' : stats.buses}</div>
          <div className="text-xs text-slate-400 mt-1">Buses in Fleet</div>
        </Link>

        {/* Routes Card */}
        <Link to="/admin/fleet" className="bg-[#0c162b] border border-[#16274a] hover:border-blue-500/50 rounded-2xl p-5 transition group">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center group-hover:scale-110 transition">
              <Bus className="w-5 h-5" /> {/* Using Bus icon for routes too, or use MapPin */}
            </div>
            <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-blue-400 transition" />
          </div>
          <div className="text-3xl font-bold text-white">{loading ? '—' : stats.routes}</div>
          <div className="text-xs text-slate-400 mt-1">Active Routes</div>
        </Link>

        {/* Reports Card */}
        <Link to="/admin/reports" className="bg-[#0c162b] border border-[#16274a] hover:border-amber-500/50 rounded-2xl p-5 transition group">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center group-hover:scale-110 transition">
              <FileWarning className="w-5 h-5" />
            </div>
            <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-amber-400 transition" />
          </div>
          <div className="text-3xl font-bold text-white">{loading ? '—' : stats.reports}</div>
          <div className="text-xs text-slate-400 mt-1">Pending Reports</div>
        </Link>
      </div>

      <div className="bg-[#0c162b] border border-[#16274a] rounded-2xl p-6 shadow-xl text-center py-12">
        <h2 className="text-lg font-bold text-white mb-2">Welcome, Administrator</h2>
        <p className="text-sm text-slate-400">Use the sidebar to manage the fleet, assignments, and student grievances.</p>
      </div>
    </div>
  );
}