import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const ReceptionistDashboard = () => {
  const navigate = useNavigate();
  const [receptionist, setReceptionist] = useState(null);
  const [doctors, setDoctors] = useState([]);
  const [walkInForm, setWalkInForm] = useState({ name: '', phone: '', doctorName: '' });

  useEffect(() => {
    const session = localStorage.getItem('receptionistSession');
    if (!session) {
      navigate('/login/receptionist');
      return;
    }
    const rec = JSON.parse(session);
    setReceptionist(rec);

    // Fetch doctors for this clinic
    const fetchDoctors = async () => {
      try {
        const res = await axios.get(`https://backend-nine-kappa-32.vercel.app/api/doctors/clinic/${rec.clinicId._id}`);
        setDoctors(res.data);
      } catch (err) {
        console.error(err);
      }
    };
    fetchDoctors();
  }, [navigate]);

  const handleAddWalkIn = async (e) => {
    e.preventDefault();
    if (!walkInForm.doctorName) return alert('Select a doctor');
    
    try {
      await axios.post('https://backend-nine-kappa-32.vercel.app/api/queue/book', {
        clinicId: receptionist.clinicId._id,
        doctorName: walkInForm.doctorName,
        patientName: walkInForm.name + " (Walk-In)",
        patientPhone: walkInForm.phone
      });
      alert('Walk-in patient added to queue!');
      setWalkInForm({ name: '', phone: '', doctorName: '' });
    } catch (err) {
      alert('Failed to add walk-in');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('receptionistSession');
    navigate('/login/receptionist');
  };

  if (!receptionist) return null;

  return (
    <div className="page active">
      <div className="page-body">
        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px'}}>
          <div>
            <h2 style={{margin: 0, color: 'var(--accent)', fontSize: '2rem'}}>Reception</h2>
            <div style={{color: 'var(--muted)'}}>{receptionist.clinicId.name}</div>
          </div>
          <button className="btn btn-secondary" style={{padding: '8px 16px', fontSize: '0.9rem'}} onClick={handleLogout}>Logout</button>
        </div>

        <div className="section-label" style={{marginBottom: '14px'}}>// ADD MANUAL WALK-IN</div>
        <div className="card" style={{padding: '20px', marginBottom: '30px'}}>
          <form onSubmit={handleAddWalkIn} style={{display: 'flex', gap: '10px', flexWrap: 'wrap'}}>
            <input 
              style={{flex: 1, padding: '10px', border: '1px solid #ccc', borderRadius: '8px'}} 
              placeholder="Patient Name" required
              value={walkInForm.name} onChange={e => setWalkInForm({...walkInForm, name: e.target.value})}
            />
            <input 
              style={{flex: 1, padding: '10px', border: '1px solid #ccc', borderRadius: '8px'}} 
              placeholder="Phone (optional)" 
              value={walkInForm.phone} onChange={e => setWalkInForm({...walkInForm, phone: e.target.value})}
            />
            <select 
              style={{flex: 1, padding: '10px', border: '1px solid #ccc', borderRadius: '8px'}} required
              value={walkInForm.doctorName} onChange={e => setWalkInForm({...walkInForm, doctorName: e.target.value})}
            >
              <option value="">Select Doctor...</option>
              {doctors.map(d => (
                <option key={d._id} value={d.name}>{d.name} {d.isLive ? '(Live)' : ''}</option>
              ))}
            </select>
            <button className="btn btn-primary" type="submit">Add to Queue</button>
          </form>
        </div>

        <div className="section-label" style={{marginBottom: '14px'}}>// CLINIC DOCTORS</div>
        <div style={{display: 'grid', gap: '15px'}}>
          {doctors.map(doc => (
            <div key={doc._id} className="card" style={{padding: '15px', display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
              <div>
                <h3 style={{margin: '0 0 5px 0'}}>{doc.name}</h3>
                <div style={{fontSize: '0.8rem', color: 'gray'}}>{doc.specialty}</div>
              </div>
              <div className="live-badge" style={{background: doc.isLive ? '#dcfce7' : '#f3f4f6', color: doc.isLive ? '#166534' : '#6b7280'}}>
                {doc.isLive && <div className="live-dot"></div>}
                {doc.isLive ? 'LIVE' : 'OFFLINE'}
              </div>
            </div>
          ))}
          {doctors.length === 0 && <p style={{color: 'gray'}}>No doctors registered at this clinic yet.</p>}
        </div>
      </div>
    </div>
  );
};

export default ReceptionistDashboard;
