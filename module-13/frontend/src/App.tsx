import React, { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Outlet } from 'react-router-dom';
import { WagmiProvider } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';

// Config
import { config } from './config/wagmi';

// Providers
import { DynamicApolloProvider } from './components/providers/DynamicApolloProvider';

// Contexts
import { AppModeProvider } from './contexts/AppModeContext';

// Components
import GamePage from './components/GamePage';
import FlexibleSlotDemo from './components/FlexibleSlotDemo';

// Admin Auth
import { AdminGuard } from './hooks/admin/useAdminAuth';

// Admin Components (Lazy loaded)
const AdminLayout = lazy(() => import('./components/admin/layout/AdminLayout'));
const OverviewDashboard = lazy(() => import('./components/admin/dashboard/OverviewDashboard'));

// Create a query client for React Query
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 3,
      staleTime: 30000, // 30 seconds
      refetchOnWindowFocus: false,
    },
  },
});

// Loading component for lazy loaded routes
const AdminLoadingFallback = () => (
  <div className="flex items-center justify-center min-h-screen bg-gray-900">
    <div className="text-center">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-yellow-400 mx-auto mb-4"></div>
      <p className="text-gray-400">Loading admin dashboard...</p>
    </div>
  </div>
);

// Main App wrapper with providers
function App() {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <DynamicApolloProvider>
          <AppModeProvider>
            <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
              <Toaster
                position="top-right"
                toastOptions={{
                  duration: 4000,
                  style: {
                    background: '#1f2937',
                    color: '#fff',
                    border: '1px solid #374151',
                  },
                }}
              />
              
              <Router>
                <Routes>
                  {/* Main Game Page */}
                  <Route path="/" element={<GamePage />} />
                  
                  {/* Hidden Flexible Demo Route */}
                  <Route path="/flexible" element={<FlexibleSlotDemo />} />
                  
                  {/* Admin Routes - Protected */}
                  <Route path="/admin" element={
                    <AdminGuard>
                      <Suspense fallback={<AdminLoadingFallback />}>
                        <AdminLayout />
                      </Suspense>
                    </AdminGuard>
                  }>
                    <Route index element={<OverviewDashboard />} />
                  </Route>
                </Routes>
              </Router>
            </div>
          </AppModeProvider>
        </DynamicApolloProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}

export default App;
