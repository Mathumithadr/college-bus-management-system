// ReportsPage — Student-facing page for submitting transport complaints/queries
// and tracking their resolution status (Submitted → Under Review → Resolved → Closed).
// This page allows students to:
// 1. File a new grievance (category, severity, description)
// 2. See a list of their past reports with status badges
// 3. View the ticket ID assigned by the backend (e.g., TICK-2026-0001)
// 4. Understand the current state of their resolution

import React, { useState, useEffect, useCallback } from 'react';
import axiosClient from '../api/axiosClient';
import {
  FileText,       // Icon for the page header
  AlertCircle,    // Icon for error alerts
  CheckCircle,    // Icon for success messages
  X,              // Icon to clear alerts
  Clock,          // Icon for "Under Review" status
  ShieldCheck,    // Icon for "Resolved" status
  Send            // Icon for submit button
} from 'lucide-react';

// ─── CONSTANTS ─────────────────────────────────────────────────────────────
// Category options must match the backend Report model enum exactly.
// Backend file: src/models/Report.js → category: { enum: [...] }
const CATEGORIES = [
  { value: 'bus_delay', label: 'Bus Delay' },
  { value: 'driver_staff_behaviour', label: 'Driver / Staff Behaviour' },
  { value: 'bus_condition', label: 'Bus Condition (Cleanliness, Damage)' },
  { value: 'route_stop_issue', label: 'Route / Stop Issue' },
  { value: 'other', label: 'Other' },
];

// Severity levels — currently stored in the description as a prefix or in a 
// dedicated field on the backend. Keeping this in the UI for structured input.
const SEVERITIES = [
  { value: 'low', label: 'Low', color: 'text-emerald-400' },
  { value: 'medium', label: 'Medium', color: 'text-amber-400' },
  { value: 'high', label: 'High', color: 'text-rose-400' },
];

// Status badge colors matching the backend Report.status enum.
// Backend states: 'submitted' | 'under_review' | 'more_information_required' | 'resolved' | 'rejected' | 'closed'
const STATUS_STYLES = {
  submitted: 'bg-blue-500/15    text-blue-400    border-blue-500/30',
  under_review: 'bg-amber-500/15   text-amber-400   border-amber-500/30',
  more_information_required: 'bg-orange-500/15  text-orange-400  border-orange-500/30',
  resolved: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  rejected: 'bg-rose-500/15    text-rose-400    border-rose-500/30',
  closed: 'bg-slate-500/15   text-slate-400   border-slate-500/30',
};

// Human-readable labels for each status (replacing underscores with spaces)
const STATUS_LABELS = {
  submitted: 'Submitted',
  under_review: 'Under Review',
  more_information_required: 'Info Required',
  resolved: 'Resolved',
  rejected: 'Rejected',
  closed: 'Closed',
};

