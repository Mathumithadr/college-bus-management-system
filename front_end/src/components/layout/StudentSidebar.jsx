import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Map, CalendarCheck, FileText, Megaphone } from 'lucide-react';

export default function StudentSidebar() {
  const navItems = [
    { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { label: 'Bus Tracking', path: '/tracking', icon: Map },
    { label: 'Attendance', path: '/attendance', icon: CalendarCheck },
    { label: 'Reports', path: '/reports', icon: FileText },
    { label: 'Announcements', path: '/announcements', icon: Megaphone },
  ];

  return (
    <aside className="w-64 bg-[#0c162b] border-r border-[#16274a] h-screen p-4 flex flex-col">
      <div className="text-white font-bold text-lg mb-6 px-2 flex items-center gap-2">
        🚌 Student Portal
      </div>
      <nav className="space-y-1 flex-1">
        {navItems.map(({ label, path, icon: Icon }) => (
          <NavLink key={path} to={path}
            className={({ isActive }) =>
              isActive
                ? 'flex items-center gap-3 px-3 py-2 rounded-xl bg-emerald-600/90 text-white font-semibold text-sm shadow-lg shadow-emerald-600/25'
                : 'flex items-center gap-3 px-3 py-2 rounded-xl text-slate-400 hover:text-white hover:bg-[#121f3a] text-sm transition'
            }>
            <Icon className="w-4 h-4" />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}