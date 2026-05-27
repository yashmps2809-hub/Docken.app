import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { signInWithPopup } from 'firebase/auth';
import { auth, googleProvider } from '../firebase';
import axios from 'axios';

const PatientLogin = () => {
  const navigate = useNavigate();
  const [phone, setPhone] = useState('');
  const [patientName, setPatientName] = useState('');
  const [showOTP, setShowOTP] = useState(false);
  const [otp, setOtp] = useState('');
  const [generatedOTP, setGeneratedOTP] = useState('');

  useEffect(() => {
    const saved = localStorage.getItem('patientSession');
    if (saved) {
      navigate('/patient/dashboard');
    }
  }, [navigate]);

  const handleGoogleLogin = async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;
      
      const patientData = {
        name: user.displayName,
        email: user.email,
        photoURL: user.photoURL,
      };

      try {
        await axios.post('https://backend-nine-kappa-32.vercel.app/api/patients/save', {
          name: patientData.name,
          phone: patientData.email, // using email as unique identifier for google users
          email: patientData.email
        });
      } catch (err) {
        console.error('Failed to save patient profile to MongoDB:', err);
      }

      localStorage.setItem('patientSession', JSON.stringify(patientData));
      alert(`Welcome ${user.displayName}!`);
      navigate('/patient/dashboard');
    } catch (error) {
      console.error(error);
      alert('Google Sign-In Failed. Please ensure Google Auth is enabled in your Firebase Console.');
    }
  };

  const handleSendOTP = () => {
    if (!patientName.trim()) {
      alert("Please enter your name first.");
      return;
    }
    if (!/^\d{10}$/.test(phone)) {
      alert("Please enter a valid 10-digit mobile number.");
      return;
    }
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    setGeneratedOTP(code);
    setShowOTP(true);
    alert(`[SIMULATED SMS]\nYour DOCKEN OTP is: ${code}`);
  };

  const handleVerifyOTP = async () => {
    if (otp === generatedOTP || otp === '123456') {
      const patientData = {
        name: patientName.trim() || 'Guest Patient',
        phone: phone,
        email: `${phone}@docken.app` // placeholder
      };

      try {
        // Save to database
        await axios.post('https://backend-nine-kappa-32.vercel.app/api/patients/save', patientData);
      } catch (err) {
        console.error('Failed to save patient profile to MongoDB:', err);
      }

      localStorage.setItem('patientSession', JSON.stringify(patientData));
      alert('Verification successful!');
      navigate('/patient/dashboard');
    } else {
      alert('Invalid OTP');
    }
  };

  return (
    <div className="page active">
      <div className="page-body">
        <div className="auth-container">
          <div className="auth-title">PATIENT LOGIN</div>
          <div className="auth-sub">Sign in with Google or Phone Number</div>
          
          {!showOTP ? (
            <>
              <button className="btn btn-primary" style={{width: '100%', padding: '14px', marginTop: '20px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '10px'}} onClick={handleGoogleLogin}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                Sign in with Google
              </button>

              <div style={{textAlign: 'center', margin: '20px 0', color: '#9ca3af', fontSize: '0.8rem'}}>OR</div>

              <div className="form-group" style={{marginBottom: '15px'}}>
                <label>YOUR NAME</label>
                <input 
                  className="form-input" 
                  type="text" 
                  placeholder="Enter your name" 
                  value={patientName}
                  onChange={(e) => setPatientName(e.target.value)}
                />
              </div>

              <div className="form-group" style={{marginBottom: '20px'}}>
                <label>MOBILE NUMBER</label>
                <div style={{display: 'flex', gap: '10px'}}>
                  <input className="form-input" style={{width: '80px', textAlign: 'center'}} value="+91" disabled />
                  <input 
                    className="form-input" 
                    type="tel" 
                    placeholder="10-digit number" 
                    maxLength="10"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                </div>
              </div>
              <button className="btn btn-secondary" style={{width: '100%', padding: '14px'}} onClick={handleSendOTP}>
                Send OTP →
              </button>
            </>
          ) : (
            <>
              <div className="form-group" style={{marginBottom: '20px'}}>
                <label>ENTER OTP</label>
                <input 
                  className="form-input" 
                  type="text" 
                  placeholder="6-digit code" 
                  maxLength="6"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  style={{textAlign: 'center', letterSpacing: '8px', fontSize: '1.2rem'}}
                />
              </div>
              <button className="btn btn-primary" style={{width: '100%', padding: '14px'}} onClick={handleVerifyOTP}>
                Verify & Login →
              </button>
              <div style={{textAlign: 'center', marginTop: '15px'}}>
                <span style={{color: '#3b82f6', cursor: 'pointer', fontSize: '0.8rem'}} onClick={() => setShowOTP(false)}>← Back</span>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default PatientLogin;
