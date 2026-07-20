import { Routes, Route, Navigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import DashboardLayout from './components/layout/DashboardLayout';
import LoginPage from './features/auth/LoginPage';
import DashboardPage from './features/dashboard/DashboardPage';
import MonitoringPage from './features/monitoring/MonitoringPage';
import DevicesPage from './features/devices/DevicesPage';
import RespondersPage from './features/responders/RespondersPage';
import IncidentsPage from './features/incidents/IncidentsPage';
import AudioTestPage from './features/audio-test/AudioTestPage';
import MapPage from './features/map/MapPage';
import AnalyticsPage from './features/analytics/AnalyticsPage';
import SettingsPage from './features/settings/SettingsPage';
import { connectSocket, disconnectSocket } from './services/socket';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const token = localStorage.getItem('dhwaniai_token');
  if (!token) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export default function App() {
  const [isAuth, setIsAuth] = useState(!!localStorage.getItem('dhwaniai_token'));

  useEffect(() => {
    if (isAuth) {
      connectSocket();
      return () => disconnectSocket();
    }
  }, [isAuth]);

  useEffect(() => {
    const handleStorage = () => {
      setIsAuth(!!localStorage.getItem('dhwaniai_token'));
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  return (
    <Routes>
      <Route path="/login" element={<LoginPage onLogin={() => setIsAuth(true)} />} />
      <Route
        element={
          <ProtectedRoute>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<DashboardPage />} />
        <Route path="monitoring" element={<MonitoringPage />} />
        <Route path="devices" element={<DevicesPage />} />
        <Route path="responders" element={<RespondersPage />} />
        <Route path="incidents" element={<IncidentsPage />} />
        <Route path="audio-test" element={<AudioTestPage />} />
        <Route path="map" element={<MapPage />} />
        <Route path="analytics" element={<AnalyticsPage />} />
        <Route path="settings" element={<SettingsPage />} />
      </Route>
    </Routes>
  );
}
