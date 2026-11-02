// MapPickerModal — Interactive map modal with address search.
// Uses Leaflet for the map and Nominatim (OpenStreetMap) for free geocoding.

import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import { MapPin, X, Check, Search, Loader2, Navigation } from 'lucide-react';
import 'leaflet/dist/leaflet.css';

// Fix Leaflet's default marker icon paths
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// ─── Map Click Handler ─────────────────────────────────────
function ClickHandler({ onPick }) {
    useMapEvents({
        click(e) {
            onPick(e.latlng.lat, e.latlng.lng);
        },
    });
    return null;
}

// ─── Map Mover ─────────────────────────────────────────────
// Helper component to programmatically pan the map when a search result is selected
function MapMover({ center }) {
    const map = useMap();
    useEffect(() => {
        if (center) {
            map.flyTo(center, 15, { duration: 1.5 });
        }
    }, [center, map]);
    return null;
}

export default function MapPickerModal({
    initialLat = 13.0827,
    initialLng = 80.2707,
    onSelect,
    onClose,
}) {
    const [position, setPosition] = useState([
        parseFloat(initialLat) || 13.0827,
        parseFloat(initialLng) || 80.2707
    ]);

    // ─── Search State ──────────────────────────────────────────
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [isSearching, setIsSearching] = useState(false);
    const [searchError, setSearchError] = useState('');

    // ─── Debounced Search ──────────────────────────────────────
    // Waits 500ms after the user stops typing before calling the API.
    // This prevents rate-limiting from Nominatim.
    useEffect(() => {
        if (!searchQuery || searchQuery.length < 3) {
            setSearchResults([]);
            return;
        }

        const timer = setTimeout(async () => {
            setIsSearching(true);
            setSearchError('');

            try {
                // Nominatim search API — free, no key required
                const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=5`;
                const res = await fetch(url, {
                    headers: { 'Accept-Language': 'en' }   // Get English names
                });

                if (!res.ok) throw new Error('Search failed');

                const data = await res.json();
                setSearchResults(data);
            } catch (err) {
                setSearchError('Could not search. Check internet connection.');
            } finally {
                setIsSearching(false);
            }
        }, 500);

        return () => clearTimeout(timer);
    }, [searchQuery]);

    // ─── Handle Search Result Click ────────────────────────────
    const handleResultClick = (result) => {
        const lat = parseFloat(result.lat);
        const lng = parseFloat(result.lon);
        setPosition([lat, lng]);
        setSearchQuery(result.display_name);
        setSearchResults([]);   // Hide dropdown
    };

    const handleConfirm = () => {
        onSelect(
            parseFloat(position[0].toFixed(6)),
            parseFloat(position[1].toFixed(6))
        );
        onClose();
    };

    return (
        <div
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[9999] flex items-center justify-center p-4"
            onClick={onClose}
        >
            <div
                className="bg-[#0c162b] border border-[#16274a] rounded-2xl shadow-2xl w-full max-w-3xl flex flex-col"
                onClick={(e) => e.stopPropagation()}
            >
                {/* ===== Header ===== */}
                <div className="flex items-center justify-between p-4 border-b border-[#16274a]">
                    <h2 className="text-lg font-bold text-white flex items-center gap-2">
                        <MapPin className="w-5 h-5 text-emerald-400" />
                        Pick Location on Map
                    </h2>
                    <button
                        onClick={onClose}
                        className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* ===== Search Bar ===== */}
                <div className="p-4 border-b border-[#16274a] relative">
                    <div className="relative">
                        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                        <input
                            type="text"
                            placeholder="Search area, street, or landmark (e.g. Guindy, Chennai)"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-10 py-2.5 bg-[#0e192f] border border-[#1b2b4c] rounded-xl text-sm text-white focus:outline-none focus:border-emerald-500 transition"
                        />
                        {isSearching && (
                            <Loader2 className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-emerald-400 animate-spin" />
                        )}
                    </div>

                    {/* Search Results Dropdown */}
                    {searchResults.length > 0 && (
                        <div className="absolute left-4 right-4 top-full mt-1 bg-[#0e192f] border border-[#1b2b4c] rounded-xl shadow-2xl z-[10000] max-h-60 overflow-y-auto">
                            {searchResults.map((res) => (
                                <button
                                    key={res.place_id}
                                    onClick={() => handleResultClick(res)}
                                    className="w-full text-left px-4 py-2.5 hover:bg-[#16274a] transition border-b border-[#1b2b4c] last:border-0 flex items-start gap-2"
                                >
                                    <Navigation className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                                    <span className="text-xs text-slate-200 line-clamp-2">{res.display_name}</span>
                                </button>
                            ))}
                        </div>
                    )}

                    {searchError && <p className="text-xs text-rose-400 mt-2">{searchError}</p>}
                </div>

                {/* ===== Map ===== */}
                <div className="h-[400px] w-full relative z-0">
                    <MapContainer
                        center={position}
                        zoom={13}
                        style={{ width: '100%', height: '100%' }}
                        scrollWheelZoom={true}
                    >
                        <TileLayer
                            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                            attribution="&copy; OpenStreetMap"
                        />
                        <ClickHandler onPick={(lat, lng) => setPosition([lat, lng])} />
                        <Marker position={position} />
                        <MapMover center={position} />
                    </MapContainer>
                </div>

                {/* ===== Footer: Coords + Actions ===== */}
                <div className="p-4 border-t border-[#16274a] flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                    <div className="flex gap-4 text-sm">
                        <div>
                            <span className="text-xs text-slate-500">Lat:</span>
                            <span className="ml-2 font-mono text-emerald-400">{position[0].toFixed(6)}</span>
                        </div>
                        <div>
                            <span className="text-xs text-slate-500">Lng:</span>
                            <span className="ml-2 font-mono text-emerald-400">{position[1].toFixed(6)}</span>
                        </div>
                    </div>

                    <div className="flex gap-2">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white text-sm font-semibold rounded-lg transition"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleConfirm}
                            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold rounded-lg transition"
                        >
                            <Check className="w-4 h-4" />
                            Use This Location
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}