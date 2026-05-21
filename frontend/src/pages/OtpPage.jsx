import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

const OtpPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { role, phone } = location.state || { role: 'patient', phone: 'XXXXX XXXXX' };
  const [otp, setOtp] = useState('');

  // Simulate receiving an OTP
  useEffect(() => {
    alert(`Simulation: Your OTP is 123456`);
  }, []);

  const handleVerify = async () => {
    if (otp === '123456') {
      if (role === 'patient') {
        navigate('/patient');
      } else {
        try {
          const axios = require('axios').default; // dynamic import for ease
          const res = await axios.get(`http://localhost:5000/api/doctors/phone/${phone}`);
          // Persist the session
          localStorage.setItem('doctorSession', JSON.stringify(res.data));
          navigate('/doctor/dashboard', { state: { doctor: res.data } });
        } catch (err) {
          alert('Doctor profile not found! Please register first.');
          navigate('/doctor/register');
        }
      }
    } else {
      alert("Invalid OTP! (Use 123456)");
    }
  };

  return (
    <div className="page active">
      <nav className="inner-nav">
        <button className="back-btn" onClick={() => navigate(-1)}>← Back</button>
        <div className="inner-title">VERIFICATION</div>
      </nav>
      <div className="page-body">
        <div className="auth-container">
          <div className="auth-title">ENTER OTP</div>
          <div className="auth-sub">Sent to +91 {phone}</div>
          
          <div className="form-group" style={{marginBottom: '20px', marginTop: '20px'}}>
            <label>6-DIGIT OTP</label>
            <input 
              className="form-input" 
              type="number" 
              placeholder="• • • • • •" 
              style={{letterSpacing: '10px', fontSize: '1.2rem', textAlign: 'center'}}
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
            />
          </div>
          
          <button className="btn btn-primary" style={{width: '100%', padding: '14px'}} onClick={handleVerify}>
            Verify &amp; Continue →
          </button>
        </div>
      </div>
    </div>
  );
};

export default OtpPage;
