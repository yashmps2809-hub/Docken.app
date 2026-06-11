import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { signInWithPopup, signInWithRedirect, getRedirectResult } from 'firebase/auth';
import { auth, googleProvider } from '../firebase';
import { Capacitor } from '@capacitor/core';
import axios from 'axios';

const DoctorLogin = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  const [phone, setPhone] = useState('');
  const [showOTP, setShowOTP] = useState(false);
  const [otp, setOtp] = useState('');

  useEffect(() => {
    const saved = localStorage.getItem('doctorSession');
    if (saved) {
      navigate('/doctor/dashboard');
    }
  }, [navigate]);

  useEffect(() => {
    // Check if redirect result is present (for Google Sign-in redirect flow on mobile/native WebView)
    const checkRedirect = async () => {
      try {
        const result = await getRedirectResult(auth);
        if (result && result.user) {
          const user = result.user;
          try {
            const res = await axios.get(`https://backend-nine-kappa-32.vercel.app/api/doctors/email/${user.email}`);
            localStorage.setItem('doctorSession', JSON.stringify(res.data));
            navigate('/doctor/dashboard', { state: { doctor: res.data } });
          } catch (err) {
            if (err.response && err.response.status === 404) {
              navigate('/doctor/register', { state: { name: user.displayName, email: user.email } });
            } else {
              const errMsg = err.response ? 'Server error while checking doctor profile.' : 'Network error. Please check your internet connection.';
              alert(errMsg);
            }
          }
        }
      } catch (error) {
        console.error('Redirect login error:', error);
      }
    };
    checkRedirect();
  }, [navigate]);

  const handlePasswordLogin = async () => {
    if (!email || !password) {
      alert("Please enter email and password");
      return;
    }
    try {
      const res = await axios.post('https://backend-nine-kappa-32.vercel.app/api/doctors/login', { email, password });
      localStorage.setItem('doctorSession', JSON.stringify(res.data));
      navigate('/doctor/dashboard', { state: { doctor: res.data } });
    } catch (err) {
      const errMsg = err.response ? (err.response.data?.error || 'Login failed') : 'Network error. Please check your internet connection.';
      alert(errMsg);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      if (Capacitor.isNativePlatform()) {
        await signInWithRedirect(auth, googleProvider);
      } else {
        const result = await signInWithPopup(auth, googleProvider);
        const user = result.user;
        
        try {
          const res = await axios.get(`https://backend-nine-kappa-32.vercel.app/api/doctors/email/${user.email}`);
          localStorage.setItem('doctorSession', JSON.stringify(res.data));
          navigate('/doctor/dashboard', { state: { doctor: res.data } });
        } catch (err) {
          if (err.response && err.response.status === 404) {
            navigate('/doctor/register', { state: { name: user.displayName, email: user.email } });
          } else {
            const errMsg = err.response ? 'Server error while checking doctor profile.' : 'Network error. Please check your internet connection.';
            alert(errMsg);
          }
        }
      }
    } catch (error) {
      console.error(error);
      alert('Google Sign-In Failed: ' + (error.message || error) + '\n\nNote: If Google Sign-In is blocked by the WebView container, please sign in with Email & Password or OTP.');
    }
  };

  const handleSendOTP = async () => {
    if (phone.length < 10) {
      alert("Please enter a valid 10-digit number");
      return;
    }
    try {
      const res = await axios.post('https://backend-nine-kappa-32.vercel.app/api/auth/send-otp', { phone });
      setShowOTP(true);
      if (res.data.otp) {
        // Fallback for simulated OTP
        alert(`[SIMULATED SMS]\nYour DOCKEN OTP is: ${res.data.otp}`);
      } else {
        alert(res.data.message || 'OTP sent successfully.');
      }
    } catch (err) {
      const errMsg = err.response?.data?.error || 'Failed to send OTP. Please try again.';
      alert(errMsg);
    }
  };

  const handleVerifyOTP = async () => {
    try {
      const res = await axios.post('https://backend-nine-kappa-32.vercel.app/api/auth/verify-otp', { phone, otp });
      if (res.data.success) {
        try {
          const resDoc = await axios.get(`https://backend-nine-kappa-32.vercel.app/api/doctors/email/${phone}@docken.app`);
          localStorage.setItem('doctorSession', JSON.stringify(resDoc.data));
          navigate('/doctor/dashboard', { state: { doctor: resDoc.data } });
        } catch (err) {
          if (err.response && err.response.status === 404) {
            navigate('/doctor/register', { state: { name: '', email: `${phone}@docken.app` } });
          } else {
            const errMsg = err.response ? 'Server error' : 'Network error. Please check your internet connection.';
            alert(errMsg);
          }
        }
      }
    } catch (err) {
      const errMsg = err.response?.data?.error || 'Invalid OTP. Please try again.';
      alert(errMsg);
    }
  };

  return (
    <div className="page active">
      <div className="page-body">
        <div className="auth-container">
          <div className="auth-title">DOCTOR PORTAL</div>
          <div className="auth-sub">Sign in with your Email & Password</div>
          
          <div className="form-group" style={{marginBottom: '15px'}}>
            <label>EMAIL ADDRESS</label>
            <input 
              className="form-input" 
              type="email" 
              placeholder="doctor@clinic.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          
          <div className="form-group" style={{marginBottom: '20px'}}>
            <label>PASSWORD</label>
            <input 
              className="form-input" 
              type="password" 
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          
          <button className="btn btn-primary" style={{width: '100%', padding: '14px', marginBottom: '20px'}} onClick={handlePasswordLogin}>
            Sign In →
          </button>

          <div style={{textAlign: 'center', margin: '20px 0', color: '#9ca3af', fontSize: '0.8rem'}}>OR SIGN IN WITH</div>

          {!showOTP ? (
            <>
              <button className="btn btn-ghost" style={{width: '100%', padding: '12px', marginBottom: '15px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '10px'}} onClick={handleGoogleLogin}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                Google
              </button>

              <div className="form-group" style={{marginBottom: '10px'}}>
                <div style={{display: 'flex', gap: '10px'}}>
                  <input className="form-input" style={{width: '60px', textAlign: 'center', padding: '12px'}} value="+91" disabled />
                  <input 
                    className="form-input" 
                    type="tel" 
                    placeholder="Mobile Number" 
                    maxLength="10"
                    style={{padding: '12px'}}
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                </div>
              </div>
              <button className="btn btn-secondary" style={{width: '100%', padding: '12px'}} onClick={handleSendOTP}>
                Send OTP
              </button>
            </>
          ) : (
            <>
              <div className="form-group" style={{marginBottom: '15px'}}>
                <input 
                  className="form-input" 
                  type="text" 
                  placeholder="6-digit code" 
                  maxLength="6"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  style={{textAlign: 'center', letterSpacing: '8px', fontSize: '1.2rem', padding: '12px'}}
                />
              </div>
              <button className="btn btn-secondary" style={{width: '100%', padding: '12px'}} onClick={handleVerifyOTP}>
                Verify OTP
              </button>
              <div style={{textAlign: 'center', marginTop: '15px'}}>
                <span style={{color: '#3b82f6', cursor: 'pointer', fontSize: '0.8rem'}} onClick={() => setShowOTP(false)}>Cancel OTP</span>
              </div>
            </>
          )}
          
          <div style={{textAlign: 'center', marginTop: '30px', fontSize: '0.9rem', color: 'var(--text)'}}>
            Don't have an account? <span style={{color: 'var(--accent)', fontWeight: 'bold', cursor: 'pointer'}} onClick={() => navigate('/doctor/register')}>Register Here</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DoctorLogin;
