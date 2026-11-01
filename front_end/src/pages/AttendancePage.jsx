// AttendancePage — student submits delay concession requests; staff reviews and verifies them
import React, { useState, useEffect, useCallback } from 'react';
import { CalendarCheck, AlertCircle, CheckCircle, XCircle, Clock } from 'lucide-react';
import axiosClient from '../api/axiosClient.js';
import { useAuth } from '../context/AuthContext.jsx';

// Status badge colors map — matches the backend AttendanceRequest status enum
const STATUS_STYLES = {
  pending:   'bg-amber-500/15 text-amber-400 border-amber-500/30',
  approved:  'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  rejected:  'bg-rose-500/15 text-rose-400 border-rose-500/30',
  cancelled: 'bg-slate-500/15 text-slate-400 border-slate-500/30',
};

export default function AttendancePage() {
  const { user } = useAuth();
  const isStaff = user?.role === 'staff' || user?.role === 'admin';

  // requests list comes from GET /api/student/attendance-requests or /api/staff/attendance-requests
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // New request form state — bound to POST /api/student/attendance-requests
  const [form, setForm] = useState({ date: '', classHour: '1', reason: '' });
  const [submitting, setSubmitting] = useState(false);

  // fetchRequests — loads attendance history from the correct endpoint based on user role
  const fetchRequests = useCallback(async () => {
    setLoading(true);
    try {
      const endpoint = isStaff ? '/staff/attendance-requests' : '/student/attendance-requests';
      const res = await axiosClient.get(endpoint);
      setRequests(res.data?.items || res.data || []);
    } catch (err) {
      setError('Failed to load attendance requests.');
    } finally {
      setLoading(false);
    }
  }, [isStaff]);

  useEffect(() => { fetchRequests(); }, [fetchRequests]);

  // handleSubmit — student POSTs a new attendance concession request
  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      await axiosClient.post('/student/attendance-requests', {
        date: form.date,
        classHour: parseInt(form.classHour, 10),
        reason: form.reason,
      });
      setSuccessMsg('Request submitted! The system will auto-verify if your bus was delayed ≥15 min.');
      setForm({ date: '', classHour: '1', reason: '' });
      fetchRequests(); // Refresh the list after submission
    } catch (err) {
      setError(err?.message || 'Failed to submit request.');
    } finally {
      setSubmitting(false);
    }
  };

  // handleVerify — staff approves or rejects a request via POST /api/staff/attendance-requests/:id/verify
  const handleVerify = async (id, status) => {
    try {
      await axiosClient.post(`/staff/attendance-requests/${id}/verify`, { status });
      fetchRequests(); // Refresh list to reflect the new status
    } catch (err) {
      setError('Verification action failed.');
    }
  };

  return (
    <div className="space-y-5">
      {/* Page header */}
      <div className="flex items-center gap-3">
        <CalendarCheck className="w-6 h-6 text-emerald-400" />
        <h1 className="text-xl font-extrabold text-white">Attendance Requests</h1>
      </div>

      {/* Error and success alerts */}
      {error      && <div className="flex items-center gap-2 bg-rose-500/10 border border-rose-500/30 rounded-xl px-4 py-3 text-sm text-rose-400"><AlertCircle className="w-4 h-4 shrink-0" />{error}</div>}
      {successMsg && <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/30 rounded-xl px-4 py-3 text-sm text-emerald-400"><CheckCircle className="w-4 h-4 shrink-0" />{successMsg}</div>}

      {/* STUDENT ONLY: Concession request form */}
      {!isStaff && (
        <div className="rounded-2xl bg-[#0c162b] border border-[#16274a] p-5 shadow-xl">
          <h2 className="font-bold text-white text-base mb-4">Submit New Request</h2>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Date field — maps to body.date */}
            <div>
              <label className="block text-xs text-slate-400 mb-1">Date</label>
              <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })}
                className="w-full px-3 py-2 bg-[#0e192f] border border-[#1b2b4c] rounded-xl text-sm text-slate-200 focus:outline-none focus:border-emerald-500"
                required disabled={submitting} />
            </div>
            {/* Class hour — 1 to 10, maps to body.classHour */}
            <div>
              <label className="block text-xs text-slate-400 mb-1">Class Hour</label>
              <select value={form.classHour} onChange={(e) => setForm({ ...form, classHour: e.target.value })}
                className="w-full px-3 py-2 bg-[#0e192f] border border-[#1b2b4c] rounded-xl text-sm text-slate-200 focus:outline-none focus:border-emerald-500"
                disabled={submitting}>
                {[1,2,3,4,5,6,7,8,9,10].map(h => <option key={h} value={h}>Hour {h}</option>)}
              </select>
            </div>
            {/* Reason text — maps to body.reason */}
            <div>
              <label className="block text-xs text-slate-400 mb-1">Reason</label>
              <input type="text" placeholder="Bus was delayed due to traffic..."
                value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })}
                className="w-full px-3 py-2 bg-[#0e192f] border border-[#1b2b4c] rounded-xl text-sm text-slate-200 focus:outline-none focus:border-emerald-500"
                required disabled={submitting} />
            </div>
            <div className="sm:col-span-3">
              <button type="submit" disabled={submitting}
                className="px-6 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 text-white font-semibold text-sm rounded-xl transition">
                {submitting ? 'Submitting...' : 'Submit Request'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Requests list */}
      <div className="rounded-2xl bg-[#0c162b] border border-[#16274a] p-5 shadow-xl">
        <h2 className="font-bold text-white text-base mb-4">{isStaff ? 'Pending Verifications' : 'My Requests'}</h2>
        {loading ? (
          <div className="flex justify-center py-8"><div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" /></div>
        ) : requests.length === 0 ? (
          <p className="text-sm text-slate-500 text-center py-6">No attendance requests found.</p>
        ) : (
          <div className="space-y-3">
            {requests.map((req) => (
              <div key={req._id} className="flex items-center justify-between bg-[#0e192f] border border-[#1b2b4c] rounded-xl px-4 py-3">
                <div>
                  <div className="text-sm font-semibold text-white">{req.ticketNumber}</div>
                  <div className="text-xs text-slate-400 mt-0.5">
                    {new Date(req.date).toLocaleDateString()} · Hour {req.classHour}
                  </div>
                  {/* delayVerified badge — backend auto-sets this when delay ≥ 15 min */}
                  {req.delayVerified && (
                    <div className="mt-1 text-[10px] text-emerald-400 font-medium">✓ Delay Verified (≥15 min)</div>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  {/* Status badge matching backend enum */}
                  <span className={`px-2.5 py-1 rounded-full text-[11px] font-semibold border ${STATUS_STYLES[req.status] || STATUS_STYLES.pending}`}>
                    {req.status}
                  </span>
                  {/* Staff-only verify buttons — calls POST /api/staff/attendance-requests/:id/verify */}
                  {isStaff && req.status === 'pending' && (
                    <div className="flex gap-2">
                      <button onClick={() => handleVerify(req._id, 'approved')} className="p-1.5 rounded-lg bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600/40 transition">
                        <CheckCircle className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleVerify(req._id, 'rejected')} className="p-1.5 rounded-lg bg-rose-600/20 text-rose-400 hover:bg-rose-600/40 transition">
                        <XCircle className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
