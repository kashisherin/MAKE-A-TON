import React from 'react';
import { Outlet } from 'react-router-dom';
import AdminSidebar from './AdminSidebar';
import TopBar from './TopBar';

export default function AdminLayout() {
  return (
    <div className="min-h-screen bg-slate-50">
      <AdminSidebar />
      {/* Main content area - offset by sidebar width; uses peer selector on sidebar for dynamic margin */}
      <div className="ml-64 transition-all duration-300 ease-in-out flex flex-col min-h-screen">
        <TopBar />
        <main className="flex-1 p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
