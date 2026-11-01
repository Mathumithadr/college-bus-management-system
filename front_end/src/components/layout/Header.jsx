// Header — top navbar with search bar, theme pill toggle, notification bell, and user profile avatar
import React, { useState } from 'react';
import { Search, Bell, Grid, Moon, Sun, Bus, Menu } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';

export default function Header() {
  const { user, logout } = useAuth();

  // profileOpen controls the dropdown menu shown when the user clicks their avatar
  const [profileOpen, setProfileOpen] = useState(false);

  // Extract initials from the logged-in user's name (e.g. "Alex Kumar" → "AK")
  const initials = user?.name
    ?.split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() || 'JS';

  return (
    // Sticky header stays fixed at the top while page content scrolls underneath
    <header className="h-16 bg-[#0a1222] border-b border-[#14233e] px-5 flex items-center justify-between shrink-0 z-40">

      {/* LEFT: Brand logo and hamburger (hamburger is decorative — sidebar is always visible on desktop) */}
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-amber-400 flex items-center justify-center text-slate-950 shadow-lg shadow-amber-400/20">
          <Bus className="w-5 h-5" />
        </div>
        <span className="font-bold text-base text-white tracking-tight hidden md:block">
          College Bus Management
        </span>
        <button className="ml-1 p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/50 transition">
          <Menu className="w-4 h-4" />
        </button>
      </div>

      {/* CENTER: Search bar — non-functional placeholder for future search feature */}
      <div className="flex-1 max-w-lg mx-4 hidden sm:block">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Search for your bus, route, or stop..."
            className="w-full pl-10 pr-4 py-2 bg-[#0e192f] border border-[#1b2b4c] rounded-xl text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition"
          />
        </div>
      </div>

      {/* RIGHT: Theme toggle, notification bell, and user avatar */}
      <div className="flex items-center gap-3">

        {/* Day/Night mode toggle pill — decorative only in this template */}
        <div className="bg-[#0e192f] border border-[#1b2b4c] rounded-full p-1 flex items-center gap-1">
          <button className="w-6 h-6 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-200">
            <Sun className="w-3.5 h-3.5" />
          </button>
          <button className="w-6 h-6 rounded-full bg-slate-700 flex items-center justify-center text-white">
            <Moon className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Notification bell — badge count 3 represents unread announcements */}
        <button className="relative p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/50 transition">
          <Bell className="w-5 h-5" />
          <span className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-rose-500 text-[10px] font-bold text-white flex items-center justify-center">
            3
          </span>
        </button>

        {/* App grid launcher — decorative icon */}
        <button className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/50 transition">
          <Grid className="w-5 h-5" />
        </button>

        {/* User avatar circle — click to open logout dropdown */}
        <div className="relative">
          <button
            onClick={() => setProfileOpen((prev) => !prev)}
            className="w-9 h-9 rounded-full bg-emerald-700/80 border border-emerald-500/40 text-emerald-200 font-bold flex items-center justify-center text-sm hover:ring-2 hover:ring-emerald-400 transition"
          >
            {initials}
          </button>

          {/* Dropdown menu — shows user name and logout button */}
          {profileOpen && (
            <div className="absolute right-0 top-11 w-48 bg-[#0c162b] border border-[#1b2b4c] rounded-xl shadow-2xl p-2 z-50">
              {/* Display the logged-in user's name and role */}
              <p className="text-xs text-slate-400 px-3 py-1.5 font-medium">{user?.name}</p>
              <p className="text-[10px] text-slate-500 px-3 pb-2 capitalize">{user?.role}</p>
              <div className="h-px bg-[#1b2b4c] mb-1" />
              {/* Logout calls POST /api/auth/logout and clears the JWT token */}
              <button
                onClick={logout}
                className="w-full text-left text-sm text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 px-3 py-2 rounded-lg transition"
              >
                Sign out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
