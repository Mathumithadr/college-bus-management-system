import React, { useState, useEffect } from 'react';
import axiosClient from '../api/axiosClient';
import { Megaphone, AlertCircle, Calendar, Tag } from 'lucide-react';

export default function AnnouncementsPage() {
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchAnnouncements = async () => {
      try {
        // Backend filters this automatically for General, Route, or Bus announcements
        const res = await axiosClient.get('/student/announcements');
        setAnnouncements(res.data || []);
      } catch (err) {
        setError('Failed to load announcements.');
      } finally {
        setLoading(false);
      }
    };
    fetchAnnouncements();
  }, []);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Megaphone className="w-6 h-6 text-amber-400" /> Transport Announcements
        </h1>
        <p className="text-sm text-slate-400 mt-1">Official updates regarding your routes and buses.</p>
      </div>

      {error && (
        <div className="flex items-center gap-2 bg-rose-500/10 border border-rose-500/30 rounded-xl px-4 py-3 text-sm text-rose-400">
          <AlertCircle className="w-4 h-4 shrink-0" />{error}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-10">
          <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : announcements.length === 0 ? (
        <div className="bg-[#0c162b] border border-[#16274a] rounded-2xl p-10 text-center">
          <Megaphone className="w-10 h-10 text-slate-600 mx-auto mb-3" />
          <p className="text-slate-400">No announcements at this time.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {announcements.map((ann) => (
            <div key={ann._id} className="bg-[#0c162b] border border-[#16274a] rounded-2xl p-5 shadow-xl">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`px-2.5 py-1 rounded-full text-[11px] font-semibold border ${
                      ann.targetType === 'bus' 
                        ? 'bg-amber-500/15 text-amber-400 border-amber-500/30' 
                        : ann.targetType === 'route'
                          ? 'bg-blue-500/15 text-blue-400 border-blue-500/30'
                          : 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                    }`}>
                      {ann.targetType === 'bus' ? 'My Bus' : ann.targetType === 'route' ? 'My Route' : 'General'}
                    </span>
                    <span className="text-xs text-slate-500 flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {new Date(ann.publishedAt || ann.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-white">{ann.title}</h3>
                  <p className="text-sm text-slate-300 mt-2 leading-relaxed">{ann.message}</p>
                  
                  <div className="mt-3 text-xs text-slate-500">
                    Posted by: {ann.createdBy?.name || 'Transport Office'}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}