// Header — clean, beautifully aligned top navbar with workable live announcements notification bell, status indicator, and interactive profile menu
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Bus,
  Bell,
  RotateCw,
  LogOut,
  Megaphone,
  CheckCircle2,
  ChevronRight,
  Shield,
  GraduationCap,
  Briefcase,
  MapPin,
  Clock,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';
import axiosClient from '../../api/axiosClient.js';

export default function Header() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  // Dropdown states
  const [profileOpen, setProfileOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [announcements, setAnnouncements] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loadingAnnouncements, setLoadingAnnouncements] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const profileRef = useRef(null);
  const notificationRef = useRef(null);

  // Extract initials from user's full name
  const initials =
    user?.name
      ?.split(' ')
      .map((n) => n[0])
      .join('')
      .slice(0, 2)
      .toUpperCase() || 'CB';

  // Role badge styling
  const isRep = user?.permissions?.includes('representative');
  const roleBadge = (() => {
    if (user?.role === 'admin') {
      return { text: 'Admin Portal', color: 'bg-purple-500/15 text-purple-400 border-purple-500/30' };
    }
    if (user?.role === 'staff') {
      return { text: 'Staff Portal', color: 'bg-blue-500/15 text-blue-400 border-blue-500/30' };
    }
    if (isRep) {
      return { text: 'Bus Representative', color: 'bg-amber-500/15 text-amber-400 border-amber-500/30' };
    }
    return { text: 'Student Portal', color: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' };
  })();

  // Fetch real announcements for the notification bell
  const fetchAnnouncements = async () => {
    if (!user) return;
    try {
      setLoadingAnnouncements(true);
      const isStudent = user?.role === 'student';
      const endpoint = isStudent ? '/student/announcements' : '/announcements';
      const res = await axiosClient.get(endpoint);
      const list = Array.isArray(res?.data)
        ? res.data
        : Array.isArray(res)
        ? res
        : [];
      setAnnouncements(list.slice(0, 5));
      setUnreadCount(list.length);
    } catch (err) {
      console.error('Failed to load notifications', err);
    } finally {
      setLoadingAnnouncements(false);
    }
  };

  useEffect(() => {
    fetchAnnouncements();
    const interval = setInterval(fetchAnnouncements, 45000);
    return () => clearInterval(interval);
  }, [user]);

  // Handle outside click to close menus
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (profileRef.current && !profileRef.current.contains(event.target)) {
        setProfileOpen(false);
      }
      if (notificationRef.current && !notificationRef.current.contains(event.target)) {
        setNotificationsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleManualRefresh = () => {
    setIsRefreshing(true);
    fetchAnnouncements();
    setTimeout(() => {
      setIsRefreshing(false);
    }, 800);
  };

  return (
    <header className="h-16 bg-[#0a1222] border-b border-[#14233e] px-6 flex items-center justify-between shrink-0 z-40">
      {/* LEFT: Clean Brand & Portal Role Tag */}
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-amber-400 flex items-center justify-center text-slate-950 shadow-lg shadow-amber-400/20 shrink-0">
          <Bus className="w-5 h-5" />
        </div>
        <div className="flex items-center gap-2.5">
          <span className="font-bold text-base text-white tracking-tight">
            College Bus Management
          </span>
          <span className={`hidden sm:inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${roleBadge.color}`}>
            {roleBadge.text}
          </span>
        </div>
      </div>

      {/* CENTER: Live Transit Monitored Indicator (Fills gap seamlessly and provides real value) */}
      <div className="hidden md:flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#0e192f] border border-[#1b2b4c] text-xs text-slate-300 shadow-sm">
        <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
        <span className="font-medium text-emerald-400">Transit Monitored</span>
        <span className="text-slate-600">|</span>
        <span className="text-slate-400">Campus Transit Network</span>
      </div>

      {/* RIGHT: Workable icons (Live Notification Bell, Refresh, Profile Avatar) */}
      <div className="flex items-center gap-3">
        {/* Workable Refresh Button */}
        <button
          onClick={handleManualRefresh}
          title="Refresh Alerts and Status"
          className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-[#0e192f] border border-transparent hover:border-[#1b2b4c] transition"
        >
          <RotateCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-emerald-400' : ''}`} />
        </button>

        {/* Workable Notification Bell with Live Announcements Popover */}
        <div className="relative" ref={notificationRef}>
          <button
            onClick={() => {
              setNotificationsOpen((prev) => !prev);
              setProfileOpen(false);
            }}
            title="Announcements & Alerts"
            className="relative p-2 rounded-xl text-slate-400 hover:text-white hover:bg-[#0e192f] border border-transparent hover:border-[#1b2b4c] transition"
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-rose-500 text-[10px] font-bold text-white flex items-center justify-center shadow-lg shadow-rose-500/50">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {/* Interactive Notifications Popover Dropdown */}
          {notificationsOpen && (
            <div className="absolute right-0 top-12 w-80 sm:w-96 bg-[#0c162b] border border-[#1b2b4c] rounded-2xl shadow-2xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-150">
              <div className="flex items-center justify-between px-4 py-3 border-b border-[#14233e] bg-[#0e192f]/70">
                <div className="flex items-center gap-2">
                  <Megaphone className="w-4 h-4 text-amber-400" />
                  <h3 className="text-sm font-bold text-white">Announcements & Alerts</h3>
                </div>
                <span className="text-[11px] font-medium text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                  {unreadCount} Active
                </span>
              </div>

              <div className="max-h-80 overflow-y-auto divide-y divide-[#14233e]/50">
                {loadingAnnouncements ? (
                  <div className="p-6 text-center text-xs text-slate-400">Loading announcements...</div>
                ) : announcements.length === 0 ? (
                  <div className="p-6 text-center">
                    <CheckCircle2 className="w-8 h-8 text-emerald-400/50 mx-auto mb-2" />
                    <p className="text-xs text-slate-400">No active announcements right now.</p>
                  </div>
                ) : (
                  announcements.map((item) => (
                    <div
                      key={item._id}
                      onClick={() => {
                        setNotificationsOpen(false);
                        navigate('/announcements');
                      }}
                      className="p-3.5 hover:bg-[#0e192f] transition cursor-pointer"
                    >
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <h4 className="text-xs font-semibold text-white truncate max-w-[220px]">
                          {item.title}
                        </h4>
                        <span className="text-[10px] text-slate-500 shrink-0">
                          {item.createdAt ? new Date(item.createdAt).toLocaleDateString() : 'Recent'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                        {item.message || item.content}
                      </p>
                    </div>
                  ))
                )}
              </div>

              <Link
                to="/announcements"
                onClick={() => setNotificationsOpen(false)}
                className="w-full flex items-center justify-center gap-1.5 py-2.5 text-xs font-bold text-emerald-400 hover:text-emerald-300 bg-[#0e192f] hover:bg-[#121f3a] border-t border-[#14233e] transition"
              >
                <span>View all announcements</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          )}
        </div>

        {/* Workable User Profile Avatar & Interactive Menu */}
        <div className="relative" ref={profileRef}>
          <button
            onClick={() => {
              setProfileOpen((prev) => !prev);
              setNotificationsOpen(false);
            }}
            className="flex items-center gap-2 p-1 pl-1.5 pr-2.5 rounded-full bg-[#0e192f] border border-[#1b2b4c] hover:border-emerald-500/40 transition group"
          >
            <div className="w-7 h-7 rounded-full bg-emerald-600/30 border border-emerald-500/40 text-emerald-300 font-bold flex items-center justify-center text-xs group-hover:ring-2 group-hover:ring-emerald-400 transition">
              {initials}
            </div>
            <span className="text-xs font-semibold text-slate-300 hidden sm:inline max-w-[130px] truncate">
              {user?.name || 'Account'}
            </span>
          </button>

          {/* User Profile Popover Card */}
          {profileOpen && (
            <div className="absolute right-0 top-12 w-64 bg-[#0c162b] border border-[#1b2b4c] rounded-2xl shadow-2xl p-3 z-50 animate-in fade-in slide-in-from-top-2 duration-150 space-y-3">
              {/* Profile Card Header */}
              <div className="px-2 py-1.5 border-b border-[#14233e] pb-3">
                <p className="text-sm font-bold text-white truncate">{user?.name}</p>
                <p className="text-xs text-slate-400 truncate">{user?.email}</p>
                <div className="mt-1.5">
                  <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${roleBadge.color}`}>
                    {roleBadge.text}
                  </span>
                </div>
              </div>

              {/* Quick Navigation Links */}
              <div className="space-y-1">
                {user?.role === 'student' && (
                  <>
                    <Link
                      to="/tracking"
                      onClick={() => setProfileOpen(false)}
                      className="flex items-center gap-2.5 px-3 py-2 text-xs text-slate-300 hover:text-white hover:bg-[#0e192f] rounded-xl transition font-medium"
                    >
                      <MapPin className="w-3.5 h-3.5 text-emerald-400" /> Live Bus Tracking
                    </Link>
                    <Link
                      to="/attendance"
                      onClick={() => setProfileOpen(false)}
                      className="flex items-center gap-2.5 px-3 py-2 text-xs text-slate-300 hover:text-white hover:bg-[#0e192f] rounded-xl transition font-medium"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 text-amber-400" /> Attendance Requests
                    </Link>
                  </>
                )}

                {user?.role === 'staff' && (
                  <>
                    <Link
                      to="/staff/dashboard"
                      onClick={() => setProfileOpen(false)}
                      className="flex items-center gap-2.5 px-3 py-2 text-xs text-slate-300 hover:text-white hover:bg-[#0e192f] rounded-xl transition font-medium"
                    >
                      <Briefcase className="w-3.5 h-3.5 text-blue-400" /> Staff Dashboard
                    </Link>
                    <Link
                      to="/attendance"
                      onClick={() => setProfileOpen(false)}
                      className="flex items-center gap-2.5 px-3 py-2 text-xs text-slate-300 hover:text-white hover:bg-[#0e192f] rounded-xl transition font-medium"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Review Attendance
                    </Link>
                  </>
                )}

                {user?.role === 'admin' && (
                  <>
                    <Link
                      to="/admin"
                      onClick={() => setProfileOpen(false)}
                      className="flex items-center gap-2.5 px-3 py-2 text-xs text-slate-300 hover:text-white hover:bg-[#0e192f] rounded-xl transition font-medium"
                    >
                      <Shield className="w-3.5 h-3.5 text-purple-400" /> Admin Console
                    </Link>
                    <Link
                      to="/admin/representatives"
                      onClick={() => setProfileOpen(false)}
                      className="flex items-center gap-2.5 px-3 py-2 text-xs text-slate-300 hover:text-white hover:bg-[#0e192f] rounded-xl transition font-medium"
                    >
                      <GraduationCap className="w-3.5 h-3.5 text-emerald-400" /> Representatives Roster
                    </Link>
                  </>
                )}

                <Link
                  to="/announcements"
                  onClick={() => setProfileOpen(false)}
                  className="flex items-center gap-2.5 px-3 py-2 text-xs text-slate-300 hover:text-white hover:bg-[#0e192f] rounded-xl transition font-medium"
                >
                  <Megaphone className="w-3.5 h-3.5 text-cyan-400" /> All Announcements
                </Link>
              </div>

              {/* Sign Out Button */}
              <div className="pt-1 border-t border-[#14233e]">
                <button
                  onClick={logout}
                  className="w-full flex items-center gap-2 text-xs font-semibold text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 px-3 py-2 rounded-xl transition"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Sign out</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
