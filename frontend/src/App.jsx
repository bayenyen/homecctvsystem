// src/App.jsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';

import DashboardLayout from './layouts/DashboardLayout';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import CamerasPage from './pages/CamerasPage';
import LiveViewPage from './pages/LiveViewPage';
import RecordingsPage from './pages/RecordingsPage';
import PlaybackPage from './pages/PlaybackPage';
import AlertsPage from './pages/AlertsPage';
import UsersPage from './pages/UsersPage';
import ReportsPage from './pages/ReportsPage';
import StoragePage from './pages/StoragePage';
import SettingsPage from './pages/SettingsPage';
import NotFoundPage from './pages/NotFoundPage';

// Protected route wrapper
const ProtectedRoute = ({ children, adminOnly = false }) => {
  const { user, loading } = useAuth();

  if (loading) return (
    <div className="min-h-screen bg-dark-900 flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 border-4 border-accent-blue border-t-transparent rounded-full animate-spin" />
        <p className="text-gray-400 text-sm">Loading V380 CCTV System...</p>
      </div>
    </div>
  );

  if (!user) return <Navigate to="/login" replace />;
  if (adminOnly && user.role !== 'admin') return <Navigate to="/dashboard" replace />;

  return children;
};

const AppRoutes = () => {
  const { user } = useAuth();

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/dashboard" /> : <LoginPage />} />
      <Route path="/" element={<Navigate to="/dashboard" />} />

      <Route element={
        <ProtectedRoute>
          <SocketProvider>
            <DashboardLayout />
          </SocketProvider>
        </ProtectedRoute>
      }>
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/cameras" element={<CamerasPage />} />
        <Route path="/live" element={<LiveViewPage />} />
        <Route path="/recordings" element={<RecordingsPage />} />
        <Route path="/playback/:id" element={<PlaybackPage />} />
        <Route path="/alerts" element={<AlertsPage />} />
        <Route path="/reports" element={<ReportsPage />} />
        <Route path="/storage" element={<StoragePage />} />
        <Route path="/users" element={
          <ProtectedRoute adminOnly>
            <UsersPage />
          </ProtectedRoute>
        } />
        <Route path="/settings" element={
          <ProtectedRoute adminOnly>
            <SettingsPage />
          </ProtectedRoute>
        } />
      </Route>

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
};

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
        <Toaster
          position="top-right"
          toastOptions={{
            className: 'bg-dark-700 text-white border border-dark-500',
            duration: 4000,
          }}
        />
      </AuthProvider>
    </BrowserRouter>
  );
}
