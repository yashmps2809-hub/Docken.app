import React from 'react';
import { Link, useNavigate } from 'react-router-dom';

const Navbar = () => {
  const navigate = useNavigate();
  const patientSession = localStorage.getItem('patientSession');
  const doctorSession = localStorage.getItem('doctorSession');

  const handlePatientLogout = () => {
    localStorage.removeItem('patientSession');
    navigate('/');
  };

  const handleDoctorLogout = () => {
    localStorage.removeItem('doctorSession');
    navigate('/');
  };

  return (
    <nav className="global-navbar">
      <div className="nav-brand" onClick={() => navigate('/')}>
        <div className="logo-icon"><span></span></div>
        DOCKEN
      </div>

      <div className="nav-links">
        <Link to="/" className="nav-link">Home</Link>
        <Link to="/patient" className="nav-link">Find Doctors</Link>
        {doctorSession && <Link to="/doctor/dashboard" className="nav-link">Doctor Dashboard</Link>}
      </div>

      <div className="nav-actions">
        {patientSession ? (
          <button className="btn btn-ghost btn-sm" onClick={handlePatientLogout}>Logout Patient</button>
        ) : (
          <Link to="/login/patient" className="btn btn-primary btn-sm">Patient Login</Link>
        )}
        
        {doctorSession ? (
          <button className="btn btn-ghost btn-sm" onClick={handleDoctorLogout}>Logout Doctor</button>
        ) : (
          <Link to="/login/doctor" className="btn btn-secondary btn-sm">For Doctors</Link>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
