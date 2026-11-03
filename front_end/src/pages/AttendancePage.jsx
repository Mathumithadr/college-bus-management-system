// AttendancePage — Student-facing page for requesting attendance exemptions
// when a bus is delayed, plus staff-facing review queue.

import React, { useState, useEffect, useCallback } from 'react';
import axiosClient from '../api/axiosClient';
import { useAuth } from '../context/AuthContext';
import { useTracking } from '../context/TrackingContext';
import {
  CalendarCheck,
  AlertCircle,
  CheckCircle,
  XCircle,
  ShieldCheck,
  Users,
  Loader2,
} from 'lucide-react';

// Status badge colors
const STATUS_STYLES = {
  pending: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  approved: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  rejected: 'bg-rose-500/15 text-rose-400 border-rose-500/30',
  cancelled: 'bg-slate-500/15 text-slate-400 border-slate-500/30',
};

export default function AttendancePage() {
  const { user } = useAuth();
  const { busInfo } = useTracking();
  const isStaff = user?.role === 'staff' || user?.role === 'admin';

  // ─── Data State ─────────────────────────────────────────────
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // ─── Staff Search State (Your NEW Feature) ──────────────────
  const [staffList, setStaffList] = useState([]);
  const [staffSearch, setStaffSearch] = useState('');
  const [showStaffDropdown, setShowStaffDropdown] = useState(false);

  // ─── Filter State (Teammate's Feature) ──────────────────────
  const [filterStatus, setFilterStatus] = useState('pending');

  // ─── Form State (Students only) ─────────────────────────────
  const [form, setForm] = useState({
    date: '',
    classHour: '1',
    course: '',
    facultyId: '',
    reason: '',
  });
  const [submitting, setSubmitting] = useState(false);

  // ─── Fetch Staff List for Search Bar ────────────────────────
  useEffect(() => {
    const fetchStaff = async () => {
      try {
        const res = await axiosClient.get('/staff/list');
        setStaffList(res.data?.staff || res.staff || []);
      } catch (err) {
        console.error("Failed to load staff list", err);
      }
    };
    if (!isStaff) fetchStaff();
  }, [isStaff]);

  // ─── Fetch Attendance Requests ──────────────────────────────
  const fetchRequests = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const endpoint = isStaff
        ? `/staff/attendance?status=${filterStatus}`
        : '/student/attendance';
      const res = await axiosClient.get(endpoint);
      setRequests(res.data || []);
    } catch (err) {
      setError(err?.message || 'Failed to load attendance requests.');
    } finally {
      setLoading(false);
    }
  }, [isStaff, filterStatus]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  // ─── Submit Handler (Students only) ─────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    setSuccessMsg('');

    try {
      await axiosClient.post('/student/attendance', {
        date: form.date,
        classHour: parseInt(form.classHour, 10),
        course: form.course,
        facultyId: form.facultyId,
        reason: form.reason,
        busId: busInfo?.busId?._id || null,
      });

      setSuccessMsg('Request submitted! The faculty will review it shortly.');
      setForm({ ...form, date: '', course: '', reason: '', facultyId: '' });
      setStaffSearch('');
      fetchRequests();
    } catch (err) {
      setError(err?.message || 'Failed to submit request.');
    } finally {
      setSubmitting(false);
    }
  };

  // ─── Cancel Handler (Students only) ─────────────────────────
  const handleCancel = async (id) => {
    if (!window.confirm('Cancel this attendance request?')) return;
    try {
      await axiosClient.put(`/student/attendance/${id}/cancel`);
      fetchRequests();
    } catch (err) {
      setError(err?.message || 'Failed to cancel request.');
    }
  };

  // ─── Staff Review Handler ───────────────────────────────────
  const handleReview = async (id, action) => {
    try {
      await axiosClient.put(`/staff/attendance/${id}/review`, {
        action,
        remarks: action === 'reject' ? 'Not verified' : 'Verified',
      });
      fetchRequests();
    } catch (err) {
      setError(err?.message || 'Review failed.');
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* ===== PAGE HEADER ===== */}
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <CalendarCheck className="w-6 h-6 text-emerald-400" /> Attendance Requests
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          {isStaff
            ? 'Review pending attendance requests from students.'
            : 'Request exemptions for classes missed due to bus delays.'}
        </p>
      </div>

      {/* ===== ALERTS ===== */}
      {error && (
        <div className="flex items-center gap-2 bg-rose-500/10 border border-rose-500/30 rounded-xl px-4 py-3 text-sm text-rose-400">
          <AlertCircle className="w-4 h-4 shrink-0" />{error}
        </div>
      )}
      {successMsg && (
        <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/30 rounded-xl px-4 py-3 text-sm text-emerald-400">
          <CheckCircle className="w-4 h-4 shrink-0" />{successMsg}
        </div>
      )}

      {/* ===== SUBMISSION FORM (Students Only) ===== */}
      {!isStaff && (
        <div className="bg-[#0c162b] border border-[#16274a] rounded-2xl p-6 shadow-xl">
          <h2 className="font-bold text-white mb-4">Submit New Request</h2>

          <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-slate-400 mb-1">Date</label>
              <input
                type="date"
                required
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
                disabled={submitting}
                className="w-full px-3 py-2 bg-[#0e192f] border border-[#1b2b4c] rounded-xl text-sm text-slate-200 focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Class Hour</label>
              <select
                value={form.classHour}
                onChange={(e) => setForm({ ...form, classHour: e.target.value })}
                disabled={submitting}
                className="w-full px-3 py-2 bg-[#0e192f] border border-[#1b2b4c] rounded-xl text-sm text-slate-200 focus:outline-none focus:border-emerald-500"
              >
                {[1, 2, 3, 4, 5, 6, 7, 8].map((h) => (
                  <option key={h} value={h}>Hour {h}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Course Code / Name</label>
              <input
                type="text"
                required
                placeholder="e.g. CS101 - Data Structures"
                value={form.course}
                onChange={(e) => setForm({ ...form, course: e.target.value })}
                disabled={submitting}
                className="w-full px-3 py-2 bg-[#0e192f] border border-[#1b2b4c] rounded-xl text-sm text-slate-200 focus:outline-none focus:border-emerald-500"
              />
            </div>

            {/* ===== STAFF SEARCH BAR ===== */}
            <div className="relative">
              <label className="block text-xs text-slate-400 mb-1 flex items-center gap-1">
                <Users className="w-3 h-3" /> Faculty Member
              </label>

              <input
                type="text"
                placeholder="Search by faculty name or email..."
                value={staffSearch}
                onChange={(e) => {
                  setStaffSearch(e.target.value);
                  setShowStaffDropdown(true);
                  setForm({ ...form, facultyId: '' });
                }}
                onFocus={() => setShowStaffDropdown(true)}
                className="w-full bg-[#0e192f] border border-[#1b2b4c] rounded-xl px-4 py-2 text-white text-sm focus:border-emerald-500 focus:outline-none"
              />

              {showStaffDropdown && staffSearch.length > 0 && (
                <ul className="absolute z-50 w-full mt-1 bg-[#0e192f] border border-[#1b2b4c] rounded-xl shadow-2xl max-h-48 overflow-y-auto">
                  {staffList
                    .filter(s =>
                      s.name.toLowerCase().includes(staffSearch.toLowerCase()) ||
                      s.email.toLowerCase().includes(staffSearch.toLowerCase())
                    )
                    .map(s => (
                      <li
                        key={s._id}
                        onClick={() => {
                          setForm({ ...form, facultyId: s._id });
                          setStaffSearch(`${s.name} (${s.department || 'Staff'})`);
                          setShowStaffDropdown(false);
                        }}
                        className="px-4 py-2 text-sm text-slate-300 hover:bg-[#16274a] cursor-pointer border-b border-[#1b2b4c] last:border-0"
                      >
                        <div className="font-bold text-white">{s.name}</div>
                        <div className="text-xs text-slate-500">{s.email}</div>
                      </li>
                    ))}
                  {staffList.filter(s => s.name.toLowerCase().includes(staffSearch.toLowerCase())).length === 0 && (
                    <li className="px-4 py-2 text-sm text-slate-500 italic">No staff found...</li>
                  )}
                </ul>
              )}

              {form.facultyId && (
                <p className="text-xs text-emerald-400 mt-1">✅ Selected ID: {form.facultyId}</p>
              )}
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs text-slate-400 mb-1">Reason for Delay</label>
              <textarea
                required
                rows={3}
                placeholder="e.g. Bus was delayed 20 minutes due to heavy traffic..."
                value={form.reason}
                onChange={(e) => setForm({ ...form, reason: e.target.value })}
                disabled={submitting}
                className="w-full px-3 py-2 bg-[#0e192f] border border-[#1b2b4c] rounded-xl text-sm text-slate-200 focus:outline-none focus:border-emerald-500 resize-none"
              />
            </div>
            <div className="sm:col-span-2">
              <button
                type="submit"
                disabled={submitting}
                className="px-6 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 text-white font-semibold text-sm rounded-xl transition"
              >
                {submitting ? 'Submitting...' : 'Submit Request'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ===== STAFF FILTER BAR ===== */}
      {isStaff && (
        <div className="flex gap-2">
          {['pending', 'approved', 'rejected'].map((status) => (
            <button
              key={status}
              onClick={() => setFilterStatus(status)}
              className={`px-4 py-2 rounded-xl text-sm font-semibold capitalize transition ${filterStatus === status
                  ? 'bg-emerald-600/20 text-emerald-400 border border-emerald-500/30'
                  : 'bg-[#0c162b] text-slate-400 hover:text-white border border-[#16274a]'
                }`}
            >
              {status}
            </button>
          ))}
        </div>
      )}

      {/* ===== REQUESTS LIST ===== */}
      <div className="bg-[#0c162b] border border-[#16274a] rounded-2xl p-6 shadow-xl">
        <h2 className="font-bold text-white mb-4">
          {isStaff ? `Review Queue (${filterStatus})` : 'My Requests'}
        </h2>

        {loading ? (
          <div className="flex justify-center py-8">
            <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : requests.length === 0 ? (
          <p className="text-sm text-slate-500 text-center py-6">
            No {isStaff ? filterStatus : ''} requests found.
          </p>
        ) : (
          <div className="space-y-3">
            {requests.map((req) => (
              <div key={req._id} className="bg-[#0e192f] border border-[#1b2b4c] rounded-xl px-4 py-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <h3 className="text-sm font-semibold text-white">
                        {req.course} - Hour {req.classHour}
                      </h3>
                      {req.delayVerified && (
                        <span className="flex items-center gap-1 text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                          <ShieldCheck className="w-3 h-3" /> Delay Verified
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-slate-400">
                      {new Date(req.date).toLocaleDateString()} · {req.reason}
                    </div>
                    {req.studentId?.name && (
                      <div className="text-xs text-slate-500 mt-1">
                        Student: {req.studentId.name}
                      </div>
                    )}
                    {req.facultyId?.name && (
                      <div className="text-xs text-slate-500 mt-1">
                        Faculty: {req.facultyId.name}
                      </div>
                    )}
                    {req.reviewRemarks && (
                      <div className="text-xs text-slate-500 mt-1 italic">
                        Remarks: {req.reviewRemarks}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <span className={`px-2.5 py-1 rounded-full text-[11px] font-semibold border ${STATUS_STYLES[req.status] || STATUS_STYLES.pending}`}>
                      {req.status}
                    </span>

                    {!isStaff && req.status === 'pending' && (
                      <button onClick={() => handleCancel(req._id)} className="text-xs text-rose-400 hover:text-rose-300 transition">
                        Cancel
                      </button>
                    )}

                    {isStaff && req.status === 'pending' && (
                      <div className="flex gap-1">
                        <button onClick={() => handleReview(req._id, 'approve')} className="p-1.5 bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600/40 rounded-lg transition" title="Approve">
                          <CheckCircle className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleReview(req._id, 'reject')} className="p-1.5 bg-rose-600/20 text-rose-400 hover:bg-rose-600/40 rounded-lg transition" title="Reject">
                          <XCircle className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}