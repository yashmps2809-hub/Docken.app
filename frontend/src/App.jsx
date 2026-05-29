import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { App as CapacitorApp } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import Navbar from './components/Navbar';

import Home from './pages/Home';
import PatientLogin from './pages/PatientLogin';
import DoctorLogin from './pages/DoctorLogin';
import PatientDashboard from './pages/PatientDashboard';
import FindDoctor from './pages/FindDoctor';
import BookAppointment from './pages/BookAppointment';
import PatientLiveQueue from './pages/PatientLiveQueue';
import PatientHistory from './pages/PatientHistory';
import DoctorDashboard from './pages/DoctorDashboard';
import DoctorRegistration from './pages/DoctorRegistration';
import ReceptionistLogin from './pages/ReceptionistLogin';
import ReceptionistDashboard from './pages/ReceptionistDashboard';

const HardwareBackButtonHandler = () => {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const handleBackButton = ({ canGoBack }) => {
      // Root pages where pressing back should exit the app
      const rootPaths = ['/', '/patient/dashboard', '/doctor/dashboard', '/receptionist/dashboard'];
      
      if (rootPaths.includes(location.pathname)) {
        CapacitorApp.exitApp();
      } else {
        navigate(-1);
      }
    };
    
    CapacitorApp.addListener('backButton', handleBackButton);

    return () => {
      CapacitorApp.removeAllListeners();
    };
  }, [location, navigate]);

  return null;
};

// Temporarily removed PushNotificationSetup to prevent Android crash
// The native Firebase SDK crashes if google-services.json is missing.

function App() {
  const [isOffline, setIsOffline] = React.useState(!navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return (
    <BrowserRouter>
      {isOffline && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          background: '#ef4444',
          color: 'white',
          padding: '10px 15px',
          textAlign: 'center',
          fontSize: '0.85rem',
          fontWeight: 800,
          zIndex: 99999,
          boxShadow: '0 2px 10px rgba(0,0,0,0.15)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
          letterSpacing: '0.05em'
        }}>
          <span style={{ fontSize: '1.1rem' }}>⚠️</span> CONNECTION LOST. LIVE QUEUE UPDATES ARE TEMPORARILY PAUSED.
        </div>
      )}
      <HardwareBackButtonHandler />
      <Navbar />
      <div className="main-content" style={{ marginTop: isOffline ? '42px' : '0px', transition: 'margin-top 0.3s ease' }}>
        <Routes>
          <Route path="/" element={<Home />} />
        
        {/* Auth Routes */}
        <Route path="/login/patient" element={<PatientLogin />} />
        <Route path="/login/doctor" element={<DoctorLogin />} />
        <Route path="/login/receptionist" element={<ReceptionistLogin />} />
        
        {/* Patient Routes */}
        <Route path="/patient/dashboard" element={<PatientDashboard />} />
        <Route path="/patient" element={<FindDoctor />} />
        <Route path="/patient/book" element={<BookAppointment />} />
        <Route path="/patient/queue" element={<PatientLiveQueue />} />
        <Route path="/patient/history" element={<PatientHistory />} />
        
        {/* Doctor Routes */}
        <Route path="/doctor/register" element={<DoctorRegistration />} />
        <Route path="/doctor/dashboard" element={<DoctorDashboard />} />

        {/* Receptionist Routes */}
        <Route path="/receptionist/dashboard" element={<ReceptionistDashboard />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;
