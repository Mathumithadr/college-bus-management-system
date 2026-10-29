// ReportsPage — student submits safety/grievance tickets; shows status timeline (Submitted → Resolved → Closed)
import React, { useState, useEffect, useCallback } from 'react';
import { FileText, AlertCircle, CheckCircle } from 'lucide-react';
import axiosClient from '../api/axiosClient.js';

// Category options matching the Report model enum in the backend
const CATEGORIES = ['bus_delay', 'driver_staff_behaviour', 'bus_condition', 'route_stop_issue', 'other'];
const SEVERITIES  = ['low', 'medium', 'high'];

// Status timeline styles matching the report lifecycle from backend Report.js model
const STATUS_STEPS = ['submitted', 'under_review', 'more_information_required', 'resolved', 'closed'];
const STATUS_COLORS = {
  submitted:                   'bg-blue-500/15 text-blue-400 border-blue-500/30',
  under_review:                'bg-amber-500/15 text-amber-400 border-amber-500/30',
  more_information_required:   'bg-orange-500/15 text-orange-400 border-orange-500/30',
  resolved:                    'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  closed:                      'bg-slate-500/15 text-slate-400 border-slate-500/30',
};

export default function ReportsPage() {
  // reports list from GET /api/student/reports or GET /api/admin/reports
  const [reports, setReports] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState('');
  const [success, setSuccess]   = useState('');

  // New report form — maps directly to POST /api/student/reports request body
  const [form, setForm] = useState({ category: 'bus_delay', severity: 'medium', description: '' });
  const [submitting, setSubmitting] = useState(false);

  // fetchReports — loads all tickets from GET /api/student/reports
  const fetchReports = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axiosClient.get('/student/reports');
      setReports(res.data?.items || res.data || []);
    } catch (err) {
      setError('Failed to load reports.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchReports(); }, [fetchReports]);

  // handleSubmit — POSTs a new grievance report and refreshes the list
  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      const res = await axiosClient.post('/student/reports', form);
      setSuccess(`Report filed successfully! Ticket: ${res.data?.report?.ticketNumber}`);
      setForm({ category: 'bus_delay', severity: 'medium', description: '' });
      fetchReports();
    } catch (err) {
      setError(err?.message || 'Failed to file report.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Page header */}
      <div className="flex items-center gap-3">
        <FileText className="w-6 h-6 text-emerald-400" />
        <h1 className="text-xl font-extrabold text-white">Reports & Grievances</h1>
      </div>

      {/* Success and error alerts */}
      {error   && <div className="flex items-center gap-2 bg-rose-500/10 border border-rose-500/30 rounded-xl px-4 py-3 text-sm text-rose-400"><AlertCircle className="w-4 h-4 shrink-0" />{error}</div>}
      {success && <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/30 rounded-xl px-4 py-3 text-sm text-emerald-400"><CheckCircle className="w-4 h-4 shrink-0" />{success}</div>}

      {/* New report form card */}
      <div className="rounded-2xl bg-[#0c162b] border border-[#16274a] p-5 shadow-xl">
        <h2 className="font-bold text-white text-base mb-4">File a New Report</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Category select — matches backend Report.category enum */}
            <div>
              <label className="block text-xs text-slate-400 mb-1">Category</label>
              <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}
                className="w-full px-3 py-2 bg-[#0e192f] border border-[#1b2b4c] rounded-xl text-sm text-slate-200 focus:outline-none focus:border-emerald-500"
                disabled={submitting}>
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c.replace(/_/g, ' ')}</option>
                ))}
              </select>
            </div>

            {/* Severity select — matches backend Report.severity enum */}
            <div>
              <label className="block text-xs text-slate-400 mb-1">Severity</label>
              <select value={form.severity} onChange={(e) => setForm({ ...form, severity: e.target.value })}
                className="w-full px-3 py-2 bg-[#0e192f] border border-[#1b2b4c] rounded-xl text-sm text-slate-200 focus:outline-none focus:border-emerald-500"
                disabled={submitting}>
                {SEVERITIES.map((s) => (
                  <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Description textarea — maps to body.description */}
          <div>
            <label className="block text-xs text-slate-400 mb-1">Description</label>
            <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Describe the incident clearly..."
              rows={3} required disabled={submitting}
              className="w-full px-3 py-2 bg-[#0e192f] border border-[#1b2b4c] rounded-xl text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500 resize-none" />
          </div>

          <button type="submit" disabled={submitting}
            className="px-6 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 text-white font-semibold text-sm rounded-xl transition">
            {submitting ? 'Filing...' : 'Submit Report'}
          </button>
        </form>
      </div>

      {/* Reports list with ticket ID and status badge */}
      <div className="rounded-2xl bg-[#0c162b] border border-[#16274a] p-5 shadow-xl">
        <h2 className="font-bold text-white text-base mb-4">My Reports</h2>
        {loading ? (
          <div className="flex justify-center py-8"><div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" /></div>
        ) : reports.length === 0 ? (
          <p className="text-sm text-slate-500 text-center py-6">No reports filed yet.</p>
        ) : (
          <div className="space-y-3">
            {reports.map((report) => (
              <div key={report._id} className="bg-[#0e192f] border border-[#1b2b4c] rounded-xl px-4 py-3">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    {/* Ticket ID generated by the backend ticket.js util */}
                    <div className="text-sm font-bold text-white">{report.ticketNumber || report._id?.slice(-8)}</div>
                    <div className="text-xs text-slate-400 mt-0.5 capitalize">{report.category?.replace(/_/g, ' ')} · {report.severity}</div>
                    <div className="text-xs text-slate-500 mt-0.5 line-clamp-1">{report.description}</div>
                  </div>
                  {/* Status badge matches Report.status enum from backend */}
                  <span className={`px-2.5 py-1 rounded-full text-[11px] font-semibold border shrink-0 ${STATUS_COLORS[report.status] || STATUS_COLORS.submitted}`}>
                    {report.status?.replace(/_/g, ' ')}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
