import React, { useState, useEffect } from 'react';
import { Megaphone, AlertCircle, CheckCircle, Send, Trash2 } from 'lucide-react';
import axiosClient from '../../api/axiosClient';

export default function AdminAnnouncementsPage() {
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [targetType, setTargetType] = useState('general');

  const fetchAnnouncements = async () => {
    setLoading(true);
    try {
      const res = await axiosClient.get('/admin/announcements');
      setAnnouncements(res.data || []);
    } catch (err) {
      setError(err.message || 'Failed to fetch announcements');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    setSuccessMsg('');
    try {
      await axiosClient.post('/admin/announcements', {
        title,
        message,
        targetType,
        isPublished: true,
      });
      setSuccessMsg('Announcement published successfully!');
      setTitle('');
      setMessage('');
      setTargetType('general');
      await fetchAnnouncements();
    } catch (err) {
      setError(err.message || 'Failed to create announcement');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this announcement?')) return;
    try {
      await axiosClient.delete(`/admin/announcements/${id}`);
      setSuccessMsg('Announcement deleted');
      await fetchAnnouncements();
    } catch (err) {
      setError(err.message || 'Failed to delete');
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-10">
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Megaphone className="w-6 h-6 text-emerald-400" /> Announcements
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          Publish important notices to students and staff.
        </p>
      </div>

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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Create form */}
        <div className="bg-[#0c162b] border border-[#16274a] rounded-2xl p-6 shadow-xl space-y-4">
          <h2 className="text-lg font-bold text-white mb-2">Create Announcement</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs text-slate-400 mb-1">Title</label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Route 1 Delayed Today"
                className="w-full bg-[#0e192f] border border-[#1b2b4c] rounded-xl px-4 py-2 text-white text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Message</label>
              <textarea
                required
                rows={4}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Explain the announcement in detail..."
                className="w-full bg-[#0e192f] border border-[#1b2b4c] rounded-xl px-4 py-2 text-white text-sm resize-none"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Target</label>
              <select
                value={targetType}
                onChange={(e) => setTargetType(e.target.value)}
                className="w-full bg-[#0e192f] border border-[#1b2b4c] rounded-xl px-4 py-2 text-white text-sm"
              >
                <option value="general">General (Everyone)</option>
              </select>
            </div>
            <button
              type="submit"
              disabled={submitting}
              className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-sm flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
              {submitting ? 'Publishing...' : 'Publish Announcement'}
            </button>
          </form>
        </div>

        {/* Right: List */}
        <div className="bg-[#0c162b] border border-[#16274a] rounded-2xl p-6 shadow-xl space-y-4">
          <h2 className="text-lg font-bold text-white mb-2">
            All Announcements ({announcements.length})
          </h2>
          {loading && <p className="text-sm text-slate-500">Loading...</p>}
          {!loading && announcements.length === 0 && (
            <p className="text-sm text-slate-500 text-center py-4">No announcements yet.</p>
          )}
          <div className="space-y-2 max-h-[600px] overflow-y-auto">
            {announcements.map((ann) => (
              <div key={ann._id} className="bg-[#0e192f] border border-[#1b2b4c] rounded-xl p-4">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="text-sm font-bold text-white flex-1">{ann.title}</h3>
                  <button
                    onClick={() => handleDelete(ann._id)}
                    className="text-rose-400 hover:text-rose-300 p-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">{ann.message}</p>
                <div className="flex items-center gap-2 mt-3 text-[10px] text-slate-500">
                  <span className="bg-[#16274a] px-2 py-0.5 rounded">{ann.targetType}</span>
                  <span>{new Date(ann.createdAt).toLocaleDateString()}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}