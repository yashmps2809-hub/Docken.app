import React from 'react';
import { useNavigate } from 'react-router-dom';

const Home = () => {
  const navigate = useNavigate();

  return (
    <div className="page active" id="home-page">
      <div className="hero">
        <div className="hero-tag">🏥 Android App · Live Queue Tracking</div>
        <h1>DOCTOR &amp;<br/>PATIENT —<br/><span className="accent">CONNECTED.</span><br/>IN REAL TIME.</h1>
        <p className="hero-sub">One app. Live queue tracking · Smart signals · Multi-clinic booking · Zero chaos.</p>
        <div className="hero-pills">
          <span className="pill">Live Queue</span>
          <span className="pill">2-Way Signals</span>
          <span className="pill">∞ Clinics / Doctor</span>
          <span className="pill">Zero Chaos</span>
        </div>
        <div className="hero-cta">
          <button className="btn btn-primary" onClick={() => navigate('/login/patient')}>I'm a Patient →</button>
          <button className="btn btn-secondary" onClick={() => navigate('/login/doctor')}>I'm a Doctor →</button>
        </div>
      </div>

      {/* Restored Features Grid */}
      <div className="section">
        <div className="section-label">// FEATURES</div>
        <div className="section-title">EVERYTHING YOU NEED</div>
        <div className="feature-cols">
          <div className="feature-col">
            <div className="col-header">
              <div className="col-dot"></div>
              PATIENT
            </div>
            <div className="feature-item" onClick={() => navigate('/patient')}>
              <div className="feat-icon">🔍</div>
              <div><div className="feat-title">Find Doctor</div><div className="feat-desc">Search by name, specialty or area</div></div>
            </div>
            <div className="feature-item" onClick={() => navigate('/patient')}>
              <div className="feat-icon">🏥</div>
              <div><div className="feat-title">Pick a Clinic</div><div className="feat-desc">Choose from doctor's multiple clinics</div></div>
            </div>
            <div className="feature-item">
              <div className="feat-icon">📅</div>
              <div><div className="feat-title">Book Appointment</div><div className="feat-desc">Reserve a date &amp; time slot in advance</div></div>
            </div>
            <div className="feature-item">
              <div className="feat-icon">🎟</div>
              <div><div className="feat-title">Join Live Queue</div><div className="feat-desc">Get a token — walk in anytime</div></div>
            </div>
            <div className="feature-item">
              <div className="feat-icon">👁</div>
              <div><div className="feat-title">See the Line</div><div className="feat-desc">Watch live position &amp; wait time</div></div>
            </div>
            <div className="feature-item">
              <div className="feat-icon">📡</div>
              <div><div className="feat-title">Signal Doctor</div><div className="feat-desc">"I'm on my way — please wait"</div></div>
            </div>
            <div className="feature-item">
              <div className="feat-icon">🔔</div>
              <div><div className="feat-title">Smart Alerts</div><div className="feat-desc">Notified when your turn is near</div></div>
            </div>
            <div className="feature-item">
              <div className="feat-icon">⭐</div>
              <div><div className="feat-title">Rate Your Visit</div><div className="feat-desc">Review doctor after consultation</div></div>
            </div>
          </div>

          <div className="feature-col">
            <div className="col-header">
              <div className="col-dot" style={{background: 'var(--accent2)'}}></div>
              DOCTOR
            </div>
            <div className="feature-item" onClick={() => navigate('/doctor/dashboard')}>
              <div className="feat-icon">➕</div>
              <div><div className="feat-title">Add Clinics</div><div className="feat-desc">Register one or multiple clinics</div></div>
            </div>
            <div className="feature-item" onClick={() => navigate('/doctor/dashboard')}>
              <div className="feat-icon">📆</div>
              <div><div className="feat-title">Set Schedule</div><div className="feat-desc">Define days &amp; hours per clinic</div></div>
            </div>
            <div className="feature-item" onClick={() => navigate('/doctor/dashboard')}>
              <div className="feat-icon">🟢</div>
              <div><div className="feat-title">Go Live</div><div className="feat-desc">Open queue — patients can join</div></div>
            </div>
            <div className="feature-item" onClick={() => navigate('/doctor/dashboard')}>
              <div className="feat-icon">📋</div>
              <div><div className="feat-title">See Live Queue</div><div className="feat-desc">All waiting patients at a glance</div></div>
            </div>
            <div className="feature-item" onClick={() => navigate('/doctor/dashboard')}>
              <div className="feat-icon">📍</div>
              <div><div className="feat-title">Patient ETA</div><div className="feat-desc">Know who is near, who is far — live</div></div>
            </div>
            <div className="feature-item" onClick={() => navigate('/doctor/dashboard')}>
              <div className="feat-icon">⏭</div>
              <div><div className="feat-title">Accept / Skip</div><div className="feat-desc">Wait for patient or call next</div></div>
            </div>
            <div className="feature-item" onClick={() => navigate('/doctor/dashboard')}>
              <div className="feat-icon">⏸</div>
              <div><div className="feat-title">Take a Break</div><div className="feat-desc">Pause — all patients auto notified</div></div>
            </div>
            <div className="feature-item">
              <div className="feat-icon">📊</div>
              <div><div className="feat-title">View Stats</div><div className="feat-desc">Daily patients, avg time, reviews</div></div>
            </div>
          </div>
        </div>
      </div>

      <div className="flow-section">
        <div className="flow-inner">
          <div className="section-label">// HOW IT WORKS</div>
          <div className="flow-steps">
            <div className="flow-step" onClick={() => navigate('/patient')}><div className="flow-dot"></div>Find Doctor</div>
            <div className="flow-arrow">›</div>
            <div className="flow-step" onClick={() => navigate('/patient')}><div className="flow-dot"></div>Pick Clinic</div>
            <div className="flow-arrow">›</div>
            <div className="flow-step"><div className="flow-dot"></div>Join Queue</div>
            <div className="flow-arrow">›</div>
            <div className="flow-step"><div className="flow-dot"></div>Track Live</div>
            <div className="flow-arrow">›</div>
            <div className="flow-step"><div className="flow-dot"></div>Signal</div>
            <div className="flow-arrow">›</div>
            <div className="flow-step"><div className="flow-dot"></div>Walk In</div>
            <div className="flow-arrow">›</div>
            <div className="flow-step"><div className="flow-dot"></div>See Doctor</div>
          </div>
        </div>
      </div>

      <div style={{textAlign: 'center', padding: '30px', borderTop: '1px solid var(--border)', color: 'var(--muted)', fontSize: '0.78rem', fontFamily: "'JetBrains Mono', monospace", letterSpacing: '0.08em'}}>
        DOCKEN · Doctor &amp; Patient — Connected. Live. · Android
      </div>
    </div>
  );
};

export default Home;
