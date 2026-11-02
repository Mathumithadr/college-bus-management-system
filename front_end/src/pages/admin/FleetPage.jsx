// FleetPage — Admin interface for managing buses and their routes.
//
// Workflow:
// 1. Create Buses (independent entities)
// 2. Add Routes to Buses (each route belongs to one bus)
// 3. Enter stop count → auto-generate stop rows
// 4. Fill stops in order, add/remove as needed
// 5. Edit existing routes later (PATCH /api/admin/routes/:id)
//
// Backend Endpoints:
// - GET    /api/admin/buses
// - POST   /api/admin/buses
// - GET    /api/admin/routes
// - POST   /api/admin/routes
// - PATCH  /api/admin/routes/:id

import React, { useState, useEffect, useCallback } from 'react';
import axiosClient from '../../api/axiosClient';
import {
    Bus as BusIcon,
    Plus,
    X,
    AlertCircle,
    CheckCircle,
    Navigation,
    Pencil,
    Trash2,
    Save,
    MapPin,
} from 'lucide-react';
import MapPickerModal from '../../components/common/MapPickerModal';

export default function FleetPage() {
    // --- View State ---
    const [activeTab, setActiveTab] = useState('buses');   // 'buses' | 'routes'

    // --- Data State ---
    const [buses, setBuses] = useState([]);
    const [routes, setRoutes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    // --- Form Toggle State ---
    const [showBusForm, setShowBusForm] = useState(false);
    const [routeFormMode, setRouteFormMode] = useState(null);   // null | 'create' | 'edit'
    const [editingRoute, setEditingRoute] = useState(null);     // Route object when editing

    // --- Fetch Data ---
    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            // Always fetch both — routes need buses for the dropdown
            const [busesRes, routesRes] = await Promise.all([
                axiosClient.get('/admin/buses').catch(() => ({ data: [] })),
                axiosClient.get('/admin/routes').catch(() => ({ data: [] })),
            ]);
            setBuses(busesRes.data || []);
            setRoutes(routesRes.data || []);
            setError('');
        } catch (err) {
            setError(err?.message || 'Failed to load fleet data.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
        // Reset form state when switching tabs
        setShowBusForm(false);
        setRouteFormMode(null);
        setEditingRoute(null);
    }, [fetchData]);

    // --- Open Edit Route Form ---
    const handleEditRoute = (route) => {
        setEditingRoute(route);
        setRouteFormMode('edit');
    };

    // --- Close All Forms ---
    const closeForms = () => {
        setShowBusForm(false);
        setRouteFormMode(null);
        setEditingRoute(null);
    };

    // --- Refresh After Save ---
    const handleSaved = (message) => {
        setSuccess(message);
        closeForms();
        fetchData();
        // Auto-hide success after 3 seconds
        setTimeout(() => setSuccess(''), 3000);
    };

    return (
        <div className="max-w-6xl mx-auto space-y-6">

            {/* ===== PAGE HEADER ===== */}
            <div>
                <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                    <BusIcon className="w-6 h-6 text-emerald-400" /> Fleet & Route Management
                </h1>
                <p className="text-sm text-slate-400 mt-1">
                    Create buses first, then assign routes with ordered stops to each bus.
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

            {/* ===== TABS + ADD BUTTON ===== */}
            <div className="flex items-center justify-between border-b border-[#16274a] pb-4">
                <div className="flex gap-2">
                    <button
                        onClick={() => { setActiveTab('buses'); closeForms(); }}
                        className={`px-4 py-2 rounded-xl text-sm font-semibold transition ${activeTab === 'buses'
                                ? 'bg-emerald-600/20 text-emerald-400'
                                : 'text-slate-400 hover:text-white hover:bg-[#121f3a]'
                            }`}
                    >
                        Buses ({buses.length})
                    </button>
                    <button
                        onClick={() => { setActiveTab('routes'); closeForms(); }}
                        className={`px-4 py-2 rounded-xl text-sm font-semibold transition ${activeTab === 'routes'
                                ? 'bg-emerald-600/20 text-emerald-400'
                                : 'text-slate-400 hover:text-white hover:bg-[#121f3a]'
                            }`}
                    >
                        Routes ({routes.length})
                    </button>
                </div>

                {/* Add button — changes based on tab */}
                {activeTab === 'buses' && (
                    <button
                        onClick={() => setShowBusForm(!showBusForm)}
                        className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold rounded-xl transition"
                    >
                        {showBusForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                        {showBusForm ? 'Cancel' : 'Add Bus'}
                    </button>
                )}
                {activeTab === 'routes' && !routeFormMode && (
                    <button
                        onClick={() => setRouteFormMode('create')}
                        disabled={buses.length === 0}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-xl transition"
                        title={buses.length === 0 ? 'Create a bus first' : ''}
                    >
                        <Plus className="w-4 h-4" /> Add Route
                    </button>
                )}
            </div>

            {/* Warning if no buses exist yet */}
            {activeTab === 'routes' && buses.length === 0 && (
                <div className="flex items-center gap-2 bg-amber-500/10 border border-amber-500/30 rounded-xl px-4 py-3 text-sm text-amber-400">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>No buses available. Create a bus first, then come back to add routes.</span>
                </div>
            )}

            {/* ===== CREATE BUS FORM ===== */}
            {showBusForm && (
                <CreateBusForm
                    onSuccess={() => handleSaved('Bus created successfully')}
                    onCancel={() => setShowBusForm(false)}
                    onError={setError}
                />
            )}

            {/* ===== CREATE / EDIT ROUTE FORM ===== */}
            {routeFormMode && (
                <RouteForm
                    mode={routeFormMode}
                    initialData={editingRoute}
                    buses={buses}
                    onSuccess={() =>
                        handleSaved(routeFormMode === 'edit' ? 'Route updated successfully' : 'Route created successfully')
                    }
                    onCancel={closeForms}
                    onError={setError}
                />
            )}

            {/* ===== LIST VIEW ===== */}
            <div className="bg-[#0c162b] border border-[#16274a] rounded-2xl p-6 shadow-xl">
                {loading ? (
                    <div className="flex justify-center py-12">
                        <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                    </div>
                ) : activeTab === 'buses' ? (
                    <BusesList buses={buses} />
                ) : (
                    <RoutesList routes={routes} onEdit={handleEditRoute} />
                )}
            </div>

        </div>
    );
}

// =====================================================================
// SUB-COMPONENT: Create Bus Form
// =====================================================================
function CreateBusForm({ onSuccess, onCancel, onError }) {
    const [form, setForm] = useState({
        busNumber: '',
        registrationNumber: '',
        capacity: '',
        availabilityStatus: 'available',
    });
    const [submitting, setSubmitting] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        onError('');
        try {
            await axiosClient.post('/admin/buses', {
                ...form,
                capacity: parseInt(form.capacity, 10),
            });
            onSuccess();
        } catch (err) {
            onError(err?.message || 'Failed to create bus.');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="bg-[#0c162b] border border-emerald-500/30 rounded-2xl p-6 shadow-xl">
            <h2 className="font-bold text-white mb-4">Register New Bus</h2>
            <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div>
                    <label className="block text-xs text-slate-400 mb-1">Bus Number</label>
                    <input
                        required
                        placeholder="e.g. B-12"
                        value={form.busNumber}
                        onChange={(e) => setForm({ ...form, busNumber: e.target.value })}
                        className="w-full px-3 py-2 bg-[#0e192f] border border-[#1b2b4c] rounded-xl text-sm text-white focus:border-emerald-500 outline-none"
                    />
                </div>
                <div>
                    <label className="block text-xs text-slate-400 mb-1">Registration No.</label>
                    <input
                        required
                        placeholder="e.g. TN-01-AB-1234"
                        value={form.registrationNumber}
                        onChange={(e) => setForm({ ...form, registrationNumber: e.target.value })}
                        className="w-full px-3 py-2 bg-[#0e192f] border border-[#1b2b4c] rounded-xl text-sm text-white focus:border-emerald-500 outline-none"
                    />
                </div>
                <div>
                    <label className="block text-xs text-slate-400 mb-1">Capacity</label>
                    <input
                        required
                        type="number"
                        min="1"
                        placeholder="e.g. 50"
                        value={form.capacity}
                        onChange={(e) => setForm({ ...form, capacity: e.target.value })}
                        className="w-full px-3 py-2 bg-[#0e192f] border border-[#1b2b4c] rounded-xl text-sm text-white focus:border-emerald-500 outline-none"
                    />
                </div>
                <div className="flex gap-2 items-end">
                    <button
                        type="button"
                        onClick={onCancel}
                        className="flex-1 py-2 bg-slate-700 hover:bg-slate-600 text-white font-semibold text-sm rounded-xl transition"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        disabled={submitting}
                        className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-sm rounded-xl transition disabled:opacity-60"
                    >
                        {submitting ? 'Saving...' : 'Save Bus'}
                    </button>
                </div>
            </form>
        </div>
    );
}

// =====================================================================
// SUB-COMPONENT: Create/Edit Route Form
// =====================================================================
function RouteForm({ mode, initialData, buses, onSuccess, onCancel, onError }) {
    // Initialize form from existing route (edit mode) or defaults (create mode)
    const [form, setForm] = useState({
        routeName: initialData?.routeName || '',
        routeNumber: initialData?.routeNumber || '',
        busId: initialData?.busId?._id || initialData?.busId || '',
    });

    // Stops array — in edit mode, pre-populate from existing route
    const [stops, setStops] = useState(
        initialData?.stops?.length > 0
            ? initialData.stops.map((s) => ({
                stopName: s.stopName,
                latitude: s.latitude,
                longitude: s.longitude,
                sequence: s.sequence,
            }))
            : [{ stopName: '', latitude: '', longitude: '', sequence: 1 }]
    );

    // Number of stops input — used to batch-generate rows
    const [stopCount, setStopCount] = useState(initialData?.stops?.length || 1);
    const [submitting, setSubmitting] = useState(false);

    // ─── Map Picker State ─────────────────────────────────────
    // mapPickerStopIndex: which stop row is currently picking a map location
    // null = no picker open, number = that row's index
    const [mapPickerStopIndex, setMapPickerStopIndex] = useState(null);

    // --- Batch-generate stops based on count ---
    // When the admin types a number and clicks "Generate", create that many empty rows.
    const generateStops = () => {
        const count = parseInt(stopCount, 10);
        if (!count || count < 1 || count > 50) {
            onError('Stop count must be between 1 and 50');
            return;
        }

        // Preserve existing stops where possible, add new empty ones if needed
        const newStops = [];
        for (let i = 0; i < count; i++) {
            newStops.push(
                stops[i] || { stopName: '', latitude: '', longitude: '', sequence: i + 1 }
            );
            newStops[i].sequence = i + 1;   // Force re-sequence
        }
        setStops(newStops);
    };

    // --- Add a single stop row ---
    const addStop = () => {
        setStops([
            ...stops,
            { stopName: '', latitude: '', longitude: '', sequence: stops.length + 1 },
        ]);
        setStopCount(stops.length + 1);
    };

    // --- Remove a stop and re-sequence ---
    const removeStop = (index) => {
        const newStops = stops
            .filter((_, i) => i !== index)
            .map((s, i) => ({ ...s, sequence: i + 1 }));
        setStops(newStops);
        setStopCount(newStops.length);
    };

    // --- Update a stop field ---
    const updateStop = (index, field, value) => {
        const newStops = [...stops];
        newStops[index][field] = value;
        setStops(newStops);
    };

    // ─── Handle Map Selection ─────────────────────────────────
    // When the admin confirms a location, update the corresponding stop
    const handleMapSelect = (lat, lng) => {
        if (mapPickerStopIndex === null) return;
        const newStops = [...stops];
        newStops[mapPickerStopIndex].latitude = lat;
        newStops[mapPickerStopIndex].longitude = lng;
        setStops(newStops);
    };

    // --- Submit ---
    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        onError('');

        // Build payload — ensure numeric types
        const payload = {
            routeName: form.routeName,
            routeNumber: form.routeNumber,
            busId: form.busId,
            stops: stops.map((s) => ({
                stopName: s.stopName,
                latitude: parseFloat(s.latitude),
                longitude: parseFloat(s.longitude),
                sequence: s.sequence,
            })),
        };

        try {
            if (mode === 'edit') {
                // PATCH /api/admin/routes/:id
                await axiosClient.patch(`/admin/routes/${initialData._id}`, payload);
            } else {
                // POST /api/admin/routes
                await axiosClient.post('/admin/routes', payload);
            }
            onSuccess();
        } catch (err) {
            onError(err?.message || `Failed to ${mode === 'edit' ? 'update' : 'create'} route.`);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="bg-[#0c162b] border border-blue-500/30 rounded-2xl p-6 shadow-xl">
            <h2 className="font-bold text-white mb-4">
                {mode === 'edit' ? 'Edit Route' : 'Create New Route'}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-6">
                {/* --- Basic Route Info --- */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                        <label className="block text-xs text-slate-400 mb-1">Route Number</label>
                        <input
                            required
                            placeholder="e.g. R-08"
                            value={form.routeNumber}
                            onChange={(e) => setForm({ ...form, routeNumber: e.target.value })}
                            className="w-full px-3 py-2 bg-[#0e192f] border border-[#1b2b4c] rounded-xl text-sm text-white focus:border-blue-500 outline-none"
                        />
                    </div>
                    <div>
                        <label className="block text-xs text-slate-400 mb-1">Route Name</label>
                        <input
                            required
                            placeholder="e.g. Airport Bypass"
                            value={form.routeName}
                            onChange={(e) => setForm({ ...form, routeName: e.target.value })}
                            className="w-full px-3 py-2 bg-[#0e192f] border border-[#1b2b4c] rounded-xl text-sm text-white focus:border-blue-500 outline-none"
                        />
                    </div>
                    <div>
                        <label className="block text-xs text-slate-400 mb-1">Assigned Bus</label>
                        <select
                            required
                            value={form.busId}
                            onChange={(e) => setForm({ ...form, busId: e.target.value })}
                            className="w-full px-3 py-2 bg-[#0e192f] border border-[#1b2b4c] rounded-xl text-sm text-white focus:border-blue-500 outline-none"
                        >
                            <option value="">Select a bus...</option>
                            {buses.map((b) => (
                                <option key={b._id} value={b._id}>
                                    {b.busNumber} ({b.registrationNumber})
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* ==== Stops Section ==== */}
                <div className="bg-[#0e192f] border border-[#1b2b4c] rounded-xl p-4">
                    <div className="flex items-center justify-between mb-3">
                        <label className="text-sm font-semibold text-white">Route Stops</label>
                        <span className="text-xs text-slate-500">{stops.length} stop(s) configured</span>
                    </div>

                    {/* Generate controls */}
                    <div className="flex items-center gap-2 mb-4">
                        <label className="text-xs text-slate-400">Generate:</label>
                        <input
                            type="number"
                            min="1"
                            max="50"
                            value={stopCount}
                            onChange={(e) => setStopCount(e.target.value)}
                            className="w-20 px-3 py-1.5 bg-[#0c162b] border border-[#1b2b4c] rounded-lg text-sm text-white focus:border-blue-500 outline-none"
                        />
                        <span className="text-xs text-slate-400">stops</span>
                        <button
                            type="button"
                            onClick={generateStops}
                            className="px-3 py-1.5 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 text-xs font-medium rounded-lg transition"
                        >
                            Apply Count
                        </button>
                        <span className="text-xs text-slate-600 ml-2">or</span>
                        <button
                            type="button"
                            onClick={addStop}
                            className="px-3 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 text-xs font-medium rounded-lg transition flex items-center gap-1"
                        >
                            <Plus className="w-3 h-3" /> Add One
                        </button>
                    </div>

                    {/* Individual stop rows — with map picker */}
                    <div className="space-y-2">
                        {stops.map((stop, index) => (
                            <div
                                key={index}
                                className="bg-[#0c162b] p-3 rounded-xl border border-[#1b2b4c] space-y-2"
                            >
                                {/* Row 1: Sequence + Stop Name */}
                                <div className="flex items-center gap-2">
                                    <span className="w-6 h-6 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center text-xs font-bold shrink-0">
                                        {stop.sequence}
                                    </span>
                                    <input
                                        required
                                        placeholder="Stop Name (e.g. Central Gate)"
                                        value={stop.stopName}
                                        onChange={(e) => updateStop(index, 'stopName', e.target.value)}
                                        className="flex-1 px-3 py-2 bg-[#0e192f] border border-[#1b2b4c] rounded-lg text-sm text-white focus:border-blue-500 outline-none"
                                    />
                                    {stops.length > 1 && (
                                        <button
                                            type="button"
                                            onClick={() => removeStop(index)}
                                            className="p-1.5 text-rose-400 hover:bg-rose-500/20 rounded-lg transition"
                                            title="Remove stop"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    )}
                                </div>

                                {/* Row 2: Coordinates + Pick from Map button */}
                                <div className="flex flex-wrap items-center gap-2 pl-8">
                                    <input
                                        required
                                        type="number"
                                        step="any"
                                        placeholder="Latitude"
                                        value={stop.latitude}
                                        onChange={(e) => updateStop(index, 'latitude', e.target.value)}
                                        className="w-28 px-3 py-1.5 bg-[#0e192f] border border-[#1b2b4c] rounded-lg text-sm text-white focus:border-blue-500 outline-none font-mono"
                                    />
                                    <input
                                        required
                                        type="number"
                                        step="any"
                                        placeholder="Longitude"
                                        value={stop.longitude}
                                        onChange={(e) => updateStop(index, 'longitude', e.target.value)}
                                        className="w-28 px-3 py-1.5 bg-[#0e192f] border border-[#1b2b4c] rounded-lg text-sm text-white focus:border-blue-500 outline-none font-mono"
                                    />

                                    {/* Pick from Map button */}
                                    <button
                                        type="button"
                                        onClick={() => setMapPickerStopIndex(index)}
                                        className="flex items-center gap-1 px-3 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 text-xs font-medium rounded-lg transition"
                                        title="Pick location on map"
                                    >
                                        <MapPin className="w-3 h-3" /> Pick from Map
                                    </button>

                                    {/* Show a small "set" indicator if coords exist */}
                                    {stop.latitude && stop.longitude && (
                                        <span className="text-[10px] text-emerald-400 font-medium">
                                            ✓ Location set
                                        </span>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* --- Action Buttons --- */}
                <div className="flex gap-2 justify-end">
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
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm rounded-xl transition disabled:opacity-60"
                    >
                        <Save className="w-4 h-4" />
                        {submitting
                            ? 'Saving...'
                            : mode === 'edit'
                                ? 'Update Route'
                                : 'Create Route'}
                    </button>
                </div>
            </form>

            {/* Map Picker Modal — only renders when a stop is selected */}
            {mapPickerStopIndex !== null && (
                <MapPickerModal
                    initialLat={stops[mapPickerStopIndex]?.latitude || 13.0827}
                    initialLng={stops[mapPickerStopIndex]?.longitude || 80.2707}
                    onSelect={handleMapSelect}
                    onClose={() => setMapPickerStopIndex(null)}
                />
            )}
        </div>
    );
}

// =====================================================================
// SUB-COMPONENT: Buses List
// =====================================================================
function BusesList({ buses }) {
    if (buses.length === 0) {
        return <p className="text-sm text-slate-500 text-center py-6">No buses found. Create one above.</p>;
    }

    return (
        <div className="space-y-3">
            {buses.map((bus) => (
                <div
                    key={bus._id}
                    className="bg-[#0e192f] border border-[#1b2b4c] rounded-xl px-4 py-3 flex items-center justify-between"
                >
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-amber-400">
                            <BusIcon className="w-5 h-5" />
                        </div>
                        <div>
                            <h3 className="text-sm font-bold text-white">{bus.busNumber}</h3>
                            <p className="text-xs text-slate-400 mt-0.5">
                                Reg: {bus.registrationNumber} · Capacity: {bus.capacity}
                            </p>
                        </div>
                    </div>
                    <span
                        className={`px-2.5 py-1 rounded-full text-[11px] font-semibold border capitalize ${bus.availabilityStatus === 'available'
                                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                                : bus.availabilityStatus === 'maintenance'
                                    ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                                    : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                            }`}
                    >
                        {bus.availabilityStatus}
                    </span>
                </div>
            ))}
        </div>
    );
}

// =====================================================================
// SUB-COMPONENT: Routes List (with edit button)
// =====================================================================
function RoutesList({ routes, onEdit }) {
    if (routes.length === 0) {
        return <p className="text-sm text-slate-500 text-center py-6">No routes found. Create one above.</p>;
    }

    return (
        <div className="space-y-3">
            {routes.map((route) => (
                <div key={route._id} className="bg-[#0e192f] border border-[#1b2b4c] rounded-xl px-4 py-4">
                    <div className="flex items-start justify-between">
                        <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                                <span className="text-[10px] font-mono bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded">
                                    {route.routeNumber}
                                </span>
                                <h3 className="text-sm font-bold text-white">{route.routeName}</h3>
                            </div>
                            <p className="text-xs text-slate-400 mt-1">
                                Bus: {route.busId?.busNumber || 'Unassigned'} · Stops: {route.stops?.length || 0}
                            </p>
                        </div>

                        {/* Edit button */}
                        <button
                            onClick={() => onEdit(route)}
                            className="flex items-center gap-1 px-3 py-1.5 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 text-xs font-medium rounded-lg transition"
                        >
                            <Pencil className="w-3 h-3" /> Edit Stops
                        </button>
                    </div>

                    {/* Timeline preview */}
                    <div className="flex items-center gap-2 mt-4 text-[11px] text-slate-500 overflow-x-auto pb-2">
                        {route.stops
                            ?.sort((a, b) => a.sequence - b.sequence)
                            .map((stop, i) => (
                                <div key={i} className="flex items-center gap-2">
                                    <div className="flex items-center gap-1 bg-[#121f3a] px-2 py-1 rounded-md whitespace-nowrap border border-slate-700">
                                        <Navigation className="w-3 h-3 text-emerald-400" />
                                        {stop.stopName}
                                    </div>
                                    {i < route.stops.length - 1 && <span>→</span>}
                                </div>
                            ))}
                    </div>
                </div>
            ))}
        </div>
    );
}
