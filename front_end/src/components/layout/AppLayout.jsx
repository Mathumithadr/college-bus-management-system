import { Outlet } from 'react-router-dom';
import Header from './Header';
import Sidebar from './Sidebar';
import StudentSidebar from './StudentSidebar';
import { useAuth } from '../../context/AuthContext';

export default function AppLayout() {
  const { user } = useAuth();
  
  // Decide which sidebar to show based on role
  const isStudent = user?.role === 'student' && !user?.permissions?.includes('representative');

  return (
    <div className="flex h-screen bg-[#070d18] overflow-hidden">
      {isStudent ? <StudentSidebar /> : <Sidebar />}
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}