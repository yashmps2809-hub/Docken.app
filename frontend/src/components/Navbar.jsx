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
    <>
      {/* Mobile Top Header (Uppermost branding for Android) */}
      <div className="mobile-top-header mobile-only">
        <div className="nav-brand" onClick={() => navigate('/')} style={{ cursor: 'pointer' }}>
          <div className="logo-icon" style={{width: '24px', height: '24px'}}><span></span></div>
          <span style={{ fontSize: '1.2rem', fontWeight: 900, color: 'var(--text)' }}>DOCKEN</span>
        </div>
      </div>

      <nav className="global-navbar">
        {/* Desktop Brand */}
        <div className="nav-brand desktop-only" onClick={() => navigate('/')}>
          <div className="logo-icon"><span></span></div>
          DOCKEN
        </div>

      <div className="nav-links">
        <Link to="/" className="nav-link">
          <span className="nav-icon">🏠</span>
          <span className="nav-text">Home</span>
        </Link>
        
        {patientSession ? (
          <>
            <Link to="/patient/dashboard" className="nav-link">
              <span className="nav-icon">📊</span>
              <span className="nav-text">Dashboard</span>
            </Link>
            <Link to="/patient" className="nav-link">
              <span className="nav-icon">🔍</span>
              <span className="nav-text">Find</span>
            </Link>
            <div className="nav-link mobile-only" onClick={handlePatientLogout} style={{cursor: 'pointer'}}>
              <span className="nav-icon">🚪</span>
              <span className="nav-text">Logout</span>
            </div>
          </>
        ) : (
          <Link to="/patient" className="nav-link">
            <span className="nav-icon">🔍</span>
            <span className="nav-text">Find Doctors</span>
          </Link>
        )}

        {doctorSession && (
          <Link to="/doctor/dashboard" className="nav-link">
            <span className="nav-icon">⚕️</span>
            <span className="nav-text">Doctor</span>
          </Link>
        )}
      </div>

      {/* Desktop Actions */}
      <div className="nav-actions desktop-only">
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
    </>
  );
};

export default Navbar;
