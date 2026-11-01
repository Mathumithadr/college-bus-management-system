// AnnouncementsPage — shows audience-isolated broadcast announcements from GET /api/student/announcements
import React, { useState, useEffect } from 'react';
import { Megaphone, AlertCircle } from 'lucide-react';
import axiosClient from '../api/axiosClient.js';

// Priority badge styles matching the Announcement model priority enum
const PRIORITY_STYLES = {
  low:    'bg-slate-500/15 text-slate-400 border-slate-500/30',
  medium: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
  high:   'bg-amber-500/15 text-amber-400 border-amber-500/30',
  urgent: 'bg-rose-500/15 text-rose-400 border-rose-500/30',
};

export default function AnnouncementsPage() {
  // announcements from GET /api/student/announcements or GET /api/announcements
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');

  useEffect(() => {
    const fetchAnnouncements = async () => {
      try {
        // Backend audience-isolation ensures students only see relevant announcements
        const res = await axiosClient.get('/student/announcements');
        setAnnouncements(res.data?.announcements || res.data || []);
      } catch (err) {
        setError('Failed to load announcements.');
      } finally {
        setLoading(false);
      }
    };
    fetchAnnouncements();
  }, []);

  return (
    <div className="space-y-5">
      {/* Page header */}
      <div className="flex items-center gap-3">
        <Megaphone className="w-6 h-6 text-emerald-400" />
        <h1 className="text-xl font-extrabold text-white">Announcements</h1>
      </div>

      {/* Error alert if API call fails */}
      {error && (
        <div className="flex items-center gap-2 bg-rose-500/10 border border-rose-500/30 rounded-xl px-4 py-3 text-sm text-rose-400">
          <AlertCircle className="w-4 h-4 shrink-0" />{error}
        </div>
      )}

      {/* Announcements list card */}
      <div className="rounded-2xl bg-[#0c162b] border border-[#16274a] p-5 shadow-xl">
        {loading ? (
          <div className="flex justify-center py-10">
            <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : announcements.length === 0 ? (
          <p className="text-sm text-slate-500 text-center py-8">No announcements at this time.</p>
        ) : (
          <div className="space-y-4">
            {announcements.map((ann) => (
              <div key={ann._id} className="bg-[#0e192f] border border-[#1b2b4c] rounded-xl px-4 py-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    {/* Announcement title */}
                    <div className="text-sm font-bold text-white">{ann.title}</div>
                    {/* Announcement body text */}
                    <div className="text-xs text-slate-400 mt-1 leading-relaxed">{ann.body || ann.message}</div>
                    {/* Published timestamp */}
                    <div className="text-[10px] text-slate-500 mt-2">
                      {ann.publishedAt ? new Date(ann.publishedAt).toLocaleString() : new Date(ann.createdAt).toLocaleString()}
                    </div>
                  </div>
                  {/* Priority badge — urgent notices appear in rose red */}
                  <span className={`px-2.5 py-1 rounded-full text-[11px] font-semibold border shrink-0 capitalize ${PRIORITY_STYLES[ann.priority] || PRIORITY_STYLES.medium}`}>
                    {ann.priority}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
