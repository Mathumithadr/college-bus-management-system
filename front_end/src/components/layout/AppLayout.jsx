// AppLayout — Master shell for all authenticated pages.
// Shows the correct sidebar based on the user's role:
// - Student → StudentSidebar
// - Staff   → StaffSidebar
// - Admin   → Sidebar (or AdminSidebar in the future)
// - Rep     → Sidebar (Rep has its own console but shares links)

import { Outlet } from 'react-router-dom';
import Header from './Header';
import Sidebar from './Sidebar';
import StudentSidebar from './StudentSidebar';
import StaffSidebar from './StaffSidebar';
import { useAuth } from '../../context/AuthContext';

export default function AppLayout() {
  const { user } = useAuth();
  
  // Determine which sidebar to render based on role
  const renderSidebar = () => {
    if (!user) return <Sidebar />;
    
    if (user.role === 'student') {
      // Reps are technically role='student' with permissions: ['representative']
      // They should see the generic Sidebar (not the student one)
      if (user.permissions?.includes('representative')) {
        return <Sidebar />;
      }
      return <StudentSidebar />;
    }
    
    if (user.role === 'staff') return <StaffSidebar />;
    
    // Admin and fallback
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