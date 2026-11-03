import { Outlet } from 'react-router-dom';
import Header from './Header';
import Sidebar from './Sidebar';
import StudentSidebar from './StudentSidebar';
import StaffSidebar from './StaffSidebar';
import AdminSidebar from './AdminSidebar'; // ← Verify this import exists
import { useAuth } from '../../context/AuthContext';

export default function AppLayout() {
  const { user } = useAuth();

  const renderSidebar = () => {
    if (!user) return <Sidebar />;
    if (user.role === 'admin') return <AdminSidebar />;
    if (user.role === 'staff') return <StaffSidebar />;
    if (user.role === 'student') {
      if (user.permissions?.includes('representative')) return <Sidebar />;
      return <StudentSidebar />;
    }
    return <Sidebar />;
  };

  return (
    <div className="flex h-screen bg-[#070d18] overflow-hidden">
      {renderSidebar()}
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}