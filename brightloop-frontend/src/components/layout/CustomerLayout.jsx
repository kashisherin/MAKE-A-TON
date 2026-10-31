import React from 'react';
import { Outlet } from 'react-router-dom';
import CustomerSidebar from './CustomerSidebar';
import TopBar from './TopBar';

export default function CustomerLayout() {
  return (
    <div className="min-h-screen bg-slate-50">
      <CustomerSidebar />
      <div className="ml-64 transition-all duration-300 ease-in-out flex flex-col min-h-screen">
        <TopBar />
        <main className="flex-1 p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
