// Sidebar — left vertical navigation with glowing emerald active pill and all 9 menu items
import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Bus, MapPin, TrendingUp,
  Megaphone, CalendarCheck, FileText, User, Settings
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';

// navItems defines each sidebar link — path must match App.jsx route definitions
const baseNavItems = [
  { label: 'Dashboard',           path: '/dashboard',     icon: LayoutDashboard },
  { label: 'My Bus',              path: '/my-bus',        icon: Bus },
  { label: 'Live Tracking',       path: '/tracking',      icon: MapPin },
  { label: 'Route Progress',      path: '/route',         icon: TrendingUp },
  { label: 'Announcements',       path: '/announcements', icon: Megaphone },
  { label: 'Attendance Requests', path: '/attendance',    icon: CalendarCheck },
  { label: 'Reports',             path: '/reports',       icon: FileText },
  { label: 'Profile',             path: '/profile',       icon: User },
  { label: 'Settings',            path: '/settings',      icon: Settings },
];

export default function Sidebar() {
  const { user } = useAuth();

  // If user is admin or representative, inject their control portal link
  const navItems = [...baseNavItems];
  if (user?.role === 'admin') {
    navItems.push({ label: 'Admin Portal', path: '/admin', icon: LayoutDashboard });
  } else if (user?.permissions?.includes('representative')) {
    navItems.push({ label: 'Rep Console', path: '/rep/transit', icon: Bus });
  }

  return (
    // Fixed-width sidebar — never scrolls horizontally, content scrolls vertically if needed
    <aside className="w-60 bg-[#0a1222] border-r border-[#14233e] flex flex-col py-5 px-3 shrink-0 overflow-y-auto">

      {/* Spacer so nav links start below the header height */}
      <nav className="space-y-1 flex-1">
        {navItems.map(({ label, path, icon: Icon }) => (
          <NavLink
            key={path}
            to={path}
            className={({ isActive }) =>
              // Active link gets glowing emerald pill; inactive links use subtle hover state
              isActive
                ? 'flex items-center gap-3 px-3.5 py-2.5 rounded-xl bg-emerald-600/90 text-white font-semibold text-sm shadow-lg shadow-emerald-600/25 transition'
                : 'flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-slate-400 hover:text-white hover:bg-[#121f3a] font-medium text-sm transition'
            }
          >
            {/* Each icon matches the design from the approved dashboard mockup */}
            <Icon className="w-4 h-4 shrink-0" />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>

      {/* Bottom section shows the logged-in user's name and role above a separator */}
      {user && (
        <div className="mt-4 pt-4 border-t border-[#14233e]">
          <div className="px-3.5 text-xs text-slate-400 font-medium truncate">{user.name}</div>
          <div className="px-3.5 text-[10px] text-slate-500 capitalize mt-0.5">{user.role}</div>
        </div>
      )}
    </aside>
  );
}
