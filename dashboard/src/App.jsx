import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Dashboard from './pages/Dashboard';
import Appointments from './pages/Appointments';
import Patients from './pages/Patients';
import CallLogs from './pages/CallLogs';
import Setup from './pages/Setup';

// Dev mode fake token removed to allow proper signup flow

const ProtectedRoute = ({ children }) => {
  const isAuthenticated = localStorage.getItem('sb-token') !== null;
  if (!isAuthenticated) return <Navigate to="/signup" />;
  return children;
};

function App() {
  return (
    <div className="w-screen min-h-screen overflow-x-hidden bg-surface">
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
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
