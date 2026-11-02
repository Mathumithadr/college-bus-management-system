// AttendancePage — Student-facing page for requesting attendance exemptions
// when a bus is delayed, plus staff-facing review queue.
// 
// Features:
// 1. Students submit a request with course, faculty, and reason
// 2. Faculty dropdown is fetched from backend (auto-populated)
// 3. Requests show delay verification badge if the backend confirmed a delay
// 4. Staff can approve/reject pending requests

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
  Users,          // Icon for faculty dropdown
  Loader2         // Spinner for faculty loading state
} from 'lucide-react';

// Status badge colors matching the backend AttendanceRequest.status enum
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

  // ─── Faculty Dropdown State ─────────────────────────────────
  // facultyList holds all available faculty for the dropdown.
  // facultyLoading shows a spinner while fetching.
  // facultyError is set if the endpoint is unavailable.
  const [facultyList, setFacultyList] = useState([]);
  const [facultyLoading, setFacultyLoading] = useState(true);
  const [facultyError, setFacultyError] = useState('');

  // ─── Form State ─────────────────────────────────────────────
  // Added facultyId to the form so the dropdown value binds to it.
  const [form, setForm] = useState({
    date: '',
    classHour: '1',
    course: '',
    facultyId: '',           // ← Populated from the faculty dropdown or manual input
    reason: '',
  });
  const [submitting, setSubmitting] = useState(false);

  // ─── Fetch Faculty List ─────────────────────────────────────
  // Tries /staff/faculty-list first, then /admin/users?role=staff.
  // If BOTH fail (likely — endpoints not implemented yet), we fall back
  // to letting the student type the faculty ID manually.
  const fetchFacultyList = useCallback(async () => {
    setFacultyLoading(true);
    setFacultyError('');
    
    // Attempt 1: Dedicated faculty-list endpoint
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
    
    // Attempt 2: Admin users endpoint (may 403 for students)
    try {
      const res = await axiosClient.get('/admin/users?role=staff&limit=100');
      const list = res.data || res.users || res || [];
      if (list.length > 0) {
        setFacultyList(list.map(u => ({
          _id: u._id,
          name: u.name,
          department: u.department || 'General',
        })));
        setFacultyLoading(false);
        return;
      }
    } catch (err) {
      console.warn('[Attendance] /admin/users not accessible');
    }
    
    // Both failed — enable manual entry mode
    setFacultyList([]);
    setFacultyError('Faculty list not available. Please enter the Faculty ID manually.');
    setFacultyLoading(false);
  }, []);

  // Load faculty list once on mount (only for students — no need for staff)
  useEffect(() => {
    if (!isStaff) {
      fetchFacultyList();
    }
  }, [isStaff, fetchFacultyList]);

  // ─── Fetch Attendance Requests ──────────────────────────────
  // Students: GET /api/student/attendance (own requests)
  // Staff/Admin: GET /api/staff/attendance (review queue)
  const fetchRequests = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const endpoint = isStaff ? '/staff/attendance' : '/student/attendance';
      const res = await axiosClient.get(endpoint);
      setRequests(res.data || []);
    } catch (err) {
      setError(err?.message || 'Failed to load attendance requests.');
    } finally {
      setLoading(false);
    }
  }, [isStaff]);

  useEffect(() => { fetchRequests(); }, [fetchRequests]);

  // ─── Submit Handler ─────────────────────────────────────────
  // POST /api/student/attendance
  // Backend requires: date, classHour, course, facultyId, reason
  // Optional: busId (auto-attached from tracking context)
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
        facultyId: form.facultyId,             // ← From dropdown or manual input
        reason: form.reason,
        busId: busInfo?.busId?._id || null,
      });
      
      setSuccessMsg('Request submitted! The faculty will review it shortly.');
      // Reset form but keep classHour for convenience
      setForm({
        date: '',
        classHour: form.classHour,
        course: '',
        facultyId: '',
        reason: '',
      });
      // Refresh requests list so the student sees their new pending request immediately
      fetchRequests();
    } catch (err) {
      setError(err?.message || 'Failed to submit request.');
    } finally {
      setSubmitting(false);
    }
  };

  // ─── Cancel Handler (Students) ──────────────────────────────
  // DELETE /api/student/attendance/:id
  const handleCancel = async (requestId) => {
    if (!window.confirm('Cancel this attendance request?')) return;
    try {
      await axiosClient.delete(`/student/attendance/${requestId}`);
      setSuccessMsg('Request cancelled.');
      fetchRequests();
    } catch (err) {
      setError(err?.message || 'Failed to cancel request.');
    }
  };

  // ─── Staff Review Handler (Approve / Reject) ─────────────────
  // PATCH /api/staff/attendance/:id
  const handleReview = async (requestId, decision) => {
    const remarks = window.prompt(`Enter remarks for ${decision}:`) || '';
    try {
      await axiosClient.patch(`/staff/attendance/${requestId}`, {
        status: decision === 'approve' ? 'approved' : 'rejected',
        reviewRemarks: remarks,
      });
      setSuccessMsg(`Request ${decision}d.`);
      fetchRequests();
    } catch (err) {
      setError(err?.message || `Failed to ${decision} request.`);
    }
  };

  // ─── Render ─────────────────────────────────────────────────
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
      
      {/* ===== SUCCESS ALERT ===== */}
      {successMsg && (
        <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/30 rounded-xl px-4 py-3 text-sm text-emerald-400">
          <CheckCircle className="w-4 h-4 shrink-0" />{successMsg}
        </div>
      )}

      {/* ===== FACULTY LIST ERROR (only shown to students) ===== */}
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
            
            {/* Row 1: Date */}
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

            {/* Row 1: Class Hour */}
            <div>
              <label className="block text-xs text-slate-400 mb-1">Class Hour</label>
              <select 
                value={form.classHour}
                onChange={(e) => setForm({ ...form, classHour: e.target.value })}
                disabled={submitting}
                className="w-full px-3 py-2 bg-[#0e192f] border border-[#1b2b4c] rounded-xl text-sm text-slate-200 focus:outline-none focus:border-emerald-500"
              >
                {[1,2,3,4,5,6,7,8].map(h => (
                  <option key={h} value={h}>Hour {h}</option>
                ))}
              </select>
            </div>

            {/* Row 2: Course */}
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

            {/* Faculty Dropdown OR Manual Input (fallback) */}
            <div>
              <label className="block text-xs text-slate-400 mb-1 flex items-center gap-1">
                <Users className="w-3 h-3" />
                Faculty Member
                {facultyLoading && <Loader2 className="w-3 h-3 animate-spin ml-1" />}
              </label>
              
              {facultyList.length > 0 ? (
                // Dropdown when faculty list is available
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
                // Manual input fallback when no list available
                <input 
                  type="text"
                  required
                  placeholder="Paste faculty ObjectId (e.g. 65f1a2b3...)"
                  value={form.facultyId}
                  onChange={(e) => setForm({ ...form, facultyId: e.target.value })}
                  disabled={submitting || facultyLoading}
                  className="w-full px-3 py-2 bg-[#0e192f] border border-[#1b2b4c] rounded-xl text-sm text-slate-200 focus:outline-none focus:border-emerald-500 font-mono text-xs"
                />
              )}
            </div>

            {/* Row 3: Reason */}
            <div className="sm:col-span-2">
              <label className="block text-xs text-slate-400 mb-1">Reason for Delay</label>
              <textarea 
                required 
                rows={3}
                placeholder="e.g. Bus was delayed 20 minutes due to heavy traffic on the highway..."
                value={form.reason}
                onChange={(e) => setForm({ ...form, reason: e.target.value })}
                disabled={submitting}
                className="w-full px-3 py-2 bg-[#0e192f] border border-[#1b2b4c] rounded-xl text-sm text-slate-200 focus:outline-none focus:border-emerald-500 resize-none"
              />
            </div>

            {/* Submit */}
            <div className="sm:col-span-2">
              <button 
                type="submit" 
                disabled={submitting || facultyLoading}
                className="px-6 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 text-white font-semibold text-sm rounded-xl transition"
              >
                {submitting ? 'Submitting...' : 'Submit Request'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ===== REQUESTS LIST ===== */}
      <div className="bg-[#0c162b] border border-[#16274a] rounded-2xl p-6 shadow-xl">
        <h2 className="font-bold text-white mb-4">
          {isStaff ? 'Review Queue' : 'My Requests'}
        </h2>
        
        {loading ? (
          <div className="flex justify-center py-8">
            <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : requests.length === 0 ? (
          <p className="text-sm text-slate-500 text-center py-6">No requests found.</p>
        ) : (
          <div className="space-y-3">
            {requests.map((req) => (
              <div 
                key={req._id} 
                className="bg-[#0e192f] border border-[#1b2b4c] rounded-xl px-4 py-4"
              >
                <div className="flex items-start justify-between gap-4">
                  
                  {/* Left: Request details */}
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <h3 className="text-sm font-semibold text-white">
                        {req.course} - Hour {req.classHour}
                      </h3>
                      
                      {/* Delay Verified badge (set by backend when bus delay ≥15min) */}
                      {req.delayVerified && (
                        <span className="flex items-center gap-1 text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                          <ShieldCheck className="w-3 h-3" /> Delay Verified
                        </span>
                      )}
                    </div>
                    
                    <div className="text-xs text-slate-400">
                      {new Date(req.date).toLocaleDateString()} · {req.reason}
                    </div>
                    
                    {/* Faculty name (populated by backend) */}
                    {req.facultyId?.name && (
                      <div className="text-xs text-slate-500 mt-1">
                        Faculty: {req.facultyId.name}
                      </div>
                    )}
                    
                    {/* Faculty review remarks (shown after review) */}
                    {req.reviewRemarks && (
                      <div className="text-xs text-slate-500 mt-1 italic">
                        Remarks: {req.reviewRemarks}
                      </div>
                    )}
                  </div>
                  
                  {/* Right: Status + actions */}
                  <div className="flex items-center gap-3 shrink-0">
                    <span className={`px-2.5 py-1 rounded-full text-[11px] font-semibold border ${STATUS_STYLES[req.status] || STATUS_STYLES.pending}`}>
                      {req.status}
                    </span>
                    
                    {/* Student: Cancel button (only for pending requests) */}
                    {!isStaff && req.status === 'pending' && (
                      <button 
                        onClick={() => handleCancel(req._id)}
                        className="text-xs text-rose-400 hover:text-rose-300 transition"
                      >
                        Cancel
                      </button>
                    )}
                    
                    {/* Staff: Approve/Reject buttons */}
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
