// StaffSidebar — Navigation for faculty/staff members.
// Staff can:
// 1. Review attendance requests from students
// 2. Monitor live bus trips (verify student claims)
// 3. See transport announcements
//
// Staff CANNOT:
// - Create reports (that's a student action)
// - Manage buses/routes (that's admin)
// - Start/end trips (that's the representative)

import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, 
  CalendarCheck, 
  Bus, 
  Megaphone 
} from 'lucide-react';

export default function StaffSidebar() {
  const navItems = [
    { label: 'Dashboard',      path: '/staff/dashboard', icon: LayoutDashboard },
    { label: 'Attendance Review', path: '/attendance',   icon: CalendarCheck },
    { label: 'Live Trips',     path: '/staff/trips',     icon: Bus },
    { label: 'Announcements',  path: '/announcements',   icon: Megaphone },
  ];

  return (
    <aside className="w-64 bg-[#0c162b] border-r border-[#16274a] h-screen p-4 flex flex-col">
      <div className="text-white font-bold text-lg mb-6 px-2 flex items-center gap-2">
        🎓 Staff Portal
      </div>
      
      <nav className="space-y-1 flex-1">
        {navItems.map(({ label, path, icon: Icon }) => (
          <NavLink 
            key={path} 
            to={path}
            className={({ isActive }) =>
              isActive
                ? 'flex items-center gap-3 px-3 py-2 rounded-xl bg-emerald-600/90 text-white font-semibold text-sm shadow-lg shadow-emerald-600/25'
                : 'flex items-center gap-3 px-3 py-2 rounded-xl text-slate-400 hover:text-white hover:bg-[#121f3a] text-sm transition'
            }
          >
            <Icon className="w-4 h-4" />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}