// ─── COMPONENT ─────────────────────────────────────────────────────────────
export default function ReportsPage() {
  // --- State Management ---
  const [reports, setReports] = useState([]);        // List of the student's reports
  const [loading, setLoading] = useState(true);      // Initial page load spinner
  const [error, setError] = useState('');            // Error message from API
  const [success, setSuccess] = useState('');        // Success message after submit
  const [submitting, setSubmitting] = useState(false); // Submit button loading state

  // Form state — matches the fields expected by POST /api/student/reports
  const [form, setForm] = useState({
    category: 'bus_delay',       // Default category
    severity: 'medium',          // Default severity
    subject: '',                 // Short title of the complaint
    description: '',             // Detailed description
    busId: '',                   // Optional: link to a specific bus
  });

  // --- Fetch Reports on Mount ---
  // Loads the student's report history from the backend.
  // Endpoint: GET /api/student/reports
  // Access: Authenticated student only (enforced by backend requireRole('student'))
  const fetchReports = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axiosClient.get('/student/reports');
      // Backend returns paginated: { data: [...], pagination: {...} }
      // We extract only the data array for this view.
      setReports(res.data || []);
    } catch (err) {
      setError(err?.message || 'Failed to load reports.');
    } finally {
      setLoading(false);
    }
  }, []);

  // useEffect fires once on mount to load the initial list.
  // The empty dependency array [] means "run only once".
  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  // --- Form Submission Handler ---
  // Creates a new report via POST /api/student/reports.
  // The backend:
  // 1. Generates a unique ticketId (e.g., TICK-2026-0001)
  // 2. Creates the report with status 'submitted'
  // 3. Logs an entry in ReportStatusHistory
  const handleSubmit = async (e) => {
    e.preventDefault();          // Prevent page refresh
    setSubmitting(true);
    setError('');
    setSuccess('');

    try {
      // Construct request body — only send fields the backend expects.
      // See backend/src/modules/student/student.service.js → createStudentReport()
      const payload = {
        category: form.category,
        subject: form.subject,
        description: form.description,
        // Optional fields — sent only if provided (backend treats null as "no bus")
        busId: form.busId || null,
      };

      const res = await axiosClient.post('/student/reports', payload);

      // Show success message with the ticket ID returned by the backend
      const ticketId = res.data?.report?.ticketId || res.report?.ticketId || 'TICK-XXXX-XXXX';
      setSuccess(`Report filed successfully! Your ticket ID is ${ticketId}.`);

      // Clear the form for the next submission
      setForm({ ...form, subject: '', description: '', busId: '' });

      // Refresh the list to show the new report at the top
      fetchReports();
    } catch (err) {
      setError(err?.message || 'Failed to submit report.');
    } finally {
      setSubmitting(false);
    }
  };

  // --- Render ---
  return (
    <div className="max-w-4xl mx-auto space-y-6">

      {/* ============ PAGE HEADER ============ */}
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <FileText className="w-6 h-6 text-blue-400" /> Reports & Grievances
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          File a complaint about bus service and track its resolution.
        </p>
      </div>

      {/* ============ ERROR ALERT ============ */}
      {/* Displayed when an API call fails — auto-hides on next action */}
      {error && (
        <div className="flex items-center justify-between gap-2 bg-rose-500/10 border border-rose-500/30 rounded-xl px-4 py-3 text-sm text-rose-400">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError('')} className="text-rose-400 hover:text-rose-300">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ============ SUCCESS ALERT ============ */}
      {/* Displayed after a successful report submission */}
      {success && (
        <div className="flex items-center justify-between gap-2 bg-emerald-500/10 border border-emerald-500/30 rounded-xl px-4 py-3 text-sm text-emerald-400">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 shrink-0" />
            <span>{success}</span>
          </div>
          <button onClick={() => setSuccess('')} className="text-emerald-400 hover:text-emerald-300">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ============ NEW REPORT FORM ============ */}
      <div className="bg-[#0c162b] border border-[#16274a] rounded-2xl p-6 shadow-xl">
        <h2 className="font-bold text-white mb-4">File a New Report</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Row 1: Category + Severity side by side */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

            {/* Category dropdown — matches Report.category enum */}
            <div>
              <label className="block text-xs text-slate-400 mb-1">Category</label>
              <select
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                disabled={submitting}
                className="w-full px-3 py-2 bg-[#0e192f] border border-[#1b2b4c] rounded-xl text-sm text-slate-200 focus:outline-none focus:border-emerald-500"
              >
                {CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </div>

            {/* Severity dropdown — free-form for now */}
            <div>
              <label className="block text-xs text-slate-400 mb-1">Severity</label>
              <select
                value={form.severity}
                onChange={(e) => setForm({ ...form, severity: e.target.value })}
                disabled={submitting}
                className="w-full px-3 py-2 bg-[#0e192f] border border-[#1b2b4c] rounded-xl text-sm text-slate-200 focus:outline-none focus:border-emerald-500"
              >
                {SEVERITIES.map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Subject — short title, required by backend */}
          <div>
            <label className="block text-xs text-slate-400 mb-1">Subject</label>
            <input
              type="text"
              required
              placeholder="e.g., Bus 12 was 30 min late"
              value={form.subject}
              onChange={(e) => setForm({ ...form, subject: e.target.value })}
              disabled={submitting}
              className="w-full px-3 py-2 bg-[#0e192f] border border-[#1b2b4c] rounded-xl text-sm text-slate-200 focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* Description — detailed complaint, required by backend */}
          <div>
            <label className="block text-xs text-slate-400 mb-1">Description</label>
            <textarea
              required
              rows={4}
              placeholder="Describe the issue in detail..."
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              disabled={submitting}
              className="w-full px-3 py-2 bg-[#0e192f] border border-[#1b2b4c] rounded-xl text-sm text-slate-200 focus:outline-none focus:border-emerald-500 resize-none"
            />
          </div>

          {/* Submit button */}
          <button
            type="submit"
            disabled={submitting}
            className="flex items-center gap-2 px-6 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-60 text-white font-semibold text-sm rounded-xl transition"
          >
            <Send className="w-4 h-4" />
            {submitting ? 'Submitting...' : 'Submit Report'}
          </button>
        </form>
      </div>

      {/* ============ REPORTS LIST ============ */}
      <div className="bg-[#0c162b] border border-[#16274a] rounded-2xl p-6 shadow-xl">
        <h2 className="font-bold text-white mb-4">My Reports</h2>

        {loading ? (
          // Loading spinner while fetching
          <div className="flex justify-center py-8">
            <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : reports.length === 0 ? (
          // Empty state
          <div className="text-center py-8">
            <FileText className="w-10 h-10 text-slate-600 mx-auto mb-2" />
            <p className="text-sm text-slate-500">No reports filed yet.</p>
          </div>
        ) : (
          // List of reports
          <div className="space-y-3">
            {reports.map((report) => (
              <div
                key={report._id}
                className="bg-[#0e192f] border border-[#1b2b4c] rounded-xl px-4 py-4"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    {/* Ticket ID + Status Row */}
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-mono text-slate-500">
                        {report.ticketId || `#${report._id.slice(-6)}`}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${STATUS_STYLES[report.status] || STATUS_STYLES.submitted
                          }`}
                      >
                        {STATUS_LABELS[report.status] || report.status}
                      </span>
                    </div>

                    {/* Subject */}
                    <h3 className="text-sm font-bold text-white">{report.subject}</h3>

                    {/* Description (truncated to 2 lines) */}
                    <p className="text-xs text-slate-400 mt-1 line-clamp-2">
                      {report.description}
                    </p>

                    {/* Meta row — category + date */}
                    <div className="flex items-center gap-3 text-[11px] text-slate-500 mt-2">
                      <span className="capitalize">{report.category?.replace(/_/g, ' ')}</span>
                      <span>·</span>
                      <span>{new Date(report.createdAt).toLocaleDateString()}</span>
                    </div>

                    {/* Admin resolution note (if any) */}
                    {report.resolution && (
                      <div className="mt-2 p-2 bg-emerald-500/5 border border-emerald-500/20 rounded-lg">
                        <p className="text-[11px] text-emerald-400 font-semibold">Resolution</p>
                        <p className="text-xs text-slate-300 mt-0.5">{report.resolution}</p>
                      </div>
                    )}

                    {/* Admin note (internal) — shown to student for transparency */}
                    {report.adminNote && report.status === 'more_information_required' && (
                      <div className="mt-2 p-2 bg-orange-500/5 border border-orange-500/20 rounded-lg">
                        <p className="text-[11px] text-orange-400 font-semibold">Admin Note</p>
                        <p className="text-xs text-slate-300 mt-0.5">{report.adminNote}</p>
                      </div>
                    )}
                  </div>

                  {/* Right side: status icon */}
                  <div className="shrink-0">
                    {report.status === 'resolved' && <ShieldCheck className="w-5 h-5 text-emerald-400" />}
                    {report.status === 'under_review' && <Clock className="w-5 h-5 text-amber-400" />}
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