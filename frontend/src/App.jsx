import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar';

import Home from './pages/Home';
import PatientLogin from './pages/PatientLogin';
import DoctorLogin from './pages/DoctorLogin';
import FindDoctor from './pages/FindDoctor';
import BookAppointment from './pages/BookAppointment';
import PatientLiveQueue from './pages/PatientLiveQueue';
import DoctorDashboard from './pages/DoctorDashboard';
import DoctorRegistration from './pages/DoctorRegistration';

function App() {
  return (
    <BrowserRouter>
      <Navbar />
      <div className="main-content">
        <Routes>
          <Route path="/" element={<Home />} />
        
        {/* Auth Routes */}
        <Route path="/login/patient" element={<PatientLogin />} />
        <Route path="/login/doctor" element={<DoctorLogin />} />
        
        {/* Patient Routes */}
        <Route path="/patient" element={<FindDoctor />} />
        <Route path="/patient/book" element={<BookAppointment />} />
        <Route path="/patient/queue" element={<PatientLiveQueue />} />
        
        {/* Doctor Routes */}
        <Route path="/doctor/register" element={<DoctorRegistration />} />
        <Route path="/doctor/dashboard" element={<DoctorDashboard />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;
