import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Shield, AlertCircle, Bus, MapPin, Users, Calendar, FileText, CheckCircle, Upload } from 'lucide-react';
import axiosClient from '../api/axiosClient';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';

// Fix Leaflet default marker icon missing issue
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const TABS = ['Stops', 'Routes', 'Fleet', 'Assignments', 'Representatives', 'Staff', 'Schedule', 'CSV Import'];

// Helper component to handle map clicks
function LocationMarker({ position, setPosition }) {
  const map = useMapEvents({
    click(e) {
      setPosition(e.latlng);
      map.flyTo(e.latlng, map.getZoom());
    },
  });
  return position === null ? null : <Marker position={position}></Marker>;
}

// Helper component to fly to new coordinates when typed manually
function MapFlyer({ position }) {
  const map = useMap();
  useEffect(() => {
    if (position.lat && position.lng) {
      map.flyTo([position.lat, position.lng], map.getZoom());
    }
  }, [position, map]);
  return null;
}

export default function AdminPage({ defaultTab }) {
  const [searchParams] = useSearchParams();
  const initialTab = defaultTab || searchParams.get('tab') || 'Stops';
  const [activeTab, setActiveTab] = useState(initialTab);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Global Data State
  const [stops, setStops] = useState([]);
  const [routes, setRoutes] = useState([]);
  const [buses, setBuses] = useState([]);
  const [users, setUsers] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [representativeAssignments, setRepresentativeAssignments] = useState([]);

  // Telemetry Heartbeat / Critical Trips State (Tier 3 Watchdog)
  const [criticalTrips, setCriticalTrips] = useState([]);

  useEffect(() => {
    const fetchCritical = async () => {
      try {
        const res = await axiosClient.get('/admin/critical-trips');
        setCriticalTrips(res.data?.trips || res.trips || []);
      } catch (err) {
        console.error('Failed to fetch critical trips', err);
      }
    };
    fetchCritical();
    const interval = setInterval(fetchCritical, 30000);
    return () => clearInterval(interval);
  }, []);

  // ==================== STOPS STATE ====================
  const [stopSearch, setStopSearch] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [newStopName, setNewStopName] = useState('');
  const [mapPosition, setMapPosition] = useState({ lat: 11.0168, lng: 76.9558 });

  // ==================== ROUTES STATE ====================
  const [newRouteName, setNewRouteName] = useState('');
  const [newRouteNumber, setNewRouteNumber] = useState('');
  const [selectedBusId, setSelectedBusId] = useState('');
  const [selectedStops, setSelectedStops] = useState([]);

  // ==================== FLEET STATE ====================
  const [newBusNumber, setNewBusNumber] = useState('');
  const [newRegNumber, setNewRegNumber] = useState('');
  const [newCapacity, setNewCapacity] = useState(50);

  // ==================== ASSIGNMENT STATE ====================
  const [assignStudentId, setAssignStudentId] = useState('');
  const [assignBusId, setAssignBusId] = useState('');
  const [assignRouteId, setAssignRouteId] = useState('');
  const [assignStopId, setAssignStopId] = useState('');
  const [forceOverbook, setForceOverbook] = useState(false);

  const [repStudentId, setRepStudentId] = useState('');
  const [repBusId, setRepBusId] = useState('');
  const [repRouteId, setRepRouteId] = useState('');
  const [repRoleType, setRepRoleType] = useState('primary');

  // ==================== SCHEDULE STATE ====================
  const [scheduleDate, setScheduleDate] = useState('');
  const [scheduleDayType, setScheduleDayType] = useState('WEEKDAY');
  const [scheduleRouteId, setScheduleRouteId] = useState('');
  const [scheduleBusId, setScheduleBusId] = useState('');

  // ==================== STAFF STATE ====================
  const [staffList, setStaffList] = useState([]);
  const [newStaffName, setNewStaffName] = useState('');
  const [newStaffEmail, setNewStaffEmail] = useState('');
  const [newStaffPassword, setNewStaffPassword] = useState('');
  const [newStaffDepartment, setNewStaffDepartment] = useState('CSE');
  const [newStaffPhone, setNewStaffPhone] = useState('');
  const [staffLoading, setStaffLoading] = useState(false);

  // ==================== CSV STATE ====================
  const [csvFile, setCsvFile] = useState(null);

  // Fetch initial data
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError('');

      // 1. Fetch Stops
      try {
        const stopsRes = await axiosClient.get('/admin/stops');
        setStops(stopsRes.data?.stops || stopsRes.stops || []);
      } catch (err) { console.error('Failed to fetch stops', err); }

      // 2. Fetch Buses
      try {
        const busesRes = await axiosClient.get('/admin/buses');
        setBuses(busesRes.data?.buses || busesRes.buses || busesRes.data || []);
      } catch (err) { console.error('Failed to fetch buses', err); }

      // 3. Fetch Users
      try {
        const usersRes = await axiosClient.get('/admin/users?role=student&limit=100');
        setUsers(usersRes.data?.users || usersRes.users || usersRes.data || []);
      } catch (err) { console.error('Failed to fetch users', err); }

      // 4. Fetch Routes
      try {
        const routesRes = await axiosClient.get('/admin/routes');
        setRoutes(routesRes.data?.routes || routesRes.routes || routesRes.data || []);
      } catch (err) { console.error('Failed to fetch routes', err); }

      // 5. Fetch Assignments
      if (activeTab === 'Assignments' || activeTab === 'Fleet') {
        try {
          const assignRes = await axiosClient.get('/admin/assignments?type=students');
          setAssignments(assignRes.data?.assignments || assignRes.assignments || []);
        } catch (err) { console.error('Failed to fetch assignments', err); }
      }

      // 6. Fetch Representatives
      if (activeTab === 'Representatives' || activeTab === 'Assignments') {
        try {
          const repRes = await axiosClient.get('/admin/assignments?type=representatives');
          setRepresentativeAssignments(repRes.data?.assignments || repRes.assignments || []);
        } catch (err) { console.error('Failed to fetch representatives', err); }
      }

      // 7. Fetch Staff
      if (activeTab === 'Staff') {
        try {
          const staffRes = await axiosClient.get('/admin/staff');
          setStaffList(staffRes.data || []);
        } catch (err) { console.error('Failed to fetch staff', err); }
      }

      setLoading(false);
    };
    fetchData();
  }, [activeTab]);

  // ==================== STOPS LOGIC ====================
  const handleSearchLocation = async () => {
    if (!stopSearch.trim()) return;
    setSearching(true);
    setError('');

    const cleanSearchTerm = stopSearch.split('(')[0].split('/')[0].trim();

    try {
      const query = encodeURIComponent(`${cleanSearchTerm}, Coimbatore`);
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${query}&limit=5`
      );
      const data = await response.json();

      if (data.length === 0) {
        setError(`No map locations found for "${cleanSearchTerm}". Try typing a nearby landmark.`);
      } else {
        setSearchResults(data);
        if (!newStopName) {
          setNewStopName(stopSearch);
        }
      }
    } catch (err) {
      setError('Failed to search location. Check internet connection.');
    } finally {
      setSearching(false);
    }
  };

  const selectSearchResult = (result) => {
    setMapPosition({
      lat: parseFloat(result.lat),
      lng: parseFloat(result.lon)
    });
    if (!newStopName) {
      setNewStopName(stopSearch);
    }
    setSearchResults([]);
  };

  const handleCoordinateChange = (field, value) => {
    const numValue = parseFloat(value);
    if (!isNaN(numValue)) {
      setMapPosition(prev => ({ ...prev, [field]: numValue }));
    }
  };

  const handleSaveStop = async (e) => {
    e.preventDefault();
    setError(''); setSuccessMsg('');
    try {
      await axiosClient.post('/admin/stops', {
        name: newStopName,
        latitude: mapPosition.lat,
        longitude: mapPosition.lng,
      });
      setSuccessMsg('Stop saved successfully!');
      setNewStopName(''); setStopSearch('');
      const res = await axiosClient.get('/admin/stops');
      setStops(res.data?.stops || []);
    } catch (err) {
      setError(err.message || 'Failed to save stop.');
    }
  };

  // ==================== ROUTES LOGIC ====================
  const handleAddStopToRoute = (stopId) => {
    if (!selectedStops.includes(stopId)) {
      setSelectedStops([...selectedStops, stopId]);
    }
  };

  const handleRemoveStopFromRoute = (stopId) => {
    setSelectedStops(selectedStops.filter(id => id !== stopId));
  };

  const moveStopOrder = (index, direction) => {
    const newStops = [...selectedStops];
    const temp = newStops[index];
    newStops[index] = newStops[index + direction];
    newStops[index + direction] = temp;
    setSelectedStops(newStops);
  };

  const handleSaveRoute = async (e) => {
    e.preventDefault();
    setError(''); setSuccessMsg('');
    if (selectedStops.length < 2) return setError('A route needs at least 2 stops.');

    try {
      await axiosClient.post('/admin/routes', {
        routeName: newRouteName,
        routeNumber: newRouteNumber,
        busId: selectedBusId,
        stops: selectedStops,
      });
      setSuccessMsg('Route created successfully!');
      setNewRouteName(''); setNewRouteNumber(''); setSelectedStops([]);
      const res = await axiosClient.get('/admin/routes');
      setRoutes(res.data?.routes || []);
    } catch (err) {
      setError(err.message || 'Failed to save route.');
    }
  };

  // ==================== FLEET LOGIC ====================
  const handleSaveBus = async (e) => {
    e.preventDefault();
    setError(''); setSuccessMsg('');
    try {
      await axiosClient.post('/admin/buses', {
        busNumber: newBusNumber,
        registrationNumber: newRegNumber,
        capacity: parseInt(newCapacity),
      });
      setSuccessMsg('Bus registered successfully!');
      setNewBusNumber(''); setNewRegNumber(''); setNewCapacity(50);
      const res = await axiosClient.get('/admin/buses');
      setBuses(res.data?.buses || []);
    } catch (err) {
      setError(err.message || 'Failed to save bus.');
    }
  };

  // ==================== ASSIGNMENT LOGIC ====================
  const handleAssignStudent = async (e) => {
    e.preventDefault();
    setError(''); setSuccessMsg('');
    try {
      await axiosClient.post('/admin/assignments/students', {
        studentId: assignStudentId,
        busId: assignBusId,
        routeId: assignRouteId,
        boardingStopId: assignStopId,
        forceOverbook: forceOverbook
      });
      setSuccessMsg('Student assigned successfully!');
      setAssignStudentId(''); setForceOverbook(false);
      const res = await axiosClient.get('/admin/assignments?type=students');
      setAssignments(res.data?.assignments || []);
    } catch (err) {
      setError(err.message || 'Failed to assign student.');
    }
  };

  const handleAssignRep = async (e) => {
    e.preventDefault();
    setError(''); setSuccessMsg('');
    try {
      await axiosClient.post('/admin/assignments/representatives', {
        representativeId: repStudentId,
        busId: repBusId,
        routeId: repRouteId,
        roleType: repRoleType,
      });
      setSuccessMsg('Representative assigned successfully!');
      setRepStudentId(''); setRepRoleType('primary');
      const repRes = await axiosClient.get('/admin/assignments?type=representatives');
      setRepresentativeAssignments(repRes.data?.assignments || repRes.assignments || []);
    } catch (err) {
      setError(err.message || 'Failed to assign representative.');
    }
  };

  // ==================== SCHEDULE LOGIC ====================
  const handleActivateSchedule = async (e) => {
    e.preventDefault();
    setError(''); setSuccessMsg('');
    try {
      await axiosClient.post('/admin/schedules/activate', {
        date: scheduleDate,
        dayType: scheduleDayType,
        routeId: scheduleRouteId,
        busId: scheduleBusId,
      });
      setSuccessMsg('Schedule activated successfully!');
    } catch (err) {
      setError(err.message || 'Failed to activate schedule.');
    }
  };

  // ==================== CSV LOGIC ====================
  const handleCsvUpload = async (e) => {
    e.preventDefault();
    setError(''); setSuccessMsg('');
    if (!csvFile) return setError('Please select a file.');

    const formData = new FormData();
    formData.append('file', csvFile);

    try {
      const res = await axiosClient.post('/admin/students/import', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setSuccessMsg(res.data?.message || 'CSV Imported successfully!');
      setCsvFile(null);
      const usersRes = await axiosClient.get('/admin/users?role=student&limit=100');
      setUsers(usersRes.data?.users || []);
    } catch (err) {
      setError(err.message || 'Failed to import CSV.');
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-10">
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Shield className="w-6 h-6 text-emerald-400" /> Admin Control Panel
        </h1>
        <p className="text-sm text-slate-400 mt-1">Manage stops, routes, buses, staff, and schedules.</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 flex-wrap border-b border-[#16274a] pb-4">
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => { setActiveTab(tab); setError(''); setSuccessMsg(''); }}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition ${
              activeTab === tab
                ? 'bg-emerald-600/90 text-white shadow-lg shadow-emerald-600/25'
                : 'bg-[#0c162b] border border-[#16274a] text-slate-400 hover:text-white hover:border-emerald-500/40'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* 🚨 CRITICAL TELEMETRY ALERT BANNER (Tier 3 Redundancy) */}
      {criticalTrips.length > 0 && (
        <div className="bg-rose-500/10 border-2 border-rose-500/60 rounded-2xl p-4 shadow-xl shadow-rose-950/40">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-2xl animate-pulse">🚨</span>
            <h3 className="text-base font-bold text-rose-400">CRITICAL TELEMETRY ALERT</h3>
            <span className="ml-auto text-xs font-bold bg-rose-600 text-white px-2.5 py-0.5 rounded-full shadow">
              {criticalTrips.length} {criticalTrips.length === 1 ? 'Trip Offline' : 'Trips Offline'}
            </span>
          </div>
          <div className="space-y-2.5">
            {criticalTrips.map((trip) => (
              <div key={trip._id} className="bg-[#0a1222] border border-rose-500/30 rounded-xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-bold text-white flex items-center gap-2">
                    <span className="text-emerald-400">{trip.busId?.busNumber}</span>
                    <span className="text-slate-500">•</span>
                    <span>{trip.routeId?.routeName}</span>
                  </p>
                  <p className="text-xs text-rose-300 mt-0.5 font-semibold">
                    {trip.telemetryStatus === 'TRACKING_OFFLINE' ? '🚨 COMPLETELY OFFLINE' : '⚠️ GPS DISCONNECTED'}
                    {trip.minutesSilent != null ? ` — ${trip.minutesSilent} min silent` : ''}
                  </p>
                  {trip.lastKnownLocation && (
                    <p className="text-[11px] text-slate-400 mt-0.5 font-mono">
                      Last Known: {trip.lastKnownLocation.lat?.toFixed(4)}, {trip.lastKnownLocation.lng?.toFixed(4)}
                    </p>
                  )}
                </div>
                {trip.activeRepresentativeId?.phone && (
                  <a
                    href={`tel:${trip.activeRepresentativeId.phone}`}
                    className="px-3.5 py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 self-start sm:self-auto transition shadow"
                  >
                    📞 Call Rep ({trip.activeRepresentativeId.phone})
                  </a>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Alerts */}
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

      {loading && <div className="text-slate-400 py-10 text-center">Loading...</div>}

      {/* ==================== STOPS TAB ==================== */}
      {!loading && activeTab === 'Stops' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-[#0c162b] border border-[#16274a] rounded-2xl p-6 shadow-xl space-y-4">
            <h2 className="text-lg font-bold text-white mb-2">Add New Stop</h2>
            <form onSubmit={handleSaveStop} className="space-y-4">
              <div className="relative">
                <label className="block text-xs text-slate-400 mb-1">Search Location (e.g. Gandhipuram, Coimbatore)</label>
                <div className="flex gap-2">
                  <input type="text" value={stopSearch} onChange={(e) => setStopSearch(e.target.value)} placeholder="Search place..." className="flex-1 bg-[#0e192f] border border-[#1b2b4c] rounded-xl px-4 py-2 text-white text-sm" />
                  <button type="button" onClick={handleSearchLocation} disabled={searching} className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl text-sm disabled:opacity-50">
                    {searching ? 'Searching...' : 'Search'}
                  </button>
                </div>
                {searchResults.length > 0 && (
                  <ul className="absolute z-50 w-full mt-1 bg-[#0e192f] border border-[#1b2b4c] rounded-xl shadow-2xl max-h-48 overflow-y-auto">
                    {searchResults.map((res, i) => (
                      <li key={i} onClick={() => selectSearchResult(res)} className="px-4 py-2 text-sm text-slate-300 hover:bg-[#16274a] cursor-pointer border-b border-[#1b2b4c] last:border-0">
                        {res.display_name}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Stop Name</label>
                <input type="text" required value={newStopName} onChange={(e) => setNewStopName(e.target.value)} className="w-full bg-[#0e192f] border border-[#1b2b4c] rounded-xl px-4 py-2 text-white text-sm" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Latitude (Editable)</label>
                  <input
                    type="text"
                    value={mapPosition.lat}
                    onChange={(e) => handleCoordinateChange('lat', e.target.value)}
                    className="w-full bg-[#0e192f] border border-[#1b2b4c] rounded-xl px-4 py-2 text-white text-sm focus:border-emerald-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Longitude (Editable)</label>
                  <input
                    type="text"
                    value={mapPosition.lng}
                    onChange={(e) => handleCoordinateChange('lng', e.target.value)}
                    className="w-full bg-[#0e192f] border border-[#1b2b4c] rounded-xl px-4 py-2 text-white text-sm focus:border-emerald-500 focus:outline-none"
                  />
                </div>
              </div>
              <button type="submit" disabled={!newStopName} className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-sm disabled:opacity-50">
                Save Stop
              </button>
            </form>
          </div>

          <div className="bg-[#0c162b] border border-[#16274a] rounded-2xl overflow-hidden shadow-xl">
             <MapContainer center={[mapPosition.lat, mapPosition.lng]} zoom={13} style={{ height: '400px', width: '100%' }}>
                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                <LocationMarker position={mapPosition} setPosition={setMapPosition} />
                <MapFlyer position={mapPosition} />
             </MapContainer>
          </div>
        </div>
      )}

      {/* ==================== ROUTES TAB ==================== */}
      {!loading && activeTab === 'Routes' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-[#0c162b] border border-[#16274a] rounded-2xl p-6 shadow-xl space-y-4">
            <h2 className="text-lg font-bold text-white mb-2">Create Route</h2>
            <form onSubmit={handleSaveRoute} className="space-y-4">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Route Name</label>
                <input type="text" required value={newRouteName} onChange={(e) => setNewRouteName(e.target.value)} className="w-full bg-[#0e192f] border border-[#1b2b4c] rounded-xl px-4 py-2 text-white text-sm" />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Route Number</label>
                <input type="text" required value={newRouteNumber} onChange={(e) => setNewRouteNumber(e.target.value)} className="w-full bg-[#0e192f] border border-[#1b2b4c] rounded-xl px-4 py-2 text-white text-sm" />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Assign Bus</label>
                <select required value={selectedBusId} onChange={(e) => setSelectedBusId(e.target.value)} className="w-full bg-[#0e192f] border border-[#1b2b4c] rounded-xl px-4 py-2 text-white text-sm">
                  <option value="">Select a bus</option>
                  {buses.map(b => <option key={b._id} value={b._id}>{b.busNumber}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Add Stops to Route (In Order)</label>
                <select onChange={(e) => handleAddStopToRoute(e.target.value)} className="w-full bg-[#0e192f] border border-[#1b2b4c] rounded-xl px-4 py-2 text-white text-sm mb-2">
                  <option value="">Select a stop to add</option>
                  {stops.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
                </select>

                <div className="bg-[#0a1222] border border-[#1b2b4c] rounded-xl p-3 min-h-[100px] space-y-2">
                  {selectedStops.length === 0 && <p className="text-xs text-slate-500">No stops added yet.</p>}
                  {selectedStops.map((id, index) => {
                    const stop = stops.find(s => s._id === id);
                    return (
                      <div key={id} className="flex justify-between items-center bg-[#16274a] px-3 py-2 rounded-lg text-sm text-white">
                        <span>{index + 1}. {stop?.name}</span>
                        <div className="flex gap-1">
                          <button type="button" disabled={index === 0} onClick={() => moveStopOrder(index, -1)} className="text-xs text-slate-400 hover:text-white px-1">↑</button>
                          <button type="button" disabled={index === selectedStops.length - 1} onClick={() => moveStopOrder(index, 1)} className="text-xs text-slate-400 hover:text-white px-1">↓</button>
                          <button type="button" onClick={() => handleRemoveStopFromRoute(id)} className="text-xs text-rose-400 hover:text-rose-300 px-1 ml-2">✕</button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
              <button type="submit" disabled={selectedStops.length < 2} className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-sm disabled:opacity-50">
                Create Route
              </button>
            </form>
          </div>

          <div className="bg-[#0c162b] border border-[#16274a] rounded-2xl p-6 shadow-xl space-y-4">
             <h2 className="text-lg font-bold text-white mb-2">Existing Routes</h2>
             {routes.map(r => (
               <div key={r._id} className="bg-[#0e192f] border border-[#1b2b4c] rounded-xl p-4">
                 <p className="text-sm font-bold text-white">{r.routeName} ({r.routeNumber})</p>
                 <p className="text-xs text-slate-400 mb-2">Bus: {r.busId?.busNumber}</p>
                 <div className="flex flex-wrap gap-1">
                   {r.stops?.map((stopId, i) => {
                     const stopObj = stops.find(s => s._id === stopId);
                     return <span key={stopId} className="text-[10px] bg-[#16274a] text-slate-300 px-2 py-1 rounded-md">{stopObj?.name || 'Loading...'}</span>
                   })}
                 </div>
               </div>
             ))}
          </div>
        </div>
      )}

      {/* ==================== FLEET TAB ==================== */}
      {!loading && activeTab === 'Fleet' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-[#0c162b] border border-[#16274a] rounded-2xl p-6 shadow-xl space-y-4">
            <h2 className="text-lg font-bold text-white mb-2">Register Bus</h2>
            <form onSubmit={handleSaveBus} className="space-y-4">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Bus Number</label>
                <input type="text" required value={newBusNumber} onChange={(e) => setNewBusNumber(e.target.value)} className="w-full bg-[#0e192f] border border-[#1b2b4c] rounded-xl px-4 py-2 text-white text-sm" />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Registration Number</label>
                <input type="text" required value={newRegNumber} onChange={(e) => setNewRegNumber(e.target.value)} className="w-full bg-[#0e192f] border border-[#1b2b4c] rounded-xl px-4 py-2 text-white text-sm" />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Capacity</label>
                <input type="number" required min="1" max="100" value={newCapacity} onChange={(e) => setNewCapacity(e.target.value)} className="w-full bg-[#0e192f] border border-[#1b2b4c] rounded-xl px-4 py-2 text-white text-sm" />
              </div>
              <button type="submit" className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-sm">
                Register Bus
              </button>
            </form>
          </div>

          <div className="bg-[#0c162b] border border-[#16274a] rounded-2xl p-6 shadow-xl space-y-4">
             <h2 className="text-lg font-bold text-white mb-2">Registered Buses</h2>
             {buses.map(b => (
               <div key={b._id} className="bg-[#0e192f] border border-[#1b2b4c] rounded-xl p-4 flex justify-between items-center">
                 <div>
                   <p className="text-sm font-bold text-white">{b.busNumber}</p>
                   <p className="text-xs text-slate-400">Reg: {b.registrationNumber} | Capacity: {b.capacity}</p>
                 </div>
                 <span className="text-[10px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-1 rounded-full capitalize">{b.availabilityStatus}</span>
               </div>
             ))}
          </div>
        </div>
      )}

      {/* ==================== ASSIGNMENTS TAB ==================== */}
      {!loading && activeTab === 'Assignments' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-[#0c162b] border border-[#16274a] rounded-2xl p-6 shadow-xl space-y-4">
              <h2 className="text-lg font-bold text-white mb-2">Assign Student to Bus</h2>
              <form onSubmit={handleAssignStudent} className="space-y-4">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Student</label>
                  <select required value={assignStudentId} onChange={(e) => setAssignStudentId(e.target.value)} className="w-full bg-[#0e192f] border border-[#1b2b4c] rounded-xl px-4 py-2 text-white text-sm">
                    <option value="">Select student</option>
                    {users.map(u => <option key={u._id} value={u._id}>{u.name} ({u.email})</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Bus</label>
                  <select required value={assignBusId} onChange={(e) => setAssignBusId(e.target.value)} className="w-full bg-[#0e192f] border border-[#1b2b4c] rounded-xl px-4 py-2 text-white text-sm">
                    <option value="">Select bus</option>
                    {buses.map(b => <option key={b._id} value={b._id}>{b.busNumber}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Route</label>
                  <select required value={assignRouteId} onChange={(e) => setAssignRouteId(e.target.value)} className="w-full bg-[#0e192f] border border-[#1b2b4c] rounded-xl px-4 py-2 text-white text-sm">
                    <option value="">Select route</option>
                    {routes.map(r => <option key={r._id} value={r._id}>{r.routeName}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Boarding Stop</label>
                  <select required value={assignStopId} onChange={(e) => setAssignStopId(e.target.value)} className="w-full bg-[#0e192f] border border-[#1b2b4c] rounded-xl px-4 py-2 text-white text-sm">
                    <option value="">Select stop</option>
                    {stops.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
                  </select>
                </div>
                <div className="flex items-center gap-2">
                  <input type="checkbox" id="overbook" checked={forceOverbook} onChange={(e) => setForceOverbook(e.target.checked)} className="rounded" />
                  <label htmlFor="overbook" className="text-xs text-slate-400">Force Overbook (Ignore Capacity)</label>
                </div>
                <button type="submit" className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-sm">
                  Assign Student
                </button>
              </form>
            </div>

            <div className="bg-[#0c162b] border border-[#16274a] rounded-2xl p-6 shadow-xl space-y-4">
              <h2 className="text-lg font-bold text-white mb-2">Assign Representative</h2>
              <form onSubmit={handleAssignRep} className="space-y-4">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Student (Rep)</label>
                  <select required value={repStudentId} onChange={(e) => setRepStudentId(e.target.value)} className="w-full bg-[#0e192f] border border-[#1b2b4c] rounded-xl px-4 py-2 text-white text-sm">
                    <option value="">Select student</option>
                    {users.map(u => <option key={u._id} value={u._id}>{u.name}</option>)}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Bus</label>
                    <select required value={repBusId} onChange={(e) => setRepBusId(e.target.value)} className="w-full bg-[#0e192f] border border-[#1b2b4c] rounded-xl px-4 py-2 text-white text-sm">
                      <option value="">Select bus</option>
                      {buses.map(b => <option key={b._id} value={b._id}>{b.busNumber}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Role</label>
                    <select required value={repRoleType} onChange={(e) => setRepRoleType(e.target.value)} className="w-full bg-[#0e192f] border border-[#1b2b4c] rounded-xl px-4 py-2 text-white text-sm">
                      <option value="primary">Primary</option>
                      <option value="vice">Vice</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Route</label>
                  <select required value={repRouteId} onChange={(e) => setRepRouteId(e.target.value)} className="w-full bg-[#0e192f] border border-[#1b2b4c] rounded-xl px-4 py-2 text-white text-sm">
                    <option value="">Select route</option>
                    {routes.map(r => <option key={r._id} value={r._id}>{r.routeName}</option>)}
                  </select>
                </div>
                <button type="submit" className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-sm">
                  Assign Rep
                </button>
              </form>
            </div>
          </div>

          <div className="bg-[#0c162b] border border-[#16274a] rounded-2xl p-6 shadow-xl space-y-4">
             <h2 className="text-lg font-bold text-white mb-2">Currently Assigned Students</h2>
             {assignments.length === 0 && (
                <p className="text-sm text-slate-500 text-center py-4">No students assigned yet.</p>
             )}
             <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
               {buses.map(bus => {
                  const studentsOnBus = assignments.filter(a => a.busId?._id === bus._id || a.busId === bus._id);
                  if (studentsOnBus.length === 0) return null;
                  return (
                    <div key={bus._id} className="bg-[#0e192f] border border-[#1b2b4c] rounded-xl p-4 flex flex-col h-full">
                      <div className="flex items-center justify-between mb-3 border-b border-[#1b2b4c] pb-2">
                        <h3 className="text-sm font-bold text-emerald-400">Bus {bus.busNumber}</h3>
                        <span className="text-xs text-slate-400 bg-[#16274a] px-2 py-1 rounded-md">
                          {studentsOnBus.length} / {bus.capacity}
                        </span>
                      </div>
                      <div className="flex flex-col gap-2 overflow-y-auto max-h-64 pr-1">
                        {studentsOnBus.map(student => (
                          <div key={student._id} className="bg-[#16274a] rounded-lg p-2 flex flex-col">
                            <span className="text-xs font-semibold text-white">{student.studentId?.name}</span>
                            <span className="text-[10px] text-slate-400 truncate">{student.studentId?.email}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
               })}
             </div>
          </div>
        </div>
      )}

      {/* ==================== REPRESENTATIVES TAB ==================== */}
      {!loading && activeTab === 'Representatives' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Users className="w-5 h-5 text-emerald-400" /> Representatives & Assistant Reps
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Overview of Primary Representatives and Vice (Assistant) Representatives assigned to each college bus for 2-tier failover protection.
              </p>
            </div>
            <div className="flex gap-2">
              <span className="text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 px-3 py-1.5 rounded-xl">
                Primary Reps: {representativeAssignments.filter(r => r.roleType === 'primary').length}
              </span>
              <span className="text-xs font-semibold bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 px-3 py-1.5 rounded-xl">
                Assistant Reps: {representativeAssignments.filter(r => r.roleType === 'vice').length}
              </span>
            </div>
          </div>

          {/* Quick Assign / Reassign Form */}
          <div className="bg-[#0c162b] border border-[#16274a] rounded-2xl p-6 shadow-xl">
            <h3 className="text-base font-bold text-white mb-4 flex items-center gap-2">
              <Shield className="w-4 h-4 text-emerald-400" /> Assign or Reassign Representative
            </h3>
            <form onSubmit={handleAssignRep} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Student</label>
                <select required value={repStudentId} onChange={(e) => setRepStudentId(e.target.value)} className="w-full bg-[#0e192f] border border-[#1b2b4c] rounded-xl px-3 py-2 text-white text-xs focus:border-emerald-500 focus:outline-none">
                  <option value="">Select student</option>
                  {users.map(u => <option key={u._id} value={u._id}>{u.name} ({u.email})</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Bus</label>
                <select required value={repBusId} onChange={(e) => setRepBusId(e.target.value)} className="w-full bg-[#0e192f] border border-[#1b2b4c] rounded-xl px-3 py-2 text-white text-xs focus:border-emerald-500 focus:outline-none">
                  <option value="">Select bus</option>
                  {buses.map(b => <option key={b._id} value={b._id}>{b.busNumber} ({b.registrationNumber})</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Role Type</label>
                <select required value={repRoleType} onChange={(e) => setRepRoleType(e.target.value)} className="w-full bg-[#0e192f] border border-[#1b2b4c] rounded-xl px-3 py-2 text-white text-xs focus:border-emerald-500 focus:outline-none">
                  <option value="primary">Primary Representative</option>
                  <option value="vice">Vice / Assistant Representative</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Route</label>
                <select required value={repRouteId} onChange={(e) => setRepRouteId(e.target.value)} className="w-full bg-[#0e192f] border border-[#1b2b4c] rounded-xl px-3 py-2 text-white text-xs focus:border-emerald-500 focus:outline-none">
                  <option value="">Select route</option>
                  {routes.map(r => <option key={r._id} value={r._id}>{r.routeName} ({r.routeNumber})</option>)}
                </select>
              </div>
              <div className="sm:col-span-2 lg:col-span-4 flex justify-end">
                <button type="submit" className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs transition shadow-lg shadow-emerald-600/30">
                  Save Representative Assignment
                </button>
              </div>
            </form>
          </div>

          {/* Roster Table / Card Grid grouped by Bus */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {buses.map(bus => {
              const repsForBus = representativeAssignments.filter(r => r.busId?._id === bus._id || r.busId === bus._id);
              const primaryRep = repsForBus.find(r => r.roleType === 'primary');
              const viceRep = repsForBus.find(r => r.roleType === 'vice');
              const assignedRoute = repsForBus[0]?.routeId || routes.find(r => r.busId?._id === bus._id || r.busId === bus._id);

              return (
                <div key={bus._id} className="bg-[#0c162b] border border-[#16274a] rounded-2xl p-5 shadow-xl flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between border-b border-[#16274a] pb-3 mb-4">
                      <div>
                        <h3 className="text-base font-bold text-white flex items-center gap-2">
                          <Bus className="w-4 h-4 text-emerald-400" /> Bus {bus.busNumber}
                        </h3>
                        <p className="text-xs text-slate-400 mt-0.5">
                          {assignedRoute ? `${assignedRoute.routeName} (${assignedRoute.routeNumber})` : 'Route unassigned'}
                        </p>
                      </div>
                      <span className="text-xs font-mono bg-[#16274a] text-slate-300 px-2.5 py-1 rounded-lg">
                        {bus.registrationNumber || 'TN-38'}
                      </span>
                    </div>

                    <div className="space-y-3">
                      {/* Primary Representative */}
                      <div className="bg-[#0e192f] border border-[#1b2b4c] rounded-xl p-3.5 flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2 mb-1.5">
                            <span className="text-[10px] font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-2 py-0.5 rounded-full">
                              Primary Rep
                            </span>
                            {primaryRep?.status === 'active' && (
                              <span className="text-[10px] text-emerald-400 font-semibold flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> Active
                              </span>
                            )}
                          </div>
                          {primaryRep ? (
                            <>
                              <p className="text-sm font-bold text-white">{primaryRep.representativeId?.name}</p>
                              <p className="text-xs text-slate-400">{primaryRep.representativeId?.email}</p>
                              {primaryRep.representativeId?.phone && (
                                <p className="text-xs text-slate-300 mt-0.5 font-mono">📞 {primaryRep.representativeId.phone}</p>
                              )}
                            </>
                          ) : (
                            <p className="text-xs text-slate-500 italic mt-1">No primary representative assigned</p>
                          )}
                        </div>
                      </div>

                      {/* Assistant / Vice Representative */}
                      <div className="bg-[#0e192f] border border-[#1b2b4c] rounded-xl p-3.5 flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2 mb-1.5">
                            <span className="text-[10px] font-bold uppercase tracking-wider bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 px-2 py-0.5 rounded-full">
                              Assistant Rep (Vice)
                            </span>
                            {viceRep?.status === 'active' && (
                              <span className="text-[10px] text-cyan-400 font-semibold flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" /> Ready for Failover
                              </span>
                            )}
                          </div>
                          {viceRep ? (
                            <>
                              <p className="text-sm font-bold text-white">{viceRep.representativeId?.name}</p>
                              <p className="text-xs text-slate-400">{viceRep.representativeId?.email}</p>
                              {viceRep.representativeId?.phone && (
                                <p className="text-xs text-slate-300 mt-0.5 font-mono">📞 {viceRep.representativeId.phone}</p>
                              )}
                            </>
                          ) : (
                            <p className="text-xs text-amber-400/80 italic mt-1">⚠️ No assistant rep assigned (Tier 2 uncovered)</p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-[#16274a] flex items-center justify-between text-xs text-slate-400">
                    <span>Capacity: {bus.capacity} seats</span>
                    <span className="text-slate-400">
                      Failover Status: <strong className={viceRep ? "text-emerald-400 font-semibold" : "text-amber-400 font-semibold"}>
                        {viceRep ? 'Protected (2/2 Reps)' : 'Partial (1/2 Reps)'}
                      </strong>
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ==================== STAFF TAB ==================== */}
      {!loading && activeTab === 'Staff' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-[#0c162b] border border-[#16274a] rounded-2xl p-6 shadow-xl space-y-4">
            <h2 className="text-lg font-bold text-white mb-2">Add Instructor (Staff)</h2>
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                setStaffLoading(true);
                setError(''); setSuccessMsg('');
                try {
                  await axiosClient.post('/admin/staff', {
                    name: newStaffName,
                    email: newStaffEmail,
                    password: newStaffPassword,
                    department: newStaffDepartment,
                    phone: newStaffPhone,
                  });
                  setSuccessMsg('Staff member created successfully!');
                  setNewStaffName('');
                  setNewStaffEmail('');
                  setNewStaffPassword('');
                  setNewStaffPhone('');
                  const res = await axiosClient.get('/admin/staff');
                  setStaffList(res.data || []);
                } catch (err) {
                  setError(err.message || 'Failed to create staff');
                } finally {
                  setStaffLoading(false);
                }
              }}
              className="space-y-4"
              autoComplete="off"
            >
              <div>
                <label className="block text-xs text-slate-400 mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  autoComplete="off"
                  value={newStaffName}
                  onChange={(e) => setNewStaffName(e.target.value)}
                  placeholder="e.g. Dr. Arun Kumar"
                  className="w-full bg-[#0e192f] border border-[#1b2b4c] rounded-xl px-4 py-2 text-white text-sm"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">Email</label>
                <input
                  type="email"
                  required
                  autoComplete="new-email"
                  value={newStaffEmail}
                  onChange={(e) => setNewStaffEmail(e.target.value)}
                  placeholder="arun@kct.ac.in"
                  className="w-full bg-[#0e192f] border border-[#1b2b4c] rounded-xl px-4 py-2 text-white text-sm"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">Password</label>
                <input
                  type="password"
                  required
                  minLength={8}
                  autoComplete="new-password"
                  value={newStaffPassword}
                  onChange={(e) => setNewStaffPassword(e.target.value)}
                  placeholder="Min 8 characters"
                  className="w-full bg-[#0e192f] border border-[#1b2b4c] rounded-xl px-4 py-2 text-white text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Department</label>
                  <select
                    value={newStaffDepartment}
                    onChange={(e) => setNewStaffDepartment(e.target.value)}
                    className="w-full bg-[#0e192f] border border-[#1b2b4c] rounded-xl px-4 py-2 text-white text-sm"
                  >
                    <option value="CSE">CSE</option>
                    <option value="IT">IT</option>
                    <option value="AIDS">AIDS</option>
                    <option value="ECE">ECE</option>
                    <option value="MECH">MECH</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Phone</label>
                  <input
                    type="tel"
                    required
                    minLength={10}
                    maxLength={10}
                    pattern="[0-9]{10}"
                    title="Please enter exactly 10 digits"
                    autoComplete="off"
                    value={newStaffPhone}
                    onChange={(e) => {
                      const cleaned = e.target.value.replace(/\D/g, '');
                      setNewStaffPhone(cleaned);
                    }}
                    placeholder="10-digit number"
                    className="w-full bg-[#0e192f] border border-[#1b2b4c] rounded-xl px-4 py-2 text-white text-sm"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={staffLoading}
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-sm disabled:opacity-50"
              >
                {staffLoading ? 'Creating...' : 'Create Staff Account'}
              </button>
            </form>
          </div>

          <div className="bg-[#0c162b] border border-[#16274a] rounded-2xl p-6 shadow-xl space-y-4">
            <h2 className="text-lg font-bold text-white mb-2">All Staff Members ({staffList.length})</h2>
            {staffList.length === 0 && (
              <p className="text-sm text-slate-500 text-center py-4">No staff accounts created yet.</p>
            )}
            <div className="space-y-2 max-h-[500px] overflow-y-auto">
              {staffList.map(staff => (
                <div key={staff._id} className="bg-[#0e192f] border border-[#1b2b4c] rounded-xl p-4 flex justify-between items-center">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-white truncate">{staff.name}</p>
                    <p className="text-xs text-slate-400 truncate">{staff.email}</p>
                    <p className="text-xs text-slate-500 mt-1">{staff.department || 'No dept'} • {staff.phone || 'No phone'}</p>
                  </div>
                  <div className="flex items-center gap-2 ml-2">
                    <span className={`text-[10px] px-2 py-1 rounded-full border whitespace-nowrap ${
                      staff.isActive
                        ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                        : 'bg-rose-500/20 text-rose-400 border-rose-500/30'
                    }`}>
                      {staff.isActive ? 'Active' : 'Inactive'}
                    </span>
                    <button
                      onClick={async () => {
                        try {
                          await axiosClient.put(`/admin/staff/${staff._id}/toggle`);
                          const res = await axiosClient.get('/admin/staff');
                          setStaffList(res.data || []);
                        } catch (err) {
                          setError(err.message || 'Failed to toggle status');
                        }
                      }}
                      className="text-xs text-amber-400 hover:text-amber-300 px-2 whitespace-nowrap"
                    >
                      {staff.isActive ? 'Deactivate' : 'Activate'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ==================== SCHEDULE TAB ==================== */}
      {!loading && activeTab === 'Schedule' && (
        <div className="bg-[#0c162b] border border-[#16274a] rounded-2xl p-6 shadow-xl space-y-4 max-w-xl mx-auto">
          <h2 className="text-lg font-bold text-white mb-2">Activate Schedule</h2>
          <form onSubmit={handleActivateSchedule} className="space-y-4">
             <div>
                <label className="block text-xs text-slate-400 mb-1">Date</label>
                <input type="date" required value={scheduleDate} onChange={(e) => setScheduleDate(e.target.value)} className="w-full bg-[#0e192f] border border-[#1b2b4c] rounded-xl px-4 py-2 text-white text-sm" />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Day Type</label>
                <select required value={scheduleDayType} onChange={(e) => setScheduleDayType(e.target.value)} className="w-full bg-[#0e192f] border border-[#1b2b4c] rounded-xl px-4 py-2 text-white text-sm">
                  <option value="WEEKDAY">Weekday</option>
                  <option value="SATURDAY">Saturday</option>
                  <option value="SPECIAL">Special</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Route</label>
                <select required value={scheduleRouteId} onChange={(e) => setScheduleRouteId(e.target.value)} className="w-full bg-[#0e192f] border border-[#1b2b4c] rounded-xl px-4 py-2 text-white text-sm">
                  <option value="">Select route</option>
                  {routes.map(r => <option key={r._id} value={r._id}>{r.routeName}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Bus</label>
                <select required value={scheduleBusId} onChange={(e) => setScheduleBusId(e.target.value)} className="w-full bg-[#0e192f] border border-[#1b2b4c] rounded-xl px-4 py-2 text-white text-sm">
                  <option value="">Select bus</option>
                  {buses.map(b => <option key={b._id} value={b._id}>{b.busNumber}</option>)}
                </select>
              </div>
              <button type="submit" className="w-full py-2.5 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-xl text-sm">
                Activate Schedule
              </button>
          </form>
        </div>
      )}

      {/* ==================== CSV IMPORT TAB ==================== */}
      {!loading && activeTab === 'CSV Import' && (
        <div className="bg-[#0c162b] border border-[#16274a] rounded-2xl p-6 shadow-xl space-y-4 max-w-xl mx-auto">
          <h2 className="text-lg font-bold text-white mb-2">Bulk Import Students</h2>
          <p className="text-xs text-slate-400 mb-4">
            Upload a CSV file with columns: <code>registerNumber, name, department, email, phoneNumber, boardingStop</code>. Max 2MB / 1000 rows.
          </p>
          <form onSubmit={handleCsvUpload} className="space-y-4">
            <div className="border-2 border-dashed border-[#1b2b4c] rounded-xl p-8 text-center hover:bg-[#0e192f] transition">
              <Upload className="w-8 h-8 text-slate-500 mx-auto mb-2" />
              <input
                type="file"
                accept=".csv"
                onChange={(e) => setCsvFile(e.target.files[0])}
                className="block w-full text-sm text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-emerald-500/10 file:text-emerald-400 hover:file:bg-emerald-500/20"
              />
            </div>
            <button type="submit" disabled={!csvFile} className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-sm disabled:opacity-50">
              Upload & Import
            </button>
          </form>
        </div>
      )}

    </div>
  );
}