import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { WagmiProvider } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';

// Config
import { config } from './config/wagmi';

// Contexts
import { AppModeProvider } from './contexts/AppModeContext';

// Components
import GamePage from './components/GamePage';
import FlexibleSlotDemo from './components/FlexibleSlotDemo';

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

// Main App wrapper with providers
function App() {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
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
              </Routes>
            </Router>
          </div>
        </AppModeProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}

export default App;
