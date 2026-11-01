// AdminPage — fleet management, route editor, representative assignments, and audit log for admin users
import React, { useState, useEffect } from 'react';
import { Shield, AlertCircle, Bus, MapPin, Users } from 'lucide-react';
import axiosClient from '../api/axiosClient.js';

// Tab names — each tab corresponds to a major admin API group
const TABS = ['Fleet', 'Routes', 'Assignments', 'Reports', 'Audit Log'];

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState('Fleet');

  // buses list from GET /api/admin/buses
  const [buses, setBuses]   = useState([]);
  // routes list from GET /api/admin/routes
  const [routes, setRoutes] = useState([]);
  // audit logs from GET /api/admin/audit-logs
  const [audits, setAudits] = useState([]);
  // reports list from GET /api/admin/reports
  const [adminReports, setAdminReports] = useState([]);

  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');

  // Fetch data when the active tab changes — avoids loading all data at once
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError('');
      try {
        if (activeTab === 'Fleet')     { const r = await axiosClient.get('/admin/buses');      setBuses(r.data?.buses || r.data || []); }
        if (activeTab === 'Routes')    { const r = await axiosClient.get('/admin/routes');     setRoutes(r.data?.routes || r.data || []); }
        if (activeTab === 'Audit Log') { const r = await axiosClient.get('/admin/audit-logs'); setAudits(r.data?.logs || r.data || []); }
        if (activeTab === 'Reports')   { const r = await axiosClient.get('/admin/reports');   setAdminReports(r.data?.reports || r.data || []); }
      } catch (err) {
        setError(`Failed to load ${activeTab} data.`);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [activeTab]);

  return (
    <div className="space-y-5">
      {/* Page header */}
      <div className="flex items-center gap-3">
        <Shield className="w-6 h-6 text-emerald-400" />
        <h1 className="text-xl font-extrabold text-white">Admin Control Panel</h1>
      </div>

      {/* Error alert */}
      {error && (
        <div className="flex items-center gap-2 bg-rose-500/10 border border-rose-500/30 rounded-xl px-4 py-3 text-sm text-rose-400">
          <AlertCircle className="w-4 h-4 shrink-0" />{error}
        </div>
      )}

      {/* Tab navigation — each button loads a different admin data section */}
      <div className="flex gap-2 flex-wrap">
        {TABS.map((tab) => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition ${
              activeTab === tab
                ? 'bg-emerald-600/90 text-white shadow-lg shadow-emerald-600/25'
                : 'bg-[#0c162b] border border-[#16274a] text-slate-400 hover:text-white hover:border-emerald-500/40'
            }`}>
            {tab}
          </button>
        ))}
      </div>

      {/* Tab content card */}
      <div className="rounded-2xl bg-[#0c162b] border border-[#16274a] p-5 shadow-xl">
        {loading ? (
          <div className="flex justify-center py-10"><div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" /></div>
        ) : (
          <>
            {/* FLEET TAB — lists all buses with status and capacity */}
            {activeTab === 'Fleet' && (
              <div className="space-y-3">
                <h2 className="font-bold text-white text-base">All Buses</h2>
                {buses.length === 0 ? <p className="text-sm text-slate-500">No buses found.</p> : buses.map((bus) => (
                  <div key={bus._id} className="flex items-center justify-between bg-[#0e192f] border border-[#1b2b4c] rounded-xl px-4 py-3">
                    <div className="flex items-center gap-3">
                      <Bus className="w-5 h-5 text-amber-400" />
                      <div>
                        <div className="text-sm font-bold text-white">{bus.busNumber}</div>
                        <div className="text-xs text-slate-400">Capacity: {bus.capacity} · Reg: {bus.registrationNumber}</div>
                      </div>
                    </div>
                    {/* Availability status badge */}
                    <span className={`px-2.5 py-1 rounded-full text-[11px] font-semibold border capitalize ${
                      bus.availabilityStatus === 'available' ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' : 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                    }`}>
                      {bus.availabilityStatus}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* ROUTES TAB — lists all transit routes and their stops */}
            {activeTab === 'Routes' && (
              <div className="space-y-3">
                <h2 className="font-bold text-white text-base">All Routes</h2>
                {routes.length === 0 ? <p className="text-sm text-slate-500">No routes found.</p> : routes.map((route) => (
                  <div key={route._id} className="bg-[#0e192f] border border-[#1b2b4c] rounded-xl px-4 py-3">
                    <div className="flex items-center gap-2 mb-1">
                      <MapPin className="w-4 h-4 text-emerald-400" />
                      <div className="text-sm font-bold text-white">{route.routeName}</div>
                      <span className="text-xs text-slate-400">({route.routeNumber})</span>
                    </div>
                    {/* Stop count summary */}
                    <div className="text-xs text-slate-400">{route.stops?.length || 0} stops</div>
                  </div>
                ))}
              </div>
            )}

            {/* ASSIGNMENTS TAB — placeholder for representative and student assignment forms */}
            {activeTab === 'Assignments' && (
              <div className="space-y-3">
                <h2 className="font-bold text-white text-base">Assignments</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Assign student to bus — calls POST /api/admin/students/assign */}
                  <div className="bg-[#0e192f] border border-[#1b2b4c] rounded-xl px-4 py-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Users className="w-4 h-4 text-blue-400" />
                      <div className="text-sm font-bold text-white">Assign Student to Bus</div>
                    </div>
                    <p className="text-xs text-slate-400">Use POST /api/admin/students/assign to assign a student's StudentBusAssignment record.</p>
                  </div>
                  {/* Assign representative — calls POST /api/admin/representatives/assign */}
                  <div className="bg-[#0e192f] border border-[#1b2b4c] rounded-xl px-4 py-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Shield className="w-4 h-4 text-emerald-400" />
                      <div className="text-sm font-bold text-white">Assign Representative</div>
                    </div>
                    <p className="text-xs text-slate-400">Use POST /api/admin/representatives/assign to set primary or vice rep with partial unique index enforcement.</p>
                  </div>
                </div>
              </div>
            )}

            {/* REPORTS TAB — admin view of all grievance tickets */}
            {activeTab === 'Reports' && (
              <div className="space-y-3">
                <h2 className="font-bold text-white text-base">All Grievance Reports</h2>
                {adminReports.length === 0 ? <p className="text-sm text-slate-500">No reports found.</p> : adminReports.map((rep) => (
                  <div key={rep._id} className="flex items-center justify-between bg-[#0e192f] border border-[#1b2b4c] rounded-xl px-4 py-3">
                    <div>
                      <div className="text-sm font-bold text-white">{rep.ticketNumber}</div>
                      <div className="text-xs text-slate-400 capitalize">{rep.category?.replace(/_/g,' ')} · {rep.severity}</div>
                    </div>
                    <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold border bg-amber-500/15 text-amber-400 border-amber-500/30 capitalize">{rep.status}</span>
                  </div>
                ))}
              </div>
            )}

            {/* AUDIT LOG TAB — immutable security events from AuditLog collection */}
            {activeTab === 'Audit Log' && (
              <div className="space-y-3">
                <h2 className="font-bold text-white text-base">Security Audit Log</h2>
                {audits.length === 0 ? <p className="text-sm text-slate-500">No audit events found.</p> : audits.map((log) => (
                  <div key={log._id} className="bg-[#0e192f] border border-[#1b2b4c] rounded-xl px-4 py-3">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        {/* Action type and correlation ID for tracing across logs */}
                        <div className="text-sm font-bold text-white">{log.action}</div>
                        <div className="text-xs text-slate-400 mt-0.5">
                          By: {log.actorId?.slice(-8)} · IP: {log.ipAddress}
                        </div>
                        <div className="text-[10px] text-slate-500 mt-0.5 font-mono">CID: {log.correlationId}</div>
                      </div>
                      <div className="text-[10px] text-slate-500 shrink-0">
                        {new Date(log.createdAt).toLocaleString()}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
