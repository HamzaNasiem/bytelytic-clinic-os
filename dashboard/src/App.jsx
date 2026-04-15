import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Appointments from './pages/Appointments';
import Patients from './pages/Patients';
import CallLogs from './pages/CallLogs';
import Setup from './pages/Setup';

// Protected Route wrapper (mocked for UI build)
const ProtectedRoute = ({ children }) => {
  const isAuthenticated = localStorage.getItem('sb-token') !== null;
  // For UI development, let's just bypass auth strictness or allow it easily.
  // Actually, let's keep it strict but easy to bypass by putting a token.
  if (!isAuthenticated) return <Navigate to="/login" />;
  return children;
};

const App = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        
        <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
          <Route index element={<Dashboard />} />
          <Route path="appointments" element={<Appointments />} />
          <Route path="patients" element={<Patients />} />
          <Route path="calls" element={<CallLogs />} />
          <Route path="setup" element={<Setup />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
};

export default App;
