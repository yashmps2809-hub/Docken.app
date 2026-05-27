import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate, useLocation } from 'react-router-dom';

import { Geolocation } from '@capacitor/geolocation';

const DoctorRegistration = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { name: initialName, email: initialEmail } = location.state || { name: '', email: '' };

  const [name, setName] = useState(initialName);
  const [email, setEmail] = useState(initialEmail);
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [specialty, setSpecialty] = useState('General Physician');
  const [clinics, setClinics] = useState([]);
  const [selectedClinic, setSelectedClinic] = useState('');
  const [loading, setLoading] = useState(false);

  const [isLocating, setIsLocating] = useState(false);

  const fetchClinics = (lat, lng) => {
    axios.get(`https://backend-nine-kappa-32.vercel.app/api/clinics/nearby?lat=${lat}&lng=${lng}&radius=5000`)
      .then(res => {
        setClinics(res.data);
        if (res.data.length > 0) setSelectedClinic(res.data[0]._id);
      })
      .catch(err => console.error(err));
  };

  useEffect(() => {
    // Default fallback coordinates
    fetchClinics(23.1815, 79.9864);
  }, []);

  const handleLocateMe = async () => {
    setIsLocating(true);
    try {
      const permissions = await Geolocation.checkPermissions();
      if (permissions.location !== 'granted') {
        const req = await Geolocation.requestPermissions();
        if (req.location !== 'granted') {
          alert('Location permission is required to find nearby clinics.');
          setIsLocating(false);
          return;
        }
      }

      const position = await Geolocation.getCurrentPosition({ enableHighAccuracy: true });
      fetchClinics(position.coords.latitude, position.coords.longitude);
      setIsLocating(false);
    } catch (err) {
      console.error(err);
      alert('Unable to retrieve your location. Please ensure GPS is turned on.');
      setIsLocating(false);
    }
  };

  const handleRegister = async () => {
    if (!name || !email || !selectedClinic || !password) {
      alert("Please fill out all required fields (Name, Email, Password, Clinic).");
      return;
    }
    if (password.length < 6) {
      alert("Password must be at least 6 characters for security.");
      return;
    }
    if (phone && !/^\d{10}$/.test(phone)) {
      alert("Mobile number must be exactly 10 digits.");
      return;
    }

    setLoading(true);
    try {
      const res = await axios.post('https://backend-nine-kappa-32.vercel.app/api/doctors/register', {
        name, email, password, phone, specialty, clinicId: selectedClinic
      });
      // Persist the session
      localStorage.setItem('doctorSession', JSON.stringify(res.data));
      
      alert('Registration Successful! Redirecting to Dashboard...');
      setLoading(false);
      // Pass the new doctor ID to the dashboard
      navigate('/doctor/dashboard', { state: { doctor: res.data } });
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.error || 'Registration failed.');
      setLoading(false);
    }
  };

  return (
    <div className="page active">
      <div className="page-body">
        <div className="auth-container">
          <div className="auth-title">REGISTER</div>
          <div className="auth-sub">Create your Doctor profile</div>
          
          <div className="form-group" style={{marginBottom: '15px'}}>
            <label>FULL NAME (With Title) *</label>
            <input className="form-input" placeholder="Dr. John Doe" value={name} onChange={e => setName(e.target.value)} />
          </div>
          
          <div className="form-group" style={{marginBottom: '15px'}}>
            <label>EMAIL ADDRESS *</label>
            <input className="form-input" placeholder="doctor@clinic.com" value={email} onChange={e => setEmail(e.target.value)} />
          </div>

          <div className="form-group" style={{marginBottom: '15px'}}>
            <label>PASSWORD *</label>
            <input className="form-input" type="password" placeholder="Create a strong password" value={password} onChange={e => setPassword(e.target.value)} />
          </div>
          
          <div className="form-group" style={{marginBottom: '15px'}}>
            <label>MOBILE NUMBER (Optional)</label>
            <input className="form-input" type="tel" placeholder="10-digit number" maxLength="10" value={phone} onChange={e => setPhone(e.target.value)} />
          </div>
          
          <div className="form-group" style={{marginBottom: '15px'}}>
            <label>SPECIALTY</label>
            <input className="form-input" placeholder="e.g. Cardiologist" value={specialty} onChange={e => setSpecialty(e.target.value)} />
          </div>

          <div className="form-group" style={{marginBottom: '20px'}}>
            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
              <label>SELECT CLINIC *</label>
              <button 
                className="btn-text" 
                onClick={handleLocateMe} 
                disabled={isLocating}
                style={{fontSize: '0.8rem', color: '#00A556', background: 'none', border: 'none', cursor: 'pointer', padding: 0}}
              >
                {isLocating ? 'Locating...' : '📍 Fetch Nearby'}
              </button>
            </div>
            <select className="form-select" value={selectedClinic} onChange={e => setSelectedClinic(e.target.value)}>
              {clinics.length === 0 ? <option value="">No clinics nearby</option> : null}
              {clinics.map(c => (
                <option key={c._id} value={c._id}>{c.name}</option>
              ))}
            </select>
          </div>
          
          <button className="btn btn-secondary" style={{width: '100%', padding: '14px'}} onClick={handleRegister}>
            {loading ? 'Registering...' : 'Register & Start Queue →'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default DoctorRegistration;
