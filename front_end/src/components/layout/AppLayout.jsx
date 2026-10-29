// AppLayout — master shell combining Sidebar + Header + scrollable page content via React Router Outlet
import React from 'react';
import { Outlet } from 'react-router-dom';
import Header from './Header.jsx';
import Sidebar from './Sidebar.jsx';

export default function AppLayout() {
  return (
    // Outer wrapper fills the full viewport height and prevents body overflow
    <div className="flex h-screen overflow-hidden bg-[#070d18]">
      {/* Left fixed sidebar with navigation links */}
      <Sidebar />

      {/* Right column: stacked header on top, scrollable page content below */}
      <div className="flex flex-col flex-1 overflow-hidden">
        {/* Sticky top navbar with search, notifications, and user profile */}
        <Header />

        {/* Outlet renders whichever page component matches the current URL */}
        <main className="flex-1 overflow-y-auto p-5 space-y-5">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
