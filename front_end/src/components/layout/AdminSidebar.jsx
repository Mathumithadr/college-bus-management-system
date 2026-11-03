// AdminSidebar — Navigation for administrators.
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Bus, Users } from 'lucide-react';

export default function AdminSidebar() {
  const navItems = [
    { label: 'Admin Dashboard', path: '/admin', icon: LayoutDashboard },
    { label: 'Fleet & Routes', path: '/admin/fleet', icon: Bus },
    { label: 'Assignments', path: '/admin/assignments', icon: Users },
  ];

  return (
    <aside className="w-64 bg-[#0c162b] border-r border-[#16274a] h-screen p-4 flex flex-col">
      <div className="text-white font-bold text-lg mb-6 px-2 flex items-center gap-2">
        👑 Admin Portal
      </div>
      <nav className="space-y-1 flex-1">
        {navItems.map(({ label, path, icon: Icon }) => (
          <NavLink
            key={path}
            to={path}
            end={path === '/admin'}
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