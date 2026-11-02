import { NavLink } from 'react-router-dom';
import { LayoutDashboard, CalendarCheck, FileText, Megaphone, Shield, Radio } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export default function Sidebar() {
  const { user } = useAuth();
  const isRep = user?.permissions?.includes('representative');

  const navItems = [
    // Only regular students see the live dashboard
    { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard, roles: ['student'], hideForRep: true },
    // Everyone can see attendance (students request, staff reviews)
    { label: 'Attendance', path: '/attendance', icon: CalendarCheck, roles: ['student', 'staff', 'admin'] },
    // Students and admins see reports
    { label: 'Reports', path: '/reports', icon: FileText, roles: ['student', 'admin'] },
    // Everyone sees announcements
    { label: 'Announcements', path: '/announcements', icon: Megaphone, roles: ['student', 'staff', 'admin'] },
    // Only reps see the console
    { label: 'Rep Console', path: '/rep/transit', icon: Radio, roles: ['student'], requiresRep: true },
    // Only admins see the admin panel
    { label: 'Admin Panel', path: '/admin', icon: Shield, roles: ['admin'] },
  ];

  const visible = navItems.filter((item) => {
    // If it requires a Rep, only show to Reps
    if (item.requiresRep && !isRep) return false;
    // Hide dashboard from Reps (they have their own console)
    if (item.hideForRep && isRep) return false;
    
    // Otherwise check the role
    return item.roles.includes(user?.role);
  });

  return (
    <aside className="w-64 bg-[#0c162b] border-r border-[#16274a] h-screen p-4 flex flex-col">
      <div className="text-white font-bold text-lg mb-6 px-2 flex items-center gap-2">
        🚌 College Bus
      </div>
      <nav className="space-y-1 flex-1">
        {visible.map(({ label, path, icon: Icon }) => (
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
      
      {/* User profile snippet at the bottom */}
      {user && (
        <div className="mt-4 pt-4 border-t border-[#14233e]">
          <div className="px-3.5 text-xs text-slate-400 font-medium truncate">{user.name}</div>
          <div className="px-3.5 text-[10px] text-slate-500 capitalize mt-0.5">
            {isRep ? 'Representative' : user.role}
          </div>
        </div>
      )}
    </aside>
  );
}