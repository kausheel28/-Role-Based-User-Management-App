// AI-assisted: see ai-assist.md
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import CandidatesPage from './pages/CandidatesPage';
import InterviewsPage from './pages/InterviewsPage';
import CallsPage from './pages/CallsPage';
import UnauthorizedPage from './pages/UnauthorizedPage';
import SettingsPage from './pages/SettingsPage';
import UsersPage from './pages/UsersPage';

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function App() {

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Router>
          <div className="App">
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/unauthorized" element={<UnauthorizedPage />} />
              
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              
              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute requiredPage="dashboard">
                    <Layout>
                      <DashboardPage />
                    </Layout>
                  </ProtectedRoute>
                }
              />
              
              <Route
                path="/candidates"
                element={
                  <ProtectedRoute requiredPage="candidates">
                    <Layout>
                      <CandidatesPage />
                    </Layout>
                  </ProtectedRoute>
                }
              />
              
              <Route
                path="/interviews"
                element={
                  <ProtectedRoute requiredPage="interviews">
                    <Layout>
                      <InterviewsPage />
                    </Layout>
                  </ProtectedRoute>
                }
              />
              
              <Route
                path="/calls"
                element={
                  <ProtectedRoute requiredPage="calls">
                    <Layout>
                      <CallsPage />
                    </Layout>
                  </ProtectedRoute>
                }
              />
              
              <Route
                path="/users"
                element={
                  <ProtectedRoute requiredPage="user_management">
                    <Layout>
                      <UsersPage />
                    </Layout>
                  </ProtectedRoute>
                }
              />
              
              <Route
                path="/settings"
                element={
                  <ProtectedRoute requiredPage="settings">
                    <Layout>
                    <SettingsPage />
                    </Layout>
                  </ProtectedRoute>
                }
              />
              
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
            
            <Toaster
              position="top-right"
              toastOptions={{
                duration: 4000,
                style: {
                  background: '#363636',
                  color: '#fff',
                },
              }}
            />
          </div>
        </Router>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
