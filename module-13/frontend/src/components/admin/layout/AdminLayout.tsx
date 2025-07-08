import React from 'react';
import { Outlet } from 'react-router-dom';
import AdminHeader from './AdminHeader';

const AdminLayout: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-900">
      {/* Header */}
      <AdminHeader />
      
      {/* Main Content - Full Width */}
      <main className="container mx-auto px-4 py-8">
        <Outlet />
      </main>
    </div>
  );
};

export default AdminLayout;