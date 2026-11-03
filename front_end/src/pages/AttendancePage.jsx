// AttendancePage — Student-facing page for requesting attendance exemptions
// when a bus is delayed, plus staff-facing review queue.
//
// Features:
// 1. Students submit a request with course, faculty, and reason
// 2. Faculty dropdown is fetched from backend (auto-populated)
// 3. Requests show delay verification badge if the backend confirmed a delay
// 4. Staff can approve/reject pending requests
// 5. Staff can filter by status (Pending, Approved, Rejected)
//
// Backend Endpoints used:
// - GET /api/student/attendance
// - POST /api/student/attendance
// - PUT /api/student/attendance/:id/cancel
// - GET /api/staff/attendance
// - PUT /api/staff/attendance/:id/review
// - GET /api/staff/faculty-list (may or may not exist)

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

  // ─── Filter State (Staff only) ─────────────────────────────
  // Tracks which status filter the staff has selected.
  // Backend endpoint GET /api/staff/attendance?status=<status> supports this.
  const [filterStatus, setFilterStatus] = useState('pending');

  // ─── Faculty Dropdown State (Students only) ─────────────────
  const [facultyList, setFacultyList] = useState([]);
  const [facultyLoading, setFacultyLoading] = useState(true);
  const [facultyError, setFacultyError] = useState('');

  // ─── Form State (Students only) ─────────────────────────────
  const [form, setForm] = useState({
    date: '',
    classHour: '1',
    course: '',
    facultyId: '',
    reason: '',
  });
  const [submitting, setSubmitting] = useState(false);

  // ─── Fetch Faculty List ─────────────────────────────────────
  const fetchFacultyList = useCallback(async () => {
    setFacultyLoading(true);
    setFacultyError('');

    try {
      const res = await axiosClient.get('/staff/faculty-list');
      const list = res.data || res || [];
      if (list.length > 0) {
        setFacultyList(list);
        setFacultyLoading(false);
        return;
      }
    } catch (err) {
      console.warn('[Attendance] /staff/faculty-list not available');
    }

    try {
      const res = await axiosClient.get('/admin/users?role=staff&limit=100');
      const list = res.data || res.users || res || [];
      if (list.length > 0) {
        setFacultyList(
          list.map((u) => ({
            _id: u._id,
            name: u.name,
            department: u.department || 'General',
          }))
        );
        setFacultyLoading(false);
        return;
      }
    } catch (err) {
      console.warn('[Attendance] /admin/users not accessible');
    }

    setFacultyList([]);
    setFacultyError('Faculty list not available. Please enter the Faculty ID manually.');
    setFacultyLoading(false);
  }, []);

  useEffect(() => {
    if (!isStaff) {
      fetchFacultyList();
    }
  }, [isStaff, fetchFacultyList]);

  // ─── Fetch Attendance Requests ──────────────────────────────
  // Staff uses the status filter. Students always see all their own requests.
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
      setForm({ ...form, date: '', course: '', reason: '' });
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

      {/* ===== GLOBAL ERROR ALERT ===== */}
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

      {!isStaff && facultyError && (
        <div className="flex items-center gap-2 bg-amber-500/10 border border-amber-500/30 rounded-xl px-4 py-3 text-sm text-amber-400">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{facultyError}</span>
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
            <div>
              <label className="block text-xs text-slate-400 mb-1 flex items-center gap-1">
                <Users className="w-3 h-3" /> Faculty Member
                {facultyLoading && <Loader2 className="w-3 h-3 animate-spin ml-1" />}
              </label>
              {facultyList.length > 0 ? (
                <select
                  required
                  value={form.facultyId}
                  onChange={(e) => setForm({ ...form, facultyId: e.target.value })}
                  disabled={submitting}
                  className="w-full px-3 py-2 bg-[#0e192f] border border-[#1b2b4c] rounded-xl text-sm text-slate-200 focus:outline-none focus:border-emerald-500"
                >
                  <option value="">Select a faculty member</option>
                  {facultyList.map((f) => (
                    <option key={f._id} value={f._id}>
                      {f.name}{f.department ? ` (${f.department})` : ''}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  required
                  placeholder="Paste faculty ObjectId"
                  value={form.facultyId}
                  onChange={(e) => setForm({ ...form, facultyId: e.target.value })}
                  disabled={submitting || facultyLoading}
                  className="w-full px-3 py-2 bg-[#0e192f] border border-[#1b2b4c] rounded-xl text-sm text-slate-200 focus:outline-none focus:border-emerald-500 font-mono text-xs"
                />
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
                disabled={submitting || facultyLoading || facultyList.length === 0}
                className="px-6 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 text-white font-semibold text-sm rounded-xl transition"
              >
                {submitting ? 'Submitting...' : 'Submit Request'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ===== STAFF FILTER BAR (only visible to staff/admin) ===== */}
      {isStaff && (
        <div className="flex gap-2">
          {['pending', 'approved', 'rejected'].map((status) => (
            <button
              key={status}
              onClick={() => setFilterStatus(status)}
              className={`px-4 py-2 rounded-xl text-sm font-semibold capitalize transition ${
                filterStatus === status
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
          {isStaff
            ? `Review Queue (${filterStatus})`
            : 'My Requests'}
        </h2>

        {loading ? (
          <div className="flex justify-center py-8">
            <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : requests.length === 0 ? (
          <p className="text-sm text-slate-500 text-center py-6">
            No {filterStatus} requests found.
          </p>
        ) : (
          <div className="space-y-3">
            {requests.map((req) => (
              <div
                key={req._id}
                className="bg-[#0e192f] border border-[#1b2b4c] rounded-xl px-4 py-4"
              >
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
                    {req.reviewRemarks && (
                      <div className="text-xs text-slate-500 mt-1 italic">
                        Remarks: {req.reviewRemarks}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <span
                      className={`px-2.5 py-1 rounded-full text-[11px] font-semibold border ${STATUS_STYLES[req.status] || STATUS_STYLES.pending}`}
                    >
                      {req.status}
                    </span>

                    {!isStaff && req.status === 'pending' && (
                      <button
                        onClick={() => handleCancel(req._id)}
                        className="text-xs text-rose-400 hover:text-rose-300 transition"
                      >
                        Cancel
                      </button>
                    )}

                    {isStaff && req.status === 'pending' && (
                      <div className="flex gap-1">
                        <button
                          onClick={() => handleReview(req._id, 'approve')}
                          className="p-1.5 bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600/40 rounded-lg transition"
                          title="Approve"
                        >
                          <CheckCircle className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleReview(req._id, 'reject')}
                          className="p-1.5 bg-rose-600/20 text-rose-400 hover:bg-rose-600/40 rounded-lg transition"
                          title="Reject"
                        >
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