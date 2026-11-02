// AssignmentsPage — Admin interface for assigning students and representatives to buses.
//
// Features:
// 1. Two tabs: Student Assignments & Representative Assignments.
// 2. Dropdowns to select a User, Bus, and Route.
// 3. For Reps, a role selector (Primary or Vice).
// 4. A list of current active assignments for the selected type.
//
// Backend Endpoints (expected):
// - GET /api/admin/users?role=student (or staff for reps)
// - GET /api/admin/buses
// - GET /api/admin/routes
// - POST /api/admin/assignments/students
// - POST /api/admin/assignments/representatives
// - GET /api/admin/assignments?type=students|representatives

import React, { useState, useEffect, useCallback } from 'react';
import axiosClient from '../../api/axiosClient';
import {
  Users,
  Bus as BusIcon,
  Map as MapIcon,
  Plus,
  AlertCircle,
  CheckCircle,
  Shield,
  FileSpreadsheet,
} from 'lucide-react';

import BulkStudentUpload from './BulkStudentUpload';

export default function AssignmentsPage() {
  // --- Tab State ---
  const [activeTab, setActiveTab] = useState('students'); // 'students' | 'representatives'

  // --- Data State (available options for dropdowns) ---
  const [students, setStudents] = useState([]);
  const [reps, setReps] = useState([]);
  const [buses, setBuses] = useState([]);
  const [routes, setRoutes] = useState([]);

  // --- Current Assignments State ---
  const [assignments, setAssignments] = useState([]);

  // --- UI State ---
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [showBulkUpload, setShowBulkUpload] = useState(false);

  const extractArray = (res, key = 'data') => {
    if (!res) return [];
    if (Array.isArray(res)) return res;                        // Direct array
    if (Array.isArray(res[key])) return res[key];              // { data: [...] }
    if (Array.isArray(res.items)) return res.items;            // { items: [...] }
    if (Array.isArray(res.users)) return res.users;            // { users: [...] }
    if (Array.isArray(res.buses)) return res.buses;            // { buses: [...] }
    if (Array.isArray(res.routes)) return res.routes;          // { routes: [...] }
    if (Array.isArray(res.assignments)) return res.assignments;// { assignments: [...] }
    return [];                                                  // Fallback
  };

  // ─── Fetch Base Data ──────────────────────────────────────
   // --- Fetch Base Data (Buses, Routes, Users) ---
  const fetchBaseData = useCallback(async () => {
    try {
      const [busesRes, routesRes, usersRes] = await Promise.all([
        axiosClient.get('/admin/buses').catch(() => null),
        axiosClient.get('/admin/routes').catch(() => null),
        axiosClient.get('/admin/users?limit=200').catch(() => null),
      ]);

      // DIRECT EXTRACTION: We know the backend returns { success: true, data: [...] }
      // So we grab .data, and if that's missing, fall back to an empty array.
      const busesList = busesRes?.data || [];
      const routesList = routesRes?.data || [];
      const usersList = usersRes?.data || [];

      console.log("EXTRACTED BUSES:", busesList);
      console.log("EXTRACTED ROUTES:", routesList);
      console.log("EXTRACTED USERS:", usersList);

      // Set the base data
      setBuses(busesList);
      setRoutes(routesList);

      // Filter users
      setStudents(usersList.filter(u => u.role === 'student' && !u.permissions?.includes('representative')));
      setReps(usersList.filter(u => 
        u.role === 'representative' || 
        u.permissions?.includes('representative')
      ));

      setError('');
    } catch (err) {
      console.error('fetchBaseData error:', err);
      setError('Failed to load base data.');
    }
  }, []);

  // --- Fetch Current Assignments for the Active Tab ---
  // ─── Fetch Assignments ────────────────────────────────────
    // --- Fetch Current Assignments for Active Tab ---
  const fetchAssignments = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axiosClient.get(`/admin/assignments?type=${activeTab}`).catch(() => null);
      
      // DIRECT EXTRACTION
      const list = res?.data || [];
      
      console.log("EXTRACTED ASSIGNMENTS:", list);

      setAssignments(Array.isArray(list) ? list : []);
      setError('');
    } catch (err) {
      console.error('fetchAssignments error:', err);
      setError(err?.message || 'Failed to load assignments.');
      setAssignments([]);
    } finally {
      setLoading(false);
    }
  }, [activeTab]);

  // Run on mount
  useEffect(() => {
    fetchBaseData();
  }, [fetchBaseData]);

  // Re-run when the tab changes
  useEffect(() => {
    fetchAssignments();
    setShowForm(false); // Reset form when switching tabs
  }, [fetchAssignments]);

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      
      {/* ===== PAGE HEADER ===== */}
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Users className="w-6 h-6 text-emerald-400" /> Assignments
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          Assign students and representatives to their respective buses and routes.
        </p>
      </div>

      {/* ===== ALERTS ===== */}
      {error && (
        <div className="flex items-center gap-2 bg-rose-500/10 border border-rose-500/30 rounded-xl px-4 py-3 text-sm text-rose-400">
          <AlertCircle className="w-4 h-4 shrink-0" />{error}
        </div>
      )}
      {success && (
        <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/30 rounded-xl px-4 py-3 text-sm text-emerald-400">
          <CheckCircle className="w-4 h-4 shrink-0" />{success}
        </div>
      )}

      {/* ===== TABS & ADD BUTTON ===== */}
      <div className="flex items-center justify-between border-b border-[#16274a] pb-4">
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('students')}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition ${
              activeTab === 'students'
                ? 'bg-emerald-600/20 text-emerald-400'
                : 'text-slate-400 hover:text-white hover:bg-[#121f3a]'
            }`}
          >
            Students
          </button>
          <button
            onClick={() => setActiveTab('representatives')}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition ${
              activeTab === 'representatives'
                ? 'bg-emerald-600/20 text-emerald-400'
                : 'text-slate-400 hover:text-white hover:bg-[#121f3a]'
            }`}
          >
            Representatives
          </button>
        </div>

        <div className="flex flex-col items-end gap-2">
          <div className="flex items-center gap-2">
            {/* Bulk Upload Button (Only for Students tab) */}
            {activeTab === 'students' && (
              <button
                onClick={() => setShowBulkUpload(!showBulkUpload)}
                disabled={buses.length === 0 || routes.length === 0 || students.length === 0}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-xl transition"
              >
                <FileSpreadsheet className="w-4 h-4" /> Bulk Upload
              </button>
            )}

            {/* Single Add Button */}
            <button
              onClick={() => setShowForm(!showForm)}
              disabled={buses.length === 0 || routes.length === 0}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-xl transition"
            >
              <Plus className="w-4 h-4" /> New Assignment
            </button>
          </div>
          
          {(buses.length === 0 || routes.length === 0) && (
            <p className="text-[10px] text-amber-400 mt-1 max-w-[250px] text-right">
              You must create at least one Bus and one Route in the Fleet tab first.
            </p>
          )}
        </div>
      </div>

      {/* ===== BULK UPLOAD MODAL ===== */}
      {showBulkUpload && activeTab === 'students' && (
        <BulkStudentUpload
          buses={buses}
          routes={routes}
          students={students}
          onSuccess={() => {
            setSuccess('Bulk assignment process completed.');
            fetchAssignments();
            setTimeout(() => setSuccess(''), 3000);
          }}
          onCancel={() => setShowBulkUpload(false)}
        />
      )}

      {/* ===== NEW ASSIGNMENT FORM ===== */}
      {showForm && (
        <AssignmentForm
          type={activeTab}
          users={activeTab === 'students' ? students : reps}
          buses={buses}
          routes={routes}
          onSuccess={() => {
            setSuccess(`${activeTab === 'students' ? 'Student' : 'Representative'} assigned successfully.`);
            setShowForm(false);
            fetchAssignments();
          }}
          onCancel={() => setShowForm(false)}
          onError={setError}
        />
      )}

      {/* ===== CURRENT ASSIGNMENTS LIST ===== */}
      <div className="bg-[#0c162b] border border-[#16274a] rounded-2xl p-6 shadow-xl">
        <h2 className="font-bold text-white mb-4">Current {activeTab === 'students' ? 'Student' : 'Representative'} Assignments</h2>

        {loading ? (
          <div className="flex justify-center py-8">
            <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : assignments.length === 0 ? (
          <p className="text-sm text-slate-500 text-center py-6">No active assignments found.</p>
        ) : (
          <div className="space-y-3">
            {assignments.map((assignment) => (
              <div key={assignment._id} className="bg-[#0e192f] border border-[#1b2b4c] rounded-xl px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  {/* User Info */}
                  <div>
                    <h3 className="text-sm font-bold text-white">
                      {assignment.studentId?.name || assignment.representativeId?.name || 'Unknown User'}
                    </h3>
                    <p className="text-xs text-slate-400">
                      {assignment.studentId?.email || assignment.representativeId?.email}
                    </p>
                  </div>
                </div>

                {/* Bus & Route Info */}
                <div className="text-right">
                  <div className="flex items-center gap-2 justify-end">
                    <BusIcon className="w-3 h-3 text-amber-400" />
                    <span className="text-xs font-semibold text-white">{assignment.busId?.busNumber || 'N/A'}</span>
                  </div>
                  <div className="flex items-center gap-2 justify-end mt-1">
                    <MapIcon className="w-3 h-3 text-blue-400" />
                    <span className="text-xs text-slate-400">{assignment.routeId?.routeName || 'N/A'}</span>
                  </div>
                  {assignment.roleType && (
                    <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20 capitalize mt-1 inline-block">
                      {assignment.roleType}
                    </span>
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

// =====================================================================
// SUB-COMPONENT: Assignment Form
// =====================================================================
function AssignmentForm({ type, users, buses, routes, onSuccess, onCancel, onError }) {
  const [form, setForm] = useState({
    userId: '',
    busId: '',
    routeId: '',
    roleType: 'primary', // Only used for reps
  });
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    onError('');

    try {
      if (type === 'students') {
        await axiosClient.post('/admin/assignments/students', {
          studentId: form.userId,
          busId: form.busId,
          routeId: form.routeId,
        });
      } else {
        await axiosClient.post('/admin/assignments/representatives', {
          representativeId: form.userId,
          busId: form.busId,
          routeId: form.routeId,
          roleType: form.roleType,
        });
      }
      onSuccess();
    } catch (err) {
      onError(err?.message || 'Failed to create assignment.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-[#0c162b] border border-emerald-500/30 rounded-2xl p-6 shadow-xl">
      <h2 className="font-bold text-white mb-4">
        Assign {type === 'students' ? 'Student' : 'Representative'} to a Bus
      </h2>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">

        {/* User Dropdown */}
        <div>
          <label className="block text-xs text-slate-400 mb-1">
            {type === 'students' ? 'Student' : 'Representative'}
          </label>
          <select
            required
            value={form.userId}
            onChange={(e) => setForm({ ...form, userId: e.target.value })}
            className="w-full px-3 py-2 bg-[#0e192f] border border-[#1b2b4c] rounded-xl text-sm text-white focus:border-emerald-500 outline-none"
          >
            <option value="">Select a {type === 'students' ? 'student' : 'representative'}...</option>
            {users.map((u) => (
              <option key={u._id} value={u._id}>
                {u.name} ({u.email})
              </option>
            ))}
          </select>
        </div>

        {/* Bus Dropdown */}
        <div>
          <label className="block text-xs text-slate-400 mb-1">Bus</label>
          <select
            required
            value={form.busId}
            onChange={(e) => {
              // Auto-select the route associated with the bus (if any)
              const selectedBusId = e.target.value;
              const routeForBus = routes.find(r => r.busId?._id === selectedBusId || r.busId === selectedBusId);

              setForm({
                ...form,
                busId: selectedBusId,
                routeId: routeForBus ? routeForBus._id : form.routeId
              });
            }}
            className="w-full px-3 py-2 bg-[#0e192f] border border-[#1b2b4c] rounded-xl text-sm text-white focus:border-emerald-500 outline-none"
          >
            <option value="">Select a bus...</option>
            {buses.map((b) => (
              <option key={b._id} value={b._id}>
                {b.busNumber} ({b.registrationNumber})
              </option>
            ))}
          </select>
        </div>

        {/* Route Dropdown */}
        <div>
          <label className="block text-xs text-slate-400 mb-1">Route</label>
          <select
            required
            value={form.routeId}
            onChange={(e) => setForm({ ...form, routeId: e.target.value })}
            className="w-full px-3 py-2 bg-[#0e192f] border border-[#1b2b4c] rounded-xl text-sm text-white focus:border-emerald-500 outline-none"
          >
            <option value="">Select a route...</option>
            {routes.map((r) => (
              <option key={r._id} value={r._id}>
                {r.routeNumber} - {r.routeName}
              </option>
            ))}
          </select>
        </div>

        {/* Role Type Dropdown (Only for Reps) */}
        {type === 'representatives' && (
          <div>
            <label className="block text-xs text-slate-400 mb-1">Role Type</label>
            <select
              required
              value={form.roleType}
              onChange={(e) => setForm({ ...form, roleType: e.target.value })}
              className="w-full px-3 py-2 bg-[#0e192f] border border-[#1b2b4c] rounded-xl text-sm text-white focus:border-emerald-500 outline-none"
            >
              <option value="primary">Primary Representative</option>
              <option value="vice">Vice Representative</option>
            </select>
          </div>
        )}

        {/* Action Buttons */}
        <div className="sm:col-span-2 flex justify-end gap-2 mt-2">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white font-semibold text-sm rounded-xl transition"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-sm rounded-xl transition disabled:opacity-60"
          >
            {submitting ? 'Assigning...' : 'Create Assignment'}
          </button>
        </div>
      </form>
    </div>
  );
}
