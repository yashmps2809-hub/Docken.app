import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const ReceptionistLogin = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await axios.post('https://backend-nine-kappa-32.vercel.app/api/receptionists/login', { email, password });
      localStorage.setItem('receptionistSession', JSON.stringify(res.data));
      navigate('/receptionist/dashboard');
    } catch (err) {
      alert(err.response?.data?.error || "Login Failed");
      setLoading(false);
    }
  };

  return (
    <div className="page active" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="card" style={{ width: '100%', maxWidth: '400px', padding: '30px' }}>
        <h2 style={{ textAlign: 'center', color: 'var(--accent)', marginBottom: '10px' }}>Clinic Receptionist</h2>
        <p style={{ textAlign: 'center', color: 'var(--muted)', marginBottom: '30px' }}>Manage all clinic queues</p>
        
        <form onSubmit={handleLogin}>
          <div className="input-group">
            <label>Email Address</label>
            <input 
              type="email" 
              required 
              value={email} 
              onChange={e => setEmail(e.target.value)} 
              placeholder="e.g. frontdesk@apollo.com" 
            />
          </div>
          
          <div className="input-group" style={{ marginBottom: '30px' }}>
            <label>Password</label>
            <input 
              type="password" 
              required 
              minLength={6}
              value={password} 
              onChange={e => setPassword(e.target.value)} 
              placeholder="••••••••" 
            />
          </div>
          
          <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={loading}>
            {loading ? 'Authenticating...' : 'Login to Dashboard'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ReceptionistLogin;
