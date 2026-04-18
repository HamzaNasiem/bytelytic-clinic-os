import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Appointments from './pages/Appointments';
import Patients from './pages/Patients';
import CallLogs from './pages/CallLogs';
import Setup from './pages/Setup';

// Dev mode: auto-set fake token so UI pages can be previewed without backend
if (import.meta.env.DEV && !localStorage.getItem('sb-token')) {
  localStorage.setItem('sb-token', 'dev-preview-token');
  localStorage.setItem('clinic-info', JSON.stringify({
    clinicId: 'dev-clinic-id',
    clinicName: 'Bytelytic Clinic OS',
    timezone: 'America/Chicago',
  }));
}

const ProtectedRoute = ({ children }) => {
  const isAuthenticated = localStorage.getItem('sb-token') !== null;
  if (!isAuthenticated) return <Navigate to="/login" />;
  return children;
};

function App() {
  return (
    <div className="w-screen min-h-screen overflow-x-hidden bg-surface">
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Dashboard />} />
            <Route path="appointments" element={<Appointments />} />
            <Route path="patients" element={<Patients />} />
            <Route path="calls" element={<CallLogs />} />
            <Route path="setup" element={<Setup />} />
          </Route>
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </BrowserRouter>
    </div>
  );
}

export default App;